// @flow

import ll from '@conveyal/lonlat'
import {divIcon} from 'leaflet'
import clone from 'lodash/cloneDeep'
import fetch from 'isomorphic-fetch'
import distance from '@turf/distance'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import lineDistance from 'turf-line-distance'
import lineSlice from 'turf-line-slice'
import lineString from 'turf-linestring'
import point from 'turf-point'
import pointOnLine from 'turf-point-on-line'

import {ENTITY, POINT_TYPE} from '../constants'
import {getSegment} from '../../scenario-editor/utils/valhalla'
import {generateUID} from '../../common/util/util'
import {getConfigProperty} from '../../common/util/config'
import {coordinatesFromShapePoints} from './objects'
import {reverseEsri as reverse} from '../../scenario-editor/utils/reverse'

import type {
  ControlPoint,
  Coordinate,
  Coordinates,
  Feed,
  GeoJsonLinestring,
  GeoJsonPoint,
  GtfsStop,
  LatLng,
  Pattern,
  PatternStop,
  ShapePoint,
  StopTime
} from '../../types'

type R5Response = {
  data: {
    features: Array<GeoJsonLinestring & {properties: {toVertex: number}}>
  },
  vertices: Array<{
    incidentStreets: Array<any>,
    index: number
  }>
}

export const stopIsOutOfBounds = (stop: GtfsStop, bounds: any) => {
  return stop.stop_lat > bounds.getNorth() ||
    stop.stop_lat < bounds.getSouth() ||
    stop.stop_lon > bounds.getEast() ||
    stop.stop_lon < bounds.getWest()
}

export const getStopIcon = (
  title: string,
  style: string,
  fgColor: string = '#000',
  bgColor: string = '#fff'
): HTMLElement =>
  divIcon({
    html: `<span title="${
      title
    }" class="fa-stack bus-stop-icon" style="${style}">
          <i class="fa fa-circle fa-stack-2x" style="color: ${fgColor}"></i>
          <i class="fa fa-bus fa-stack-1x" style="color: ${bgColor}"></i>
        </span>`,
    className: '',
    iconSize: [24, 24]
  })

export function clickToLatLng (
  latlng: LatLng
): {stop_lat: number, stop_lon: number} {
  const precision = 100000000 // eight decimal places is accurate up to 1.1 meters
  return {
    stop_lat: Math.round(latlng.lat * precision) / precision,
    stop_lon: Math.round((latlng.lng % 180) * precision) / precision
  }
}

/**
 * Deep clone a control point and set the distance based on an offset.
 * @param {ControlPoint} controlPoint
 * @param {Number} offsetDistance The distance to offset the original control point
 * @param {Number} offsetIndex The number to offset the shape point sequence
 * @return {ControlPoint}
 */
function cloneControlPointWithDistanceOffset (
  controlPoint: ControlPoint,
  offsetDistance?: number,
  offsetIndex: number
): ControlPoint {
  const clonedControlPoint = clone(controlPoint)
  clonedControlPoint.distance = controlPoint.distance + offsetDistance
  clonedControlPoint.shapeDistTraveled =
    controlPoint.shapeDistTraveled + offsetDistance
  clonedControlPoint.shapePtSequence =
    controlPoint.shapePtSequence + offsetIndex
  return clonedControlPoint
}

export function isValidPoint (point: any) {
  return Boolean(point && point.geometry && point.geometry.coordinates)
}

/**
 * Array filter function to filter control points for stop control points with
 * valid locations.
 */
export function isValidStopControlPoint (controlPoint: ControlPoint) {
  const {point, pointType} = controlPoint
  // Filter out control points that are not for stops.
  if (pointType !== POINT_TYPE.STOP) return false
  // And filter out control points that don't contain valid points.
  if (!isValidPoint(point)) return false
  return true
}

export function newControlPoint (
  distance: ?number,
  point: GeoJsonPoint,
  props: {
    id?: string | number,
    pointType: $Values<typeof POINT_TYPE>,
    shapePtLat?: number,
    shapePtLon?: number,
    shapePtSequence?: number
  } = {
    pointType: POINT_TYPE.DEFAULT
  }
): ControlPoint {
  if (!distance && distance !== 0) {
    throw new Error(
      'distance argument must be set when creating a new control point'
    )
  }
  return {
    distance,
    id: generateUID(),
    point,
    // FIXME: Should the ID field above be overwritten by the below props?
    ...props
  }
}

export function isSegmentActive (activeIndex: number, index: number) {
  return activeIndex === 0
    ? index === activeIndex
    : index === activeIndex || index === activeIndex - 1
}

export function constructPoint (latlng: LatLng | Coordinate): GeoJsonPoint {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: ll.toCoordinates(latlng)
    }
  }
}

export async function constructStop (
  latlng: LatLng
): Promise<GtfsStop> {
  const stopLatLng = clickToLatLng(latlng)
  const result = await reverse(latlng)
  const stopId = generateUID()
  let stopName = `New Stop (${stopId})`
  if (result && result.address) {
    stopName = result.address.Address
  }
  return {
    id: ENTITY.NEW_ID,
    stop_id: stopId,
    stop_name: stopName,
    ...stopLatLng
  }
}

/**
 * Ensure returned coordinates are valid.
 * A bug occurred in this function in a case where line-slice-along returned
 * an array with just the latlng values.
 *
 * @param  {Mixed} coords hopefully a valid array of coordinates
 * @return {Coordinate[]} a valid array of coordinates
 */
export function ensureValidCoords (coords: ?any): Array<[number, number]> {
  return coords && Array.isArray(coords) && coords.length > 0
    ? Array.isArray(coords[0]) ? coords : [coords]
    : []
}

function geojsonFromCoordinates (
  coordinates: ?Array<[number, number]>
): ?GeoJsonLinestring {
  return (
    coordinates && {
      type: 'Feature',
      geometry: {
        coordinates: coordinates,
        type: 'LineString'
      }
    }
  )
}

export function getControlPointSnap (
  controlPointGeoJson: GeoJsonPoint,
  coordinates: Coordinates
) {
  const lineString: GeoJsonLinestring = ((geojsonFromCoordinates(
    coordinates
  ): any): GeoJsonLinestring)

  // snap control point to line
  const snapPoint = pointOnLine(lineString, controlPointGeoJson)
  const {beforeSlice, afterSlice} = getLineSlices(lineString, snapPoint)
  const index = beforeSlice.geometry.coordinates.length

  // measure line segment
  const distTraveled = lineDistance(beforeSlice, 'meters')
  return {snapPoint, distTraveled, index, beforeSlice, afterSlice}
}

export function getFeedBounds (
  feedSource: Feed,
  pad: number = 0
): [[number, number], [number, number]] {
  return feedSource &&
    feedSource.latestValidation &&
    feedSource.latestValidation.bounds &&
    !isNaN(feedSource.latestValidation.bounds.north)
    ? [
      [
        feedSource.latestValidation.bounds.north + pad,
        feedSource.latestValidation.bounds.west - pad
      ],
      [
        feedSource.latestValidation.bounds.south - pad,
        feedSource.latestValidation.bounds.east + pad
      ]
    ]
    : [[60, 60], [-60, -20]]
}

export function getPatternEndPoint (pattern: Pattern, controlPoints?: Array<ControlPoint>): LatLng {
  let endPoint
  if (controlPoints && controlPoints.length > 0) {
    const lastControlPoint = controlPoints[controlPoints.length - 1]
    if (lastControlPoint.point) {
      endPoint = ll.toLeaflet(lastControlPoint.point.geometry.coordinates)
      return endPoint
    }
  }
  throw new Error('Control point is missing coordinates')
}

/* eslint-disable complexity */
export async function recalculateShape ({
  controlPoints,
  defaultToStraightLine = true,
  dragId,
  editType,
  followStreets,
  index,
  newPoint,
  patternCoordinates,
  snapControlPointToNewSegment = false
}: {
  controlPoints: Array<ControlPoint>,
  defaultToStraightLine?: boolean,
  dragId?: null | string,
  editType: string,
  followStreets: boolean,
  index: number,
  newPoint?: LatLng,
  patternCoordinates: Array<Coordinates>,
  snapControlPointToNewSegment?: boolean
}): Promise<{
  coordinates: ?Array<any>,
  dragId?: ?string,
  updatedControlPoints: ?Array<ControlPoint>
}> {
  const updatedPatternCoordinates = clone(patternCoordinates)
  const previousControlPoint = controlPoints[index - 1]
  const followingControlPoint = controlPoints[index + 1]
  // Initialize updated control points with copy of control points up until
  // index.
  let updatedControlPoints: Array<ControlPoint> = controlPoints.slice(0, index)
  // Store points to make valhalla routing request.
  const pointsToRoute = []

  // Determine the segments to recalculate based on control point index
  if (editType === 'update') {
    if (index > 0) {
      // Updating something after first control point (i.e., there is a line
      // segment to handle BEFORE current control point)
      // Set previous coords to slice from beginning to previous control point
      pointsToRoute.push(previousControlPoint.point.geometry.coordinates)
    }
    pointsToRoute.push(ll.toCoordinates(newPoint))
    if (index < controlPoints.length - 1) {
      // updating something before last control point (i.e., there is a line
      // segment to handle AFTER current control point)
      pointsToRoute.push(followingControlPoint.point.geometry.coordinates)
    }
    // console.log(`index=${index} routing between control points followStreets=${followStreets}`, lineString(pointsToRoute))
  } else if (editType === 'delete') {
    // Handle removal of control point. There are two cases to handle here:
    //  1. If the control point is on the end, delete the first/last entirely.
    //  2. Otherwise, merge the previous and following segments into a single
    //     segment.
    if (index === 0) {
      // Deleting first control point.
      if (controlPoints.length === 1) {
        // There is only one control point to remove. Delete it and empty the
        // coordinates array.
        return {
          coordinates: [],
          dragId,
          updatedControlPoints: []
        }
      }
      // Slice line at next control point
      // FIXME: fix slice index
      let nextStopIndex = 1
      // delete all other control points until the next-to-last stop
      while (!controlPoints[nextStopIndex].stopId && nextStopIndex < controlPoints.length) {
        nextStopIndex++
      }
      // Distance for following control points will decrease by the control point
      // at the slice location.
      const distanceOffset = -controlPoints[nextStopIndex].distance
      // If deleting first stop, keep all control points past slice index.
      updatedControlPoints = (controlPoints
        .slice(nextStopIndex)
        .map(controlPoint =>
          cloneControlPointWithDistanceOffset(controlPoint, distanceOffset, -1)
        ): Array<ControlPoint>)
      // Delete first segment.
      updatedPatternCoordinates.splice(0, nextStopIndex)
      return {
        coordinates: updatedPatternCoordinates,
        dragId,
        updatedControlPoints
      }
    } else if (index === controlPoints.length - 1) {
      // Deleting last control point (this should only be a stop).
      let nextToLastIndex = controlPoints.length - 2
      if (controlPoints[index].stopId) {
        // if the control point is a stop
        // delete all other control points until the next-to-last stop
        while (!controlPoints[nextToLastIndex].stopId && nextToLastIndex > 0) {
          nextToLastIndex--
        }
      }
      // Delete hanging pattern segments from the end of the list.
      const segmentsToDelete = index - nextToLastIndex
      updatedPatternCoordinates.splice(-segmentsToDelete, segmentsToDelete)
      return {
        coordinates: updatedPatternCoordinates,
        dragId,
        updatedControlPoints: (
          controlPoints.slice(0, nextToLastIndex + 1): Array<ControlPoint>
        )
      }
    } else {
      // If index is not the first or the last, we are deleting an in-between
      // control point or stop. In addition to deleting the control point, we
      // need to merge the previous and following segments into a single segment.
      if (controlPoints[index].stopId) {
        // Deleting a stop. Simply convert the control point to a no-stop anchor
        // to preserve any surrounding paths that may be needed.
        updatedControlPoints = (controlPoints.slice(): Array<ControlPoint>)
        updatedControlPoints[index].stopId = undefined
        updatedControlPoints[index].pointType = POINT_TYPE.ANCHOR
        return {
          coordinates: updatedPatternCoordinates,
          updatedControlPoints
        }
      }
      // Route between previous and following control points.
      pointsToRoute.push(previousControlPoint.point.geometry.coordinates)
      pointsToRoute.push(followingControlPoint.point.geometry.coordinates)
    }
  } else {
    throw new Error('Invalid editType. Must be either "update" or "delete".')
  }
  // calculate new segment (valhalla or straight line)
  const newSegment = await getSegment(
    pointsToRoute,
    followStreets,
    defaultToStraightLine
  )
  if (!newSegment || !newSegment.coordinates) {
    // If new segment calculation is unsuccessful, return null for coordinates and
    // control points. The containing action should check for null values for these
    // return values to indicate failure.
    console.warn(
      `Failed to route between points for control point ${index}`,
      lineString(pointsToRoute)
    )
    return {
      coordinates: null,
      dragId,
      updatedControlPoints: null
    }
  }
  // console.log('routed segment', `http://geojson.io/#data=data:application/json,${encodeURIComponent(JSON.stringify(newSegment))}`)
  let indexOffset
  let updatedControlPoint
  if (editType === 'update') {
    // TODO: Sometimes the starting or ending control point can go off the
    // street network, but it's probably not worth slicing the coordinates like
    // the below commented out code. If there is a reliable way of trimming the
    // GraphHopper response to exclude non-network paths, we should use that.
    // if (index === 0) {
    //   // Remove first coordinate if routing to the first control point (first
    //   // pattern stop) because this is likely off the street grid.
    //   newSegment.coordinates.splice(0, 1)
    // } else if (index === controlPoints.length - 1) {
    //   // Remove last coordinate if routing to the last control point (last
    //   // pattern stop) because this is likely off the street grid.
    //   newSegment.coordinates.splice(-1, 1)
    // }
    // Add control point location to snap to line (if needed)
    const controlPointGeoJson = point(ll.toCoordinates(newPoint))
    const {
      snapPoint,
      distTraveled,
      index: snapIndex,
      beforeSlice,
      afterSlice
    } = getControlPointSnap(
      controlPointGeoJson,
      ensureValidCoords(newSegment.coordinates)
    )
    // Update surrounding pattern coordinate segments regardless of whether snap
    // is set to true
    if (index > 0) {
      // Only update previous segment if index is greater than zero
      updatedPatternCoordinates[index - 1] = beforeSlice.geometry.coordinates
    }
    updatedPatternCoordinates[index] = afterSlice.geometry.coordinates
    if (snapControlPointToNewSegment) {
      // Shape sequence offset for following points equals number of points in
      // new segment less the previous segment length.
      const previousSequence = previousControlPoint
        ? previousControlPoint.shapePtSequence
        : 0
      const previousDistance = previousControlPoint
        ? previousControlPoint.distance
        : 0
      const followingSequence = followingControlPoint
        ? followingControlPoint.shapePtSequence
        : controlPoints[index].shapePtSequence
      indexOffset =
        newSegment.coordinates.length - (followingSequence - previousSequence)
      // Offset snapped control point distance
      // FIXME: Any new control point must contain shape pt sequence
      updatedControlPoint = newControlPoint(
        previousDistance + distTraveled,
        snapPoint,
        {
          stopId: controlPoints[index].stopId,
          pointType: controlPoints[index].pointType,
          shapeDistTraveled: previousDistance + distTraveled,
          shapePtLat: snapPoint.geometry.coordinates[1],
          shapePtLon: snapPoint.geometry.coordinates[0],
          shapePtSequence: snapIndex + previousSequence
        }
      )
    } else {
      // FIXME: update shape pt properties
      // If not snapping to streets, simply assign new point to control point
      updatedControlPoint = Object.assign({}, controlPoints[index])
      updatedControlPoint.point = controlPointGeoJson
    }
    updatedControlPoints.push(updatedControlPoint)
  } else {
    // If deleting control point, simply replace the two surrounding segments
    // with the new segment. NOTE: splice index will be the control point index
    // less one.
    const segmentSpliceIndex = index - 1
    updatedPatternCoordinates.splice(
      segmentSpliceIndex,
      2,
      newSegment.coordinates
    )
  }
  // FIXME: handle if index is first or last
  // FIXME: handle remove

  // update positions of the rest of the control points based on distance offset
  const offset = getOffsetDistance(editType, index, newSegment, controlPoints)
  // console.log('', indexOffset, newSegment.coordinates.length)
  // For each control point after index, add cloned control point with new distance
  controlPoints
    .slice(index + 1)
    .forEach(controlPoint =>
      updatedControlPoints.push(
        cloneControlPointWithDistanceOffset(controlPoint, offset, indexOffset)
      )
    )
  // Return updated control points and updated pattern segments. NOTE: Updated
  // shape points are handled in editor data reducer, where they are assigned to
  // the active trip pattern.
  return {
    updatedControlPoints,
    dragId,
    coordinates: updatedPatternCoordinates
  }
}

export function shapePointsToSimpleCoordinates (
  shapePoints: Array<ShapePoint>
): Array<Coordinate> {
  return shapePoints
    ? shapePoints.map(shapePoint => [
      shapePoint.shapePtLon,
      shapePoint.shapePtLat
    ])
    : []
}

// function findSurroundingStopIndexes (index, controlPoints) {
//   let previousStopIdx = index - 1
//   // Find index of previous control point that references a stop.
//   while (!controlPoints[previousStopIdx].stopId && previousStopIdx > 0) {
//     previousStopIdx--
//   }
//
//   let followingStopIdx = index + 1
//   let nextStopFound = false
//   // Find index of following control point that references a stop.
//   for (; followingStopIdx < controlPoints.length; followingStopIdx++) {
//     if (controlPoints[followingStopIdx].stopId) {
//       nextStopFound = true
//       break
//     }
//   }
//   if (!nextStopFound) followingStopIdx = -1
//   return {previousStopIdx, followingStopIdx}
// }

/**
 * Iterate over pattern stops and assign shapeDistTraveled values from shape
 * points. A cloned pattern stops list is returned.
 */
export function assignDistancesToPatternStops (
  patternStops: Array<PatternStop>,
  shapePoints: Array<ShapePoint>
): Array<PatternStop> {
  const patternStopsClone = clone(patternStops)
  // Filter out only the shape points that are associated with a stop.
  const filteredShapePoints = shapePoints.filter(
    sp => sp.pointType === POINT_TYPE.STOP
  )
  for (var i = 0; i < patternStopsClone.length; i++) {
    const shapeDistTraveled = filteredShapePoints[i]
      ? filteredShapePoints[i].shapeDistTraveled
      : null
    patternStopsClone[i].shapeDistTraveled = shapeDistTraveled
  }
  return patternStopsClone
}

/**
 * Constructs shape points from a pattern's control points and multi-line pattern
 * segments.
 */
export function constructShapePoints (
  controlPoints: Array<ControlPoint>,
  patternSegments: Array<any>
): Array<ShapePoint> {
  const shapePoints: Array<ShapePoint> = []
  // FIXME: make sure number of segments and control points are appropriately
  // configured. For example:
  // there should always be capping control points
  // *-------*-------*------*-----*
  for (var i = 0; i < controlPoints.length; i++) {
    const controlPoint = controlPoints[i]
    const {point, pointType} = controlPoint
    const lastDistance = shapePoints.length > 0
      ? shapePoints[shapePoints.length - 1].shapeDistTraveled
      : 0
    // Add control point to shape points.
    shapePoints.push({
      // NOTE: The shape ID and shape point ID values are missing, but will be
      // assigned by the back end. Also, complete resequencing is handled below.
      shapePtSequence: i,
      shapePtLat: point.geometry.coordinates[1],
      shapePtLon: point.geometry.coordinates[0],
      shapeDistTraveled: lastDistance,
      pointType
    })
    const segment = patternSegments[i]
    if (segment) {
      // Add segment to list of shape points (last iteration should have no segment
      // because the geometry should be capped with an extra control point).
      const shapePointsFromSegment = coordinatesToShapePoints(
        segment,
        lastDistance,
        shapePoints.length
      )
      // FIXME: this may not work for large arrays (100,000 or more)
      shapePoints.push(...shapePointsFromSegment)
    }
  }
  // Clean up shape points (duplicate removal and resequencing).
  const cleanShapePoints = shapePoints
    // Filter out any duplicate shape points (as a result of merging control
    // points with pattern segments).
    .filter((p, index) => {
      // Keep any shape point that is a control points (stop or simple handle).
      if (p.pointType > 0) return true
      const prev = shapePoints[index - 1]
      const next = shapePoints[index + 1]
      // Trash any standard shape points that are duplicates.
      if (prev && p.shapeDistTraveled === prev.shapeDistTraveled) return false
      if (next && p.shapeDistTraveled === next.shapeDistTraveled) return false
      // Keep the rest of the non-control point shape points.
      return true
    })
    .map(resequenceShapePoints)
  return cleanShapePoints
}

/**
 * Map function that resets shape point sequence values for pattern shape points.
 */
export function resequenceShapePoints (shapePoint: ShapePoint, index: number): ShapePoint {
  shapePoint.shapePtSequence = index
  return shapePoint
}

/**
 * Map function that resets stop sequence values for pattern stops.
 * This returns either a PatternStop or StopTime type, but it is surprisingly
 * hard to specify a return type in flow, so the any type is used.  :(
 */
export function resequenceStops (
  stop: PatternStop | StopTime,
  index: number
): any {
  return {
    ...stop,
    stopSequence: index
  }
}

function coordinatesToShapePoints (
  coordinates,
  initialDistance = 0,
  initialSequence = 0
): Array<ShapePoint> {
  let previousPoint
  let cumulativeDistance = initialDistance
  return coordinates.map((coordinate, index) => {
    const currPoint = point(coordinate)
    const distanceFromPrevious = previousPoint
      ? distance(previousPoint, currPoint, {units: 'meters'})
      : 0
    previousPoint = currPoint
    cumulativeDistance += distanceFromPrevious
    return {
      shapePtLat: coordinate[1],
      shapePtLon: coordinate[0],
      shapePtSequence: initialSequence + index + 1, // ensure sequence is offset from initial
      shapeDistTraveled: cumulativeDistance,
      pointType: 0
    }
  })
}

export function getLineSlices (
  lineSegment: GeoJsonLinestring,
  pointOnLine: GeoJsonPoint
) {
  const coords = lineSegment.geometry.coordinates
  const beginPoint = point(coords[0])
  const endPoint = point(coords[coords.length - 1])
  const beforeSlice = lineSlice(beginPoint, pointOnLine, lineSegment)
  const afterSlice = lineSlice(pointOnLine, endPoint, lineSegment)
  return {afterSlice, beforeSlice}
}

function getOffsetDistance (
  editType: string,
  index: number,
  newSegment: {
    coordinates: Coordinates,
    type: 'LineString'
  },
  controlPoints: Array<ControlPoint>
) {
  let offsetDistance
  const previousControlPoint = controlPoints[index - 1]
  const followingControlPoint = controlPoints[index + 1]
  // Use distance of new segment to calculate offset
  const segmentDistance = lineDistance(
    geojsonFromCoordinates(ensureValidCoords(newSegment.coordinates)),
    'meters'
  )
  if (editType === 'update' && index === 0) {
    offsetDistance = segmentDistance - followingControlPoint.distance
  } else if (editType === 'update' && index === controlPoints.length - 1) {
    // do nothing to avoid undefined error on followingControlPoint
    // following array slice method will not error because array is empty
  } else {
    offsetDistance =
      segmentDistance -
      (followingControlPoint.distance - previousControlPoint.distance)
  }
  return offsetDistance
}

export function controlPointToShapePoint (controlPoint: any) {
  return {
    shapePtLat: controlPoint.point.geometry.coordinates[1],
    shapePtLon: controlPoint.point.geometry.coordinates[0],
    pointType: controlPoint.stopId ? 1 : 2,
    // FIXME: distance column not populated automatically in backend.
    shapeDistTraveled: controlPoint.distance,
    // Assign sequence value if available
    shapePtSequence: controlPoint.shapePtSequence
  }
}

export async function route (from: LatLng, to: LatLng): Promise<any> {
  const r5url: ?string = getConfigProperty('application.r5')
  if (!r5url) {
    throw new Error('r5 url not set')
  }
  const url = `${r5url}/plan?fromLat=${from.lat}&fromLon=${from.lng}&toLat=${to.lat}&toLon=${to.lng}&mode=CAR&full=false`
  const response = await fetch(url)
  const json = await response.json()
  return json
}

/**
 * Creates an empty pattern stop object for a given stop. Default stop sequence
 * value is 0.
 */
export function stopToPatternStop (
  stop: GtfsStop,
  stopSequence: number = 0
): PatternStop {
  if (!stop.stop_id) {
    throw new Error('Stop Id not set')
  }
  return {
    id: generateUID(),
    stopSequence,
    stopId: stop.stop_id,
    continuousDropOff: 1,
    continuousPickup: 1,
    defaultDwellTime: 0,
    defaultTravelTime: 0,
    dropOffType: 0,
    pickupType: 0,
    shapeDistTraveled: null,
    timepoint: null
  }
}

export async function street (from: LatLng, to: LatLng): Promise<?R5Response> {
  let json
  try {
    json = await route(from, to)
  } catch (e) {
    return null
  }
  if (json.errors) {
    console.log('error getting r5 data', json)
    return null
  } else {
    return json
  }
}

/**
 * Generate straight line inter-stop distances (in meters) from control points.
 * @param  {[type]} controlPoints [description]
 * @return {[type]}               [description]
 */
export function straightLineDistancesBetweenStopAnchors (
  controlPoints: Array<ControlPoint>
): Array<number> {
  // Ensure that only stop control points are considered.
  const stopControlPoints = controlPoints.filter(cp => cp.pointType === POINT_TYPE.STOP)
  const interStopDistances = []
  for (var i = 1; i < stopControlPoints.length; i++) {
    const dist = distance(controlPoints[i].point, controlPoints[i - 1].point, {units: 'meters'})
    interStopDistances.push(dist)
  }
  return interStopDistances
}

export function generateControlPointsFromPatternStops (
  patternStops: Array<PatternStop>,
  stops: Array<any> // TODO: use more exact type
): any { // FIXME: fix flow return type
  const controlPoints = []
  const patternSegments = []
  // Generate straight line distances for pattern segments with control
  // point at each endpoint.
  let previousStopPoint
  let cumulativeDistance = 0
  for (let i = 0; i < patternStops.length; i++) {
    const stop = stops.find(st => st.stop_id === patternStops[i].stopId)
    if (!stop) throw new Error(`Stop not found for pattern stop at index ${i}.`)
    const stopPoint = stopToPoint(stop)
    if (i > 0 && previousStopPoint) {
      cumulativeDistance += distance(previousStopPoint, stopPoint, {
        units: 'meters'
      })
      patternSegments.push([
        previousStopPoint.geometry.coordinates,
        stopPoint.geometry.coordinates
      ])
    }
    controlPoints.push(newControlPoint(
      cumulativeDistance,
      stopPoint,
      {
        id: i,
        stopId: patternStops[i].stopId,
        pointType: POINT_TYPE.STOP,
        shapePtSequence: i
      }
    ))
    previousStopPoint = stopPoint
  }
  return {
    controlPoints,
    patternSegments
  }
}

export function stopToPoint (stop: GtfsStop) {
  return point([stop.stop_lon, stop.stop_lat])
}

/**
 * Generate control points from a list of pattern stops and pattern segments.
 *
 * TODO: Refactor this to use /lib/editor/util/map#generateControlPointsFromPatternStops
 * which currently takes pattern stops and actual stops, rather than pattern
 * segments?
 */
export function controlPointsFromSegments (
  patternStops: Array<PatternStop>,
  patternSegments: Array<Coordinates>
): Array<ControlPoint> {
  const controlPoints = []
  let cumulativeDistance = 0
  // Iterate over pattern segments and generate control points at the fence
  // posts.
  for (let i = 0; i <= patternSegments.length; i++) {
    let coordinate
    if (i === patternSegments.length) {
      // If this is the final iteration, coordinate for control point is equal
      // to the final point of the previous segment.
      const previousSegment = patternSegments[i - 1]
      coordinate = previousSegment[previousSegment.length - 1]
    } else {
      // Otherwise, the control point coordinate is the first coordinate of the
      // segment.
      coordinate = patternSegments[i][0]
    }
    if (!coordinate || coordinate.length !== 2) {
      console.log('patternSegments -->', patternSegments, patternSegments[i])
      console.log('coordinate -->', coordinate)
      throw new Error(`Coordinate in segment index ${i}/${patternSegments.length} does not exist`)
    }
    const controlPoint = newControlPoint(cumulativeDistance, point(coordinate),
      {
        id: i,
        pointType: POINT_TYPE.STOP,
        stopId: patternStops[i].stopId,
        shapePtSequence: i
      }
    )
    controlPoints.push(controlPoint)
    if (i < patternSegments.length) {
      // Only increase distance if not on last iteration (last iteration has
      // no segment defined).
      cumulativeDistance += lineDistance(lineString(patternSegments[i]), 'meters')
    }
  }
  return controlPoints
}

function getLineDistance (line: ?GeoJsonLinestring, unit: string): number {
  return line ? lineDistance(line, unit) : 0
}

export function getPatternDistance (
  pattern: Pattern,
  controlPoints: Array<ControlPoint>,
  unit: string = 'miles'
): ?number {
  const {shape, patternStops} = pattern
  // Determine line distance from either pattern shape or control points (if
  // no shape is available)
  if (shape) {
    if (!shape.coordinates) {
      throw new Error('received invalid shape coordinates')
    }
    return getLineDistance(geojsonFromCoordinates(shape.coordinates), unit)
  } else if (patternStops.length > 0 && controlPoints) {
    // Generate line from control points to determine virtual distance if there
    // are pattern stops, but there is not a pattern shape.
    if (controlPoints.length > 0) {
      try {
        const line: GeoJsonLinestring = lineString(controlPoints.map(cp => cp.point.geometry.coordinates))
        return getLineDistance(line, unit)
      } catch (e) {
        console.warn('Bad control point geometry. Defaulting distance to zero', e, controlPoints)
        return 0
      }
    }
  }
}

export function projectStopOntoLine (stop: GtfsStop, line: GeoJsonLinestring): {
  distanceInMeters: number,
  insertIndex: number,
  insertPoint: GeoJsonPoint
} {
  const stopPoint = stopToPoint(stop)
  // Find nearest point on line
  const insertPoint = nearestPointOnLine(line, stopPoint)
  // Determine insert index based on nearest point operation segment index.
  // FIXME is this the right spot to insert
  const insertIndex = insertPoint.properties.index
  // Determine distance traveled to stop/shape point
  // Distance returned from nearestPointOnLine defaults to km.
  const distanceInMeters = insertPoint.properties.location * 1000
  return {insertPoint, insertIndex, distanceInMeters}
}

/**
 * Get a scale factor to multiply shape dist traveled values by to get distance
 * traveled in meters. The shapeDistTraveled field is intended to be unitless
 * (see GTFS spec: https://developers.google.com/transit/gtfs/reference/#shapestxt).
 * But the units *should* be the same between stop_times.txt, which is used to derive
 * the pattern_stops values, and shapes.txt So, we use the last shapeDistTraveled
 * value for the pattern and the pattern length in meters to come up with a
 * scale factor to multiply by all of the pattern stop shapeDistTraveled values.
 */
export function getDistanceScaleFactor (shapePoints: Array<ShapePoint>): number {
  const patternLine = lineString(coordinatesFromShapePoints(shapePoints))
  const patternLengthInMeters: number = lineDistance(patternLine, 'meters')
  const totalShapePointsDistTraveled = shapePoints[shapePoints.length - 1].shapeDistTraveled
  // If the shape points have no shape dist traveled values, default the scale
  // factor to one.
  let distScaleFactor
  if (totalShapePointsDistTraveled) {
    distScaleFactor = patternLengthInMeters / totalShapePointsDistTraveled
  } else {
    console.warn(`No shape dist traveled value found for final shape point. Distance scale factor defaulting to 1.`)
    distScaleFactor = 1
  }
  return distScaleFactor
}
