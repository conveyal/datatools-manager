// @flow

import update from 'immutability-helper'
import clone from 'lodash/cloneDeep'
import SortDirection from 'react-virtualized/dist/commonjs/Table/SortDirection'

import {decodeShapePolylines} from '../../common/util/gtfs'
import {defaultSorter} from '../../common/util/util'
import {ENTITY} from '../constants'
import {generateNullProps, getTableById, getKeyForId} from '../util/gtfs'
import {getMapToGtfsStrategy, entityIsNew} from '../util/objects'
import {assignDistancesToPatternStops, constructShapePoints} from '../util/map'

import type {Action} from '../../types/actions'
import type {DataState} from '../../types/reducers'

// If updating a trip pattern, new props apply to sub entity and edited
// boolean updated is patternEdited.
const getUpdateEntityKeys = component => component === 'trippattern'
  ? {entityKey: 'subEntity', editedKey: 'patternEdited'}
  : {entityKey: 'entity', editedKey: 'edited'}

export const defaultState = {
  active: {},
  lock: {},
  sort: {
    key: 'name',
    direction: SortDirection.ASC
  },
  status: {},
  tables: {
    agency: [],
    calendar: [],
    fares: [],
    feed_info: [],
    routes: [],
    schedule_exceptions: [],
    stops: [],
    trip_counts: {
      pattern_id: [],
      route_id: [],
      service_id: []
    }
  },
  tripPatterns: null
}

/* eslint-disable complexity */
const data = (state: DataState = defaultState, action: Action): DataState => {
  switch (action.type) {
    case 'RECEIVE_FEEDSOURCE':
      const feedSourceId = action.payload ? action.payload.id : undefined
      return update(state, {active: {$merge: {feedSourceId}}})
    case 'RECEIVE_BASE_GTFS': {
      const feed = clone(action.payload.feed)
      if (!feed) {
        console.warn('Could not fetch base GTFS!')
        return state
      }
      if (feed.feed_info.length === 0) {
        console.warn(`No feed info found. Adding feed info with null values.`)
        feed.feed_info.push(generateNullProps('feedinfo'))
      }
      return update(state, {
        tables: {$set: feed},
        status: {$set: {baseFetched: true}}
      })
    }
    case 'SHOW_EDITOR_MODAL':
      return update(state, {status: {showEditorModal: {$set: true}}})
    case 'SAVING_ACTIVE_GTFS_ENTITY':
      return update(state, {status: {
        savePending: {$set: true},
        saveSuccessful: {$set: false}
      }})
    case 'CREATE_GTFS_ENTITY': {
      const {component, props} = action.payload
      const id = ENTITY.NEW_ID
      const entity = {
        id,
        isCreating: true,
        ...props
      }
      if (component === 'trippattern') {
        // Add empty name.
        entity.name = ''
        const routes = getTableById(state.tables, 'route')
        const routeIndex = routes.findIndex(r => r.id === props.routeId)
        return update(state, {
          tables: {route: {[routeIndex]: {tripPatterns: {$unshift: [entity]}}}},
          active: {
            // Clone entity to ensure it is not linked to table entry
            entity: {tripPatterns: {$unshift: [clone(entity)]}}
          }
        })
      } else {
        // Add new entity into table array
        const tableName = getKeyForId(component, 'tableName')
        if (!tableName) return state
        return update(state, {
          tables: {[tableName]: {$unshift: [entity]}}
        })
      }
    }
    case 'UNDO_TRIP_PATTERN_EDITS': {
      const {controlPoints, patternSegments} = action.payload
      if (controlPoints && patternSegments) {
        // If control points and pattern segments are not null, use the past
        // set of data to reset the active pattern's shape points/pattern stops.
        const shapePoints = constructShapePoints(controlPoints, patternSegments)
        const {subEntity} = state.active
        if (!subEntity) {
          console.warn('No trip pattern found in state', state.active)
          return state
        }
        const patternStops = assignDistancesToPatternStops(subEntity.patternStops, shapePoints)
        return update(state, {active: {subEntity: {$merge: {
          shapePoints,
          patternStops
        }}}})
      } else {
        // Otherwise, this is the last available 'undo', so we revert back to
        // the original pattern shape points and pattern stops.
        // Get the original data from the pattern stored in the route.
        const {entity, subEntityId} = state.active
        if (!entity) {
          console.warn('No entity found in state', state.active)
          return state
        }
        const {shapePoints, patternStops} = entity.tripPatterns
          .find(tp => tp.id === subEntityId)
        return update(state, {active: {subEntity: {$merge: {
          shapePoints,
          patternStops
        }}}})
      }
    }
    case 'UPDATE_PATTERN_GEOMETRY': {
      const {controlPoints, patternSegments} = action.payload
      const shapePoints = constructShapePoints(controlPoints, patternSegments)
      const {subEntity} = state.active
      if (!subEntity) {
        console.warn('No trip pattern found in state', state.active)
        return state
      }
      const patternStops = assignDistancesToPatternStops(subEntity.patternStops, shapePoints)
      return update(state, {active: {subEntity: {$merge: {
        shapePoints,
        patternStops
      }}}})
    }
    case 'SETTING_ACTIVE_GTFS_ENTITY': {
      let subEntity
      const {component, entityId, feedSourceId, subComponent, subSubComponent, subEntityId, subSubEntityId} = action.payload
      // When setting feed_info as active, there may not be an ID passed.
      // TODO: Decide if this should be fixed to conform to other entity types.
      const activeTable = getTableById(state.tables, component, false)
      const entity = (component === 'feedinfo')
        ? clone(activeTable[0])
        : activeTable && entityId
          ? clone(activeTable.find(e => e.id === entityId))
          : null
      // Set edited to true if this is a new entity.
      const edited = entity && entityIsNew(entity)
      if (subComponent === 'trippattern') {
        subEntity = entity && entity.tripPatterns
          ? clone(entity.tripPatterns.find(p => p.id === subEntityId))
          : null
      }
      const active = {
        feedSourceId,
        entity,
        entityId,
        subEntity,
        subEntityId,
        subSubEntityId,
        component,
        subComponent,
        subSubComponent,
        edited
      }
      return update(state, {active: {$set: active}})
    }
    case 'RESET_ACTIVE_GTFS_ENTITY': {
      const {entity: stateEntity} = state.active
      if (!stateEntity) {
        console.warn('Entity not found in state', state.active)
        return state
      }
      const {component, entity: payloadEntity} = action.payload
      const list = component === 'trippattern'
        ? stateEntity.tripPatterns
        : getTableById(state.tables, component, false)
      const entity = clone(list.find(e => e.id === payloadEntity.id))
      const {entityKey, editedKey} = getUpdateEntityKeys(component)
      return update(state, {
        active: {
          [entityKey]: {$set: entity},
          [editedKey]: {$set: false}
        }
      })
    }
    case 'SAVED_GTFS_ENTITY':
      // Simply update save status (this re-enables certain UI actions, e.g.,
      // pattern stops can be dragged/reordered once again). Replacing entities
      // in store is handled on fetch base GTFS entities.
      return update(state, {status: {
        savePending: {$set: false},
        saveSuccessful: {$set: true}
      }})
    case 'UPDATE_ACTIVE_GTFS_ENTITY': {
      const {component, props} = action.payload
      const {entityKey, editedKey} = getUpdateEntityKeys(component)
      // FIXME: Check for pattern stops props (what about other sequenced lists)
      // and update stop sequence.
      return update(state, {
        active: {
          [entityKey]: {$merge: props},
          [editedKey]: {$set: true}
        }
      })
    }
    case 'CLEAR_GTFSEDITOR_CONTENT':
      return defaultState
    case 'RECEIVE_NEW_ENTITY': {
      // Simply push the entity into the list of entities (no need to set active).
      const {component, entity} = action.payload
      const tableName = getKeyForId(component, 'tableName')
      if (!tableName) return state
      return update(state, {tables: {[tableName]: {$push: [entity]}}})
    }
    case 'FETCHING_TRIP_PATTERNS': {
      // Set value to an empty array to prevent the user from accidentally
      // triggering multiple fetches.
      return update(state, {tripPatterns: {$set: []}})
    }
    case 'RECEIVE_GTFS_ENTITIES': {
      let activePattern
      const {data, editor, component} = action.payload
      if (!editor) {
        // Ignore entity fetches if not for the editor (i.e., fetching entities
        // for viewing validation result details).
        return state
      }
      if (component === 'pattern') {
        // Handle trip patterns to be drawn as overlay layer in editor
        return update(state, {
          tripPatterns: {$set:
            data.feed.shapes_as_polylines.map(decodeShapePolylines)
          }
        })
      }
      const tableName = getKeyForId(component, 'tableName')
      // get entities from payload
      const mappingStrategy = getMapToGtfsStrategy(component)
      const entities = clone(data.feed[tableName].map(mappingStrategy))
      const activeEntityId = action.payload.id // || state.active.entity.id
      // Response should only contain a single entity if id argument is present
      const activeEntity = entities[0]
      const activeTable = getTableById(state.tables, component, false)
      const activeIndex = activeTable
        ? activeTable.findIndex(e => e.id === activeEntityId)
        : -1
      // Determine which entity to select
      if (component === 'route' && activeEntity && activeEntity.tripPatterns) {
        // Find active pattern if component is route
        const {subEntityId} = state.active
        const tripPatterns = activeEntity.tripPatterns.sort(defaultSorter)
        activePattern = subEntityId && clone(tripPatterns.find(p => p.id === subEntityId))
      }
      const stateUpdate: any = {
        active: {
          entity: {$set: clone(activeEntity)},
          // idIsInvalid: {$set: !activeEntity},
          edited: {$set: false},
          subEntity: {$set: activePattern},
          patternEdited: {$set: false}
        }
      }
      const entityForList = clone(activeEntity)
      if (tableName) {
        if (activeIndex !== -1) {
          // This entity already existed in the table (i.e., it is not new).
          stateUpdate.tables = {[tableName]: {[activeIndex]: {$set: entityForList}}}
        } else if (activeEntity) {
          // This is a valid, new entity.
          // FIXME What if this is the first entity?
          if (action.payload.replaceNew) {
            // If there was an unsaved entity in the previous state, replace it.
            const activeTable = getTableById(state.tables, component, false)
            const replaceIndex = activeTable.findIndex(e => e.id === ENTITY.NEW_ID)
            console.log('replace index', replaceIndex)
            stateUpdate.tables = {[tableName]: {$splice: [[replaceIndex, 1, entityForList]]}}
          } else {
            console.log('add entity to list', entityForList)
            stateUpdate.tables = {[tableName]: {$push: [entityForList]}}
          }
        } else {
          // The requested entity does not exist (bad ID in URL perhaps)
          console.error(`Entity requested with id=${activeEntityId} does not exist!`)
        }
      }
      return update(state, stateUpdate)
    }
    case 'TOGGLE_PATTERN_EDITING': {
      return update(state, {active: {patternSegment: {$set: undefined}}})
    }
    case 'UPDATE_ENTITY_SORT':
      return update(state, {sort: {$merge: action.payload}})
    case 'SET_ACTIVE_PATTERN_STOP':
      return update(state, {active: {patternStop: {$set: action.payload}}})
    case 'SET_ACTIVE_PATTERN_SEGMENT':
      return update(state, {active: {patternSegment: {$set: action.payload}}})
    case 'CREATING_SNAPSHOT':
    case 'LOADING_FEEDVERSION_FOR_EDITING':
      return update(state, {status: {creatingSnapshot: {$set: true}}})
    case 'HANDLING_FINISHED_JOB':
      if (action.payload.type === 'CREATE_SNAPSHOT') {
        return update(state, {status: {
          creatingSnapshot: {$set: false},
          snapshotFinished: {$set: true}
        }})
      } else {
        return state
      }
    case 'SET_EDITOR_CHECK_IN':
      return update(state, {lock: {$merge: action.payload}})
    case 'RECEIVE_TRIP_COUNTS_FOR_PATTERN': {
      const {patternId, tripCounts} = action.payload
      return update(state, {tables: {
        trip_counts: {[`pattern:${patternId}`]: {$set: tripCounts}}}
      })
    }
    case 'RECEIVE_TRIP_COUNTS': {
      const {tripCounts} = action.payload
      return update(state, {tables: {trip_counts: {$set: tripCounts}}})
    }
    default:
      return state
  }
}

export default data
