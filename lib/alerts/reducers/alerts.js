// @flow

import clone from 'lodash/cloneDeep'
import update from 'immutability-helper'
import mergeable from 'redux-merge-reducers'

import { FILTERS, filterAlertsByCategory, mapRtdAlert } from '../util'

import type {Alert} from '../../types'
import type {Action} from '../../types/actions'
import type {AlertsReducerState} from '../../types/reducers'

export const defaultState = {
  fetched: false,
  isFetching: false,
  all: [],
  entities: [],
  filter: {
    searchText: null,
    filter: 'ACTIVE',
    sort: null,
    feedId: null
  },
  counts: {}
}

/* eslint-disable complexity */
const alerts = (
  state: AlertsReducerState = defaultState,
  action: Action
): AlertsReducerState => {
  switch (action.type) {
    case 'SET_ALERT_VISIBILITY_SEARCH_TEXT':
      return update(state, {filter: {searchText: {$set: action.payload}}})
    case 'SET_ALERT_VISIBILITY_FILTER':
      return update(state, {filter: {filter: {$set: action.payload}}})
    case 'SET_ALERT_SORT':
      return update(state, {filter: {sort: {$set: action.payload}}})
    case 'SET_ALERT_AGENCY_FILTER':
      return update(state, {filter: {feedId: {$set: action.payload}}})
    case 'DELETE_ALERT':
    case 'REQUEST_RTD_ALERTS':
      return update(state, {
        isFetching: {$set: true},
        fetched: {$set: false},
        all: {$set: []}
      })
    case 'RECEIVED_GTFS_STOPS_AND_ROUTES': {
      if (action.payload.moduleType !== 'ALERTS') {
        // Do not process entities fetched for a different module.
        return state
      }
      const entities = state.entities
      const alerts = clone(state.all)
      const {feedId, results} = action.payload
      if (!results || !results.feed) {
        console.warn(`Error fetching entity results for feed ${feedId}.`)
        return state
      }
      const {feed} = results
      // for those entities we requested, assign the gtfs data to the saved entities
      for (var i = 0; i < entities.length; i++) {
        const entity = entities[i]
        const gtfs = entity.type === 'stop'
          ? feed.stops.find(s => s.stop_id === entity.entity.StopId)
          : entity.type === 'route'
            ? feed.routes.find(s => s.route_id === entity.entity.RouteId)
            : null
        if (gtfs) {
          gtfs.feed_id = feedId
        }
        entity.gtfs = gtfs
      }
      // iterate over processed gtfs entities
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i]
        if (ent.gtfs && alerts) {
          const alert = alerts.find(a => a.id === ent.entity.AlertId)
          if (!alert) continue
          const selectedEnt = alert.affectedEntities.find(e => e.id === ent.entity.Id)
          if (!selectedEnt) continue
          selectedEnt[ent.type] = ent.gtfs
        }
      }

      return update(state, {
        fetched: {$set: true},
        isFetching: {$set: false},
        all: {$set: alerts},
        entities: {$set: entities}
      })
    }
    case 'RECEIVED_RTD_ALERTS': {
      const entityList = []
      const {project, rtdAlerts} = action.payload
      const filteredAlerts = rtdAlerts
        ? rtdAlerts
          // For MTC, filter out all alerts that were created with the TRAMS tool,
          // as indicated by EditedBy=TRAMS
          .filter(alert => alert.EditedBy !== 'TRAMS')
        : []
      filteredAlerts
        // Grab the stop and route entities for later fetching from
        // the Data Tools GraphQL endpoint.
        .forEach(alert => {
          if (alert && alert.ServiceAlertEntities && alert.ServiceAlertEntities.length > 0) {
            for (var j = 0; j < alert.ServiceAlertEntities.length; j++) {
              const entity = alert.ServiceAlertEntities[j]
              // FIXME: Cast IDs to strings until RTD updates its types.
              // See https://github.com/ibi-group/datatools-ui/issues/459
              entity.Id = `${entity.Id}`
              entity.AlertId = `${entity.AlertId}`
              if (entity.StopId) {
                entityList.push({type: 'stop', entity, gtfs: {}})
              }
              if (entity.RouteId) {
                entityList.push({type: 'route', entity, gtfs: {}})
              }
            }
          }
        })
      const alerts: Array<Alert> = filteredAlerts
        // Map alerts from RTD structure.
        .map(alert => mapRtdAlert(alert, project))
      const filterCounts = {}
      // Record the number of alerts that fall into each filter category.
      FILTERS.forEach(f => { filterCounts[f] = filterAlertsByCategory(alerts, f).length })
      return update(state, {
        isFetching: {$set: false},
        all: {$set: alerts},
        entities: {$set: entityList},
        counts: {$set: filterCounts}
      })
    }
    default:
      return state
  }
}

export default mergeable(alerts)
