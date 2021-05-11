// @flow

import moment from 'moment'
import update from 'immutability-helper'

import type {Action} from '../../types/actions'
import type {FilterState} from '../../types/reducers'

export const defaultState = {
  activeFeeds: {},
  dateTimeFilter: {
    date: moment().format('YYYYMMDD'),
    from: 0, // 12 AM
    to: 60 * 60 * 28 // 4 AM next day
  },
  loadedFeeds: [],
  map: {
    bounds: [[70, 130], [-70, -130]],
    zoom: 10
  },
  patternFilter: null,
  permissionFilter: 'view-feed',
  project: null,
  routeFilter: null,
  routeLimit: 10,
  routeOffset: 0,
  serviceFilter: null,
  showArrivals: true,
  showAllRoutesOnMap: false,
  timepointFilter: false,
  typeFilter: ['stops', 'routes'],
  version: null
}

const setAllFeeds = (feeds, value) => {
  const activeFeeds = Object.assign({}, feeds)
  for (const feedId in activeFeeds) {
    if (activeFeeds.hasOwnProperty(feedId)) {
      activeFeeds[feedId] = value
    }
  }
  return activeFeeds
}

const gtfsFilter = (state: FilterState = defaultState, action: Action): FilterState => {
  switch (action.type) {
    case 'SET_ACTIVE_PROJECT':
      return update(state, {
        project: { $set: action.payload ? action.payload.id : null }
      })
    case 'SET_ACTIVE_FEEDVERSION':
      return update(state, {
        showAllRoutesOnMap: {$set: false},
        patternFilter: {$set: null},
        routeFilter: {$set: null},
        version: {$set: action.payload ? action.payload.id : null}
      })
    case 'UPDATE_GTFS_MAP_STATE':
      return update(state, {map: {$set: action.payload}})
    case 'UPDATE_GTFS_PERMISSION_FILTER':
      return update(state, {permissionFilter: {$set: action.payload}})
    case 'UPDATE_GTFS_DATETIME_FILTER':
      const dateTimeFilter = {...state.dateTimeFilter}
      for (const key in action.payload) {
        dateTimeFilter[key] = action.payload[key]
      }
      // also clear the pattern on a date change because there is no gaurantee
      // that the pattern exists on a different date
      const patternUpdate = action.payload.hasOwnProperty('date')
        ? { patternFilter: { $set: null } }
        : {}
      return update(state, {
        dateTimeFilter: {$set: dateTimeFilter},
        ...patternUpdate
      })
    case 'RECEIVE_FEEDSOURCES':
      const activeFeeds = {}
      if (action.payload.feedSources) {
        action.payload.feedSources.forEach(fs => { activeFeeds[fs.id] = true })
      }
      return update(state, {activeFeeds: {$set: activeFeeds}})
    case 'ADD_ACTIVE_FEED':
      return update(state, {activeFeeds: {[action.payload]: {$set: true}}})
    case 'REMOVE_ACTIVE_FEED':
      return update(state, {activeFeeds: {[action.payload]: {$set: false}}})
    case 'ADD_ALL_ACTIVE_FEEDS':
      return update(state, {activeFeeds: {$set: setAllFeeds(state.activeFeeds, true)}})
    case 'REMOVE_ALL_ACTIVE_FEEDS':
      return update(state, {activeFeeds: {$set: setAllFeeds(state.activeFeeds, false)}})
    case 'ROUTE_FILTER_CHANGE':
      return update(state, {routeFilter: { $set: action.payload }})
    case 'PATTERN_FILTER_CHANGE':
      return update(state, {patternFilter: { $set: action.payload }})
    case 'SHOW_ARRIVAL_CHANGE':
      return update(state, {showArrivals: { $set: action.payload }})
    case 'TIMEPOINT_CHANGE':
      return update(state, {timepointFilter: { $set: action.payload }})
    case 'UPDATE_ROUTE_OFFSET':
      return update(state, {routeOffset: { $set: action.payload }})
    case 'SHOW_ALL_ROUTES_ON_MAP_CHANGE':
      return update(state, {showAllRoutesOnMap: { $set: action.payload }})
    default:
      return state
  }
}

export default gtfsFilter
