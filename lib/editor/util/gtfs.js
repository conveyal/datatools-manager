// @flow

import {latLngBounds} from 'leaflet'
import {getGtfsSpec} from '../../common/util/config'
import {
  generateUID,
  generateRandomInt,
  generateRandomColor,
  idealTextColor
} from '../../common/util/util'
import {getEntityTableString} from '../../gtfs/util'

import type {
  // EditorTableData,
  Entity,
  GtfsRoute,
  GtfsStop,
  Pattern,
  ServiceCalendar
} from '../../types'
import type {AppState} from '../../types/reducers'

export const STOP_NAME_SPLIT_REGEX = /(\band\b|&|@|:|\/|\+)+/i

// FIXME: Add flow.  Consolidate with gtfs/util/getEntityGraphQLRoot
export const COMPONENT_LIST = [
  { id: 'route', tableName: 'routes' },
  { id: 'stop', tableName: 'stops' },
  { id: 'fare', tableName: 'fares' },
  { id: 'feedinfo', tableName: 'feed_info' },
  // FIXME: table name for calendar, fare, and schedule exception
  { id: 'calendar', tableName: 'calendar' },
  { id: 'scheduleexception', tableName: 'schedule_exceptions' },
  { id: 'agency', tableName: 'agency' }
]

export function getTableById (tableData: any, id?: string, emptyArrayOnNull: boolean = true): any {
  if (!id) {
    console.warn('Component not provided.')
    return null
  }
  const tableName = getKeyForId(id, 'tableName')
  if (!tableName) {
    console.warn(`Component ${id} not found in list of tables.`)
    return null
  }
  const table = tableData[tableName]
  // TODO: use Immutable List?
  // If table is null, return empty array if boolean specifies
  return emptyArrayOnNull
    ? table || []
    : table
}

export function getIdsFromParams (params: any): {
  activeEntityId: ?number,
  subEntityId: ?number
} {
  const activeEntityId = typeof params.activeEntityId !== 'undefined' && !isNaN(params.activeEntityId)
    ? +params.activeEntityId
    : undefined
  const subEntityId = typeof params.subEntityId !== 'undefined' && !isNaN(params.subEntityId)
    ? +params.subEntityId
    : undefined
  return {activeEntityId, subEntityId}
}

export function getKeyForId (id: string, key: string): ?string {
  const component = COMPONENT_LIST.find(c => c.id === id)
  return typeof component !== 'undefined' ? component[key] : null
}

export function isValidComponent (id: string): boolean {
  return COMPONENT_LIST.findIndex(c => c.id === id) !== -1
}

/**
 * Given a feed source ID, returns the active editor namespace (editor buffer),
 * which is used to query the GraphQL gtfs-lib API for entities.
 */
export function getEditorNamespace (feedSourceId: ?string, state: AppState) {
  if (!state.projects.all || !feedSourceId) return null
  for (var i = 0; i < state.projects.all.length; i++) {
    const project = state.projects.all[i]
    const feedSource = project.feedSources && project.feedSources.find(fs => fs.id === feedSourceId)
    if (feedSource) return feedSource.editorNamespace
  }
}

export const subComponentList: Array<string> = ['trippattern']
export const subSubComponentList: Array<string> = ['timetable']

export function generateNullProps (component: string): any {
  // Get the appropriate GTFS spec table for component
  const gtfsSpec = getGtfsSpec()
  const entityTableString = getEntityTableString(component)
  const table: any = gtfsSpec.find(table => table.id === entityTableString)
  const props = {}
  // For every field in table, create a nulled out property in the return object
  table && table.fields
    .map(field => field.name)
    .forEach(fieldName => { props[fieldName] = null })
  if (component === 'fare') {
    props.fare_rules = []
    props.transfers = ''
  } else if (component === 'calendar') {
    // FIXME: Need to set days of week manually (null values result in failed
    // write operation).
    props.monday = 0
    props.tuesday = 0
    props.wednesday = 0
    props.thursday = 0
    props.friday = 0
    props.saturday = 0
    props.sunday = 0
  }
  return props
}

export const generateProps = (component: string, editorState: any): any => {
  const feedInfo = getTableById(editorState.data.tables, 'feedinfo', false)[0]
  switch (component) {
    case 'route':
      // If an agency exists in the feed, assign the route to the first agency.
      const agencies = getTableById(editorState.data.tables, 'agency', false)
      // FIXME: Should this be the agency_id field or ID
      const agencyId = agencies && agencies[0] ? agencies[0].agency_id : null
      const routeColor = feedInfo && feedInfo.default_route_color
        ? feedInfo.default_route_color
        : generateRandomColor()
      return {
        route_id: generateUID(),
        agency_id: agencyId,
        route_short_name: generateRandomInt(1, 300),
        route_long_name: null,
        route_color: routeColor,
        route_text_color: idealTextColor(routeColor),
        publicly_visible: 1, // public
        status: 2, // APPROVED
        route_type: feedInfo && feedInfo.default_route_type !== null
          ? feedInfo.default_route_type
          : 3
      }
    case 'stop':
      const {bounds} = editorState.mapState
      const stopId = generateUID()
      const center = bounds && bounds.getCenter()
      return {
        stop_id: stopId,
        stop_name: null,
        stop_lat: center ? center.lat : 0,
        stop_lon: center ? center.lng : 0
      }
    case 'scheduleexception':
      return {
        dates: [],
        custom_schedule: null,
        added_service: null,
        removed_service: null
      }
    case 'trippattern':
      return {
        // patternStops: [],
      }
  }
}

export function getEntityBounds (entity: any, stops?: Array<GtfsStop>, offset: number = 0.005): ?latLngBounds {
  if (!entity) return null

  if (entity.constructor === Array) {
    // [lng, lat]
    return latLngBounds([
      [entity[1] + offset, entity[0] - offset],
      [entity[1] - offset, entity[0] + offset]
    ])
  } else if (typeof entity.stop_lat === 'number' && typeof entity.stop_lon === 'number') {
    // stop
    return latLngBounds([
      [entity.stop_lat + offset, entity.stop_lon - offset],
      [entity.stop_lat - offset, entity.stop_lon + offset]
    ])
  } else if (typeof entity.route_id === 'string') {
    // route
    const route: GtfsRoute = ((entity: any): GtfsRoute)
    let coordinates = []
    if (route.tripPatterns) {
      route.tripPatterns.map(pattern => {
        if (pattern.shape && pattern.shape.coordinates) {
          coordinates = [
            ...coordinates,
            ...pattern.shape.coordinates.map(c => [c[1], c[0]])
          ]
        }
      })
    }
    // Return null if no coordinates are present (i.e., route has no trip patterns)
    return coordinates.length > 0
      ? latLngBounds(coordinates)
      : null
  } else if (entity.shape) {
    // trip pattern
    const pattern: Pattern = ((entity: any): Pattern)
    return latLngBounds(pattern.shape.coordinates.map(c => [c[1], c[0]]))
  } else if (entity.patternStops && stops) {
    // Convert stops to bounds
    return latLngBounds(stops.map(s => [s.stop_lat, s.stop_lon]))
  }
}

export function mapPatternShape (pattern: any): any {
  if (!pattern) return null
  pattern.geometry = {
    type: 'LineString',
    coordinates: pattern.shape && pattern.shape.map(s => [s.lon, s.lat])
  }
  return pattern
}

export function getEntityName (entity: any): string {
  const NO_NAME = '[no name]'
  if (!entity) {
    // FIXME: When will this occur...
    return '[Unnamed]'
  }

  let nameKey: string = 'name'

  // FIXME: Checking for undefined fields to assert entity type doesn't work so
  // well with GraphQL.
  if (typeof entity.route_id !== 'undefined') {
    nameKey = 'route_short_name'
  } else if (typeof entity.patternStops !== 'undefined') {
    nameKey = 'name'
  } else if (typeof entity.agency_name !== 'undefined') {
    nameKey = 'agency_name'
  } else if (typeof entity.stop_id !== 'undefined') {
    nameKey = 'stop_name'
  } else if (typeof entity.service_id !== 'undefined') {
    nameKey = 'description'
  } else if (typeof entity.fare_id !== 'undefined') {
    nameKey = 'fare_id'
  } else if (typeof entity.exemplar !== 'undefined') {
    nameKey = 'name'
  }

  switch (nameKey) {
    case 'stop_name':
      const stop: GtfsStop = ((entity: any): GtfsStop)
      return stop.stop_name && stop.stop_code
        ? `${stop.stop_name} (${stop.stop_code})`
        : stop.stop_name && stop.stop_id
          ? `${stop.stop_name} (${stop.stop_id})`
          : stop.stop_name || NO_NAME
    case 'route_short_name':
      const route: GtfsRoute = ((entity: any): GtfsRoute)
      if (route.route_short_name &&
        route.route_long_name &&
        route.route_short_name !== '""' &&
        route.route_long_name !== '""') {
        return `${route.route_short_name} - ${route.route_long_name}`
      } else if (route.route_short_name && route.route_short_name !== '""') {
        return route.route_short_name
      } else if (route.route_long_name && route.route_long_name !== '""') {
        return route.route_long_name
      } else {
        return NO_NAME
      }
    case 'description': // service calendar
      const serviceCalendar: ServiceCalendar = ((entity: any): ServiceCalendar)
      return `${serviceCalendar.service_id} ${serviceCalendar.description
        ? `(${serviceCalendar.description})`
        : ''}`
    default:
      const otherEntityType: any = entity
      return otherEntityType[nameKey] || NO_NAME
  }
}

export function getAbbreviatedStopName (stop: GtfsStop, maxCharactersPerWord: number = 10): string {
  return abbreviateStopName(getEntityName(stop), maxCharactersPerWord)
}

export function abbreviateStopName (stopName: string, maxCharactersPerWord: number = 10): string {
  const stopNameParts = stopName ? stopName.split(STOP_NAME_SPLIT_REGEX) : null
  return stopNameParts &&
  stopNameParts.length === 3 &&
  stopName.length > maxCharactersPerWord * 2
    ? `${stopNameParts[0]
      .substr(0, maxCharactersPerWord)
      .trim()}… ${stopNameParts[2].substr(0, maxCharactersPerWord).trim()}`
    : stopName
}

export function getRouteNameAlerts (route: GtfsRoute): string | null {
  const routeName =
    route.route_short_name && route.route_long_name
      ? `${route.route_short_name} - ${route.route_long_name}`
      : route.route_long_name
        ? route.route_long_name
        : route.route_short_name ? route.route_short_name : null
  return routeName
}

export function getRouteName (route: ?GtfsRoute): string {
  let name = ''
  if (route && route.route_short_name) {
    name += route.route_short_name
    if (route.route_long_name) {
      name += ' - '
    }
  }

  if (route && route.route_long_name) {
    name += route.route_long_name
  }
  if (
    route &&
    route.route_id &&
    !route.route_long_name &&
    !route.route_short_name
  ) {
    name += route.route_id
  }
  return name
}

export function gtfsSort (a: Entity, b: Entity): number {
  const radix = 10
  var aName = getEntityName(a)
  var bName = getEntityName(b)
  if (a.isCreating && !b.isCreating) return -1
  if (!a.isCreating && b.isCreating) return 1
  if (
    !isNaN(parseInt(aName, radix)) &&
    !isNaN(parseInt(bName, radix)) &&
    !isNaN(+aName) &&
    !isNaN(+bName)
  ) {
    if (parseInt(aName, radix) < parseInt(bName, radix)) return -1
    if (parseInt(aName, radix) > parseInt(bName, radix)) return 1
    return 0
  }
  if (aName.toLowerCase() < bName.toLowerCase()) return -1
  if (aName.toLowerCase() > bName.toLowerCase()) return 1
  return 0
}
