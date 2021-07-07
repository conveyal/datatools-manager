// @flow

import fetch from 'isomorphic-fetch'

import {GTFS_GRAPHQL_PREFIX} from '../../common/constants'
import {getGtfsSpec} from '../../common/util/config'
import {routeSearch, stopSearch} from '../util/graphql'
import {getHeaders} from '../../common/util/util'

import type {GtfsRoute, GtfsStop, User} from '../../types'

export function getEntityIdField (type: string): string {
  if (!type) return ''
  switch (type.toLowerCase()) {
    case 'agency':
      return 'agency_id'
    case 'fare':
      return 'fare_id'
    case 'calendar':
      return 'service_id'
    case 'stop':
      return 'stop_id'
    case 'route':
      return 'route_id'
    case 'trip':
      return 'trip_id'
    case 'stoptime':
      return 'trip_id'
    case 'service':
      return 'service_id'
    case 'pattern':
      return 'pattern_id'
    default:
      return ''
  }
}

/**
 * Constructs GraphQL fields to query on for the specified GTFS entity type. If
 * constructing fields for the editor, all fields will be returned because the
 * backend fills in any missing table fields when creating a snapshot for the
 * editor. Otherwise, only the required fields will be included in the returned
 * set of fields.
 */
export function getGraphQLFieldsForEntity (type: string, editor: boolean = false) {
  // Find table for provided type.
  const entityTableString = getEntityTableString(type)
  const table = getGtfsSpec().find(table => table.id === entityTableString)
  let fields = ''
  if (!table) {
    console.warn(`Could not find table fare entity ${type}`)
  }
  fields = table
    ? table.fields
      // Only filter required fields if not fetching for editor
      .filter(field => editor
        // Include all fields for the editor.
        ? field
        : field.required && !field.datatools)
      .map(field => field.name)
      .join('\n')
    : ''
  // stop_times are a special case because they must be requested as a
  // nested list underneath a trip
  const shapeFields = `shape_points: shape (limit: -1) {
    shape_pt_lon
    shape_pt_lat
    shape_pt_sequence
    point_type
    shape_dist_traveled
  }`
  const patternStopFields = `pattern_stops (limit: -1) {
    id
    stop_id
    default_travel_time
    default_dwell_time
    stop_sequence
    shape_dist_traveled
    pickup_type
    drop_off_type
    timepoint
    continuous_pickup
    continuous_drop_off
  }`
  switch (type.toLowerCase()) {
    case 'stoptime':
      return `
        trip_id
        stop_times {
          ${fields}
        }
      `
    case 'fare':
      // console.log('getting fare fields')
      return `
        ${fields}
        fare_rules (limit: -1) {
          id
          fare_id
          route_id
          origin_id
          destination_id
          contains_id
        }
      `
    case 'pattern':
      return `
      shape_id
      pattern_id
      route_id
      direction_id
      use_frequency
      name
      ${shapeFields}
      `
    case 'route':
      return `
        ${fields}
        tripPatterns: patterns (limit: -1) {
          id
          shape_id
          pattern_id
          route_id
          direction_id
          use_frequency
          name
          ${patternStopFields}
          ${shapeFields}
        }
      `
    default:
      return fields
  }
}

export function getEntityGraphQLRoot (type: string): string {
  if (!type) return ''
  switch (type.toLowerCase()) {
    case 'agency':
      return 'agency'
    case 'calendar':
      return 'calendar'
    case 'fare':
      return 'fares'
    case 'feedinfo':
      return 'feed_info'
    case 'stop':
      return 'stops'
    case 'route':
      return 'routes'
    case 'trip':
      return 'trips'
    case 'stoptime':
      return 'trips'
    case 'scheduleexception':
      return 'schedule_exceptions'
    case 'service':
      return 'services'
    case 'pattern':
      return 'patterns'
    default:
      return ''
  }
}

/**
 * Takes an entity component type and returns the gtfs.yml table id
 */
export function getEntityTableString (type: string): string {
  if (!type) return ''
  switch (type.toLowerCase()) {
    case 'agency':
      return 'agency'
    case 'calendar':
      return 'calendar'
    case 'fare':
      return 'fare_attributes'
    case 'fare_rules':
      return 'fare_rules'
    case 'feedinfo':
      return 'feedinfo'
    case 'stop':
      return 'stop'
    case 'route':
      return 'route'
    case 'trip':
      return 'trip'
    case 'scheduleexception':
      return 'scheduleexception'
    case 'stoptime':
      return 'stop_time'
    case 'service':
      return 'services'
    case 'pattern':
      return 'patterns'
    default:
      console.warn(`No table ID found for entity type ${type}.`)
      return ''
  }
}

/**
 * Request stop and route entities from GraphQL endpoint.
 * @param  {String} textInput search string
 * @param  {Object} feed      feed source to search
 * @param  {[type]} entities  entity types to search (stops and/or routes)
 * @param  {[type]} filterByRoute route on which to filter stops
 * @param  {[type]} filterByStop  stop on which to filter routes
 */
export function searchEntitiesWithString (
  textInput: string,
  namespace: ?string,
  entities: Array<string>,
  filterByRoute?: GtfsRoute,
  filterByStop?: GtfsStop,
  user: User
) {
  // FIXME: Handle filter by route/stop (filter by route will query routes
  // with a specified route id and stops nested underneath)!!!
  const variables = {
    routeId: filterByRoute ? filterByRoute.route_id : undefined,
    stopId: filterByStop ? filterByStop.stop_id : undefined,
    namespace,
    search: textInput
  }
  const queryForRoutes = entities.indexOf('routes') !== -1
  const queryForStops = entities.indexOf('stops') !== -1
  const includeRouteSubQuery = !!filterByStop
  const includeStopSubQuery = !!filterByRoute
  // Build routes/stops query based on entities searching and whether we're
  // filtering by a specific route or stop ID.
  const body = JSON.stringify({
    query: `
query (
  $namespace: String,
  $search: String
  ${filterByRoute ? ' $routeId: [String]' : ''}
  ${filterByStop ? ' $stopId: [String]' : ''}
) {
  feed(namespace: $namespace) {
    ${queryForRoutes && includeRouteSubQuery ? stopSearch(true, 30) : ''}
    ${queryForRoutes && !includeRouteSubQuery ? routeSearch(false, 30) : ''}
    ${queryForStops && includeStopSubQuery ? routeSearch(true, 30) : ''}
    ${queryForStops && !includeStopSubQuery ? stopSearch(false, 30) : ''}
  }
}`,
    variables
  })
  // FIXME: replace with secure fetch
  return fetch(GTFS_GRAPHQL_PREFIX, {method: 'post', body, headers: getHeaders(user.token)})
    .then(res => res.json())
    .then(json => {
      const {data} = json
      if (filterByStop) {
        // Assign routes filtered by stop to root routes list for processing
        // into options.
        data.feed.routes = data.feed.stops[0].routes
        delete data.feed.stops
      } else if (filterByRoute) {
        // Assign stops filtered by route to root stops list for processing
        // into options.
        data.feed.stops = data.feed.routes[0].stops
        delete data.feed.routes
      }
      return {results: data, namespace}
    })
}
