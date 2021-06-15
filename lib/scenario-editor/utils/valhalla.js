// @flow

import fetch from 'isomorphic-fetch'
import {decode as decodePolyline} from 'polyline'
import {isEqual as coordinatesAreEqual} from '@conveyal/lonlat'
import qs from 'qs'
import lineString from 'turf-linestring'

// This can be used for logging line strings to geojson.io URLs for easy
// debugging.
// import {logCoordsToGeojsonio} from '../../editor/util/debug'

import type {
  Coordinates,
  LatLng
} from '../../types'

type Instruction = {
  distance: number,
  heading: number,
  interval: [number, number],
  sign: number,
  street_name: string,
  text: string,
  time: number
}

type Path = {
  ascend: number,
  bbox: [number, number, number, number],
  descend: number,
  details: {},
  distance: number,
  instructions: Array<Instruction>,
  legs: [],
  points: string,
  points_encoded: boolean,
  snapped_waypoints: string,
  time: number,
  transfers: number,
  weight: number
}

type GraphHopperResponse = {
  hints: {
    'visited_nodes.average': string,
    'visited_nodes.sum': string
  },
  info: {
    copyrights: Array<string>,
    took: number
  },
  paths: Array<Path>
}

/**
 * Convert GraphHopper routing JSON response to polyline.
 */
function handleGraphHopperRouting (path: Path, individualLegs: boolean = false): any {
  const {instructions, points} = path
  // Decode polyline and reverse coordinates.
  const decodedPolyline = decodePolyline(points).map(c => ([c[1], c[0]]))
  if (individualLegs) {
    const segments = []
    // Keep track of the segment point intervals to split the line segment at.
    // This appears to be the most reliable way to split up the geometry
    // (previously distance was used here, but that provided inconstent results).
    const segmentPointIndices = [0]
    // Iterate over the instructions, accumulating segment point indices at each
    // waypoint encountered. Indices are used to slice the line geometry when
    // individual legs are needed. NOTE: Waypoint === routing point provided in
    // the request.
    instructions.forEach((instruction, i) => {
      if (instruction.text.match(/Waypoint (\d+)/) || i === instructions.length - 1) {
        segmentPointIndices.push(instruction.interval[0])
      }
    })
    // Once all of the indices have been found, slice the decoded polyline up
    // at the provided indices.
    if (segmentPointIndices.length > 2) {
      for (var i = 1; i < segmentPointIndices.length; i++) {
        // Get the indices of the points that the entire path should be sliced at
        // Note: 'to' index is incremented by one because it is not inclusive.
        const [from, to] = [segmentPointIndices[i - 1], segmentPointIndices[i] + 1]
        const segment = decodedPolyline.slice(from, to)
        segments.push(segment)
      }
      // console.log('individual legs', segments)
      return segments
    } else {
      // FIXME does this work for two input points?
      return [decodedPolyline]
    }
  } else {
    return decodedPolyline
  }
}

/**
 * Route between two or more points using external routing service.
 * @param  {[type]} points         array of two or more LatLng points
 * @param  {[type]} individualLegs whether to return coordinates as set of
 *                                 distinct segments for each pair of points
 * @return {[type]}                Array of coordinates or Array of arrays of coordinates.
 */
export async function polyline (
  points: Array<LatLng>,
  individualLegs?: boolean = false
): Promise<any> {
  let json
  const geometry = []
  try {
    // Chunk points into sets no larger than the max # of points allowed by
    // GraphHopper plan.
    const pointLimit = +process.env.GRAPH_HOPPER_POINT_LIMIT
    // Default to chunks of 30 points if the point limit is less than 2. (There
    // must be at least two points passed in to routing method in order to
    // successfully route.)
    const chunk = pointLimit > 2 ? pointLimit : 30
    let count = 0
    const j = points.length
    for (let i = 0; i < j; i += chunk) {
      // Offset the slice indices so that the next chunk begins with the
      const offset = count * -1
      const beginIndex = i + offset
      const endIndex = i + chunk + offset
      const chunkedPoints = points.slice(beginIndex, endIndex)
      json = await routeWithGraphHopper(chunkedPoints)
      const path = json && json.paths && json.paths[0]
      // Route between chunked list of points
      if (path) {
        const result = handleGraphHopperRouting(path, individualLegs)
        geometry.push(...result)
      } else {
        // If any of the routed legs fails, default to straight line (return null).
        console.warn(`Error routing from point ${beginIndex} to ${endIndex}`, chunkedPoints)
        return null
      }
      count++
    }
    return geometry
  } catch (e) {
    console.log(e)
    return null
  }
}

export async function getSegment (
  points: Coordinates,
  followRoad: boolean,
  defaultToStraightLine: boolean = true
): Promise<?{
  coordinates: Coordinates,
  type: 'LineString'
}> {
  // Store geometry to be returned here.
  let geometry
  if (followRoad) {
    // if snapping to streets, use routing service.
    const coordinates = await polyline(
      points.map(p => ({lng: p[0], lat: p[1]}))
    )
    if (!coordinates) {
      // If routing was unsuccessful, default to straight line (if desired by
      // caller).
      console.warn(`Routing unsuccessful. Returning ${defaultToStraightLine ? 'straight line' : 'null'}.`)
      if (defaultToStraightLine) {
        geometry = lineString(points).geometry
      } else {
        return null
      }
    } else {
      // If routing is successful, clean up shape if necessary
      const c0 = coordinates[0]
      const epsilon = 1e-6
      if (!coordinatesAreEqual(c0, points[0], epsilon)) {
        coordinates.unshift(points[0])
      }
      geometry = {
        type: 'LineString',
        coordinates
      }
    }
  } else {
    // If not snapping to streets, simply generate a line string from input
    // coordinates.
    geometry = lineString(points).geometry
  }
  return geometry
}

/**
 * Call GraphHopper routing service with lat/lng coordinates.
 *
 * Example URL: https://graphhopper.com/api/1/route?point=49.932707,11.588051&point=50.3404,11.64705&vehicle=car&debug=true&&type=json
 */
export function routeWithGraphHopper (points: Array<LatLng>): ?Promise<GraphHopperResponse> {
  var graphhopper_url
  if (points.length < 2) {
    console.warn('need at least two points to route with graphhopper', points)
    return null
  }
  if (!process.env.GRAPH_HOPPER_KEY) {
    throw new Error('GRAPH_HOPPER_KEY not set')
  }
  // Use custom url if it exists, otherwise default to the hosted service.
  const GRAPH_HOPPER_URL = process.env.GRAPH_HOPPER_URL || 'https://graphhopper.com/api/1/'
  const params = {
    key: process.env.GRAPH_HOPPER_KEY,
    vehicle: 'car',
    debug: true,
    type: 'json'
  }
  const locations = points.map(p => (`point=${p.lat},${p.lng}`)).join('&')
  return fetch(
    `${GRAPH_HOPPER_URL}route?${locations}&${qs.stringify(params)}`
  ).then(res => res.json())
}
