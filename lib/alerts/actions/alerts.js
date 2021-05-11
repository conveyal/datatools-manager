// @flow

import { push } from 'connected-react-router'
import {createAction, type ActionType} from 'redux-actions'
import uuidv4 from 'uuid/v4'

import {updatePermissionFilter} from '../../gtfs/actions/filter'
import {fetchStopsAndRoutes} from '../../gtfs/actions/general'
import {createVoidPayloadAction, secureFetch} from '../../common/actions'
import {isModuleEnabled} from '../../common/util/config'
import {getAlertsUrl, getFeedId} from '../../common/util/modules'
import {fetchProjects} from '../../manager/actions/projects'
import {setErrorMessage} from '../../manager/actions/status'
import {getActiveProject} from '../../manager/selectors'
import {isNew, NEW_ALERT_ID} from '../../alerts/util'

import type {Alert, Feed, GtfsRoute, GtfsStop, Project, RtdAlert} from '../../types'
import type {
  dispatchFn,
  getStateFn,
  ManagerUserState,
  RouterLocation
} from '../../types/reducers'

const receivedRtdAlerts = createAction(
  'RECEIVED_RTD_ALERTS',
  (payload: {
    project: Project,
    rtdAlerts: Array<RtdAlert>
  }) => payload
)
const requestRtdAlerts = createVoidPayloadAction('REQUEST_RTD_ALERTS')
const updateActiveAlert = createAction(
  'UPDATE_ACTIVE_ALERT_ALERT',
  (payload: Object) => payload
)

export type AlertsActions = ActionType<typeof receivedRtdAlerts> |
  ActionType<typeof requestRtdAlerts> |
  ActionType<typeof updateActiveAlert>

/**
 * Creates a new alert in the store (but does not persist the alert with a server
 * request).
 */
export function createAlert () {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(updateActiveAlert({
      id: NEW_ALERT_ID,
      title: '',
      affectedEntities: [],
      published: false
    }))
    // If the alert was not created by default (by visiting server.com/alerts/new),
    // redirect the browser window to the
    if (window.location.pathname !== '/alerts/new') {
      push('/alerts/new')
    }
  }
}

/**
 * Helper function to construct a new affected entity.
 */
export function constructNewEntity (
  entity: GtfsStop | GtfsRoute,
  agency: ?Feed
) {
  // Determine the entity type.
  const type = typeof entity.stop_id !== 'undefined' ? 'STOP' : 'ROUTE'
  const newEntity = {}
  // Assign the entity id to the entity. Note: the MTC RTD server will
  // re-assign these.
  newEntity.id = uuidv4()
  newEntity.type = type
  // Add agency if not null.
  if (agency !== null) {
    newEntity.agency = agency
  }
  const typeKey = type.toLowerCase()
  newEntity[typeKey] = entity
  return newEntity
}

export function deleteAlert (alert: Alert) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    return dispatch(secureFetch(`${getAlertsUrl()}/${alert.id}`, 'delete'))
      .then((res) => res.json())
      .then(json => {
        push('/alerts')
        dispatch(fetchRtdAlerts())
      })
      .catch(e => console.log(e))
  }
}

function setActiveAlert (alertId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const alert = getState().alerts.all.find(a => a.id === alertId)
    if (alert) {
      dispatch(updateActiveAlert(alert))
    } else {
      console.warn(`Could not find alert with id: ${alertId}`)
    }
  }
}

export function fetchRtdAlerts () {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestRtdAlerts())
    const project = getActiveProject(getState())
    if (!project) {
      return dispatch(setErrorMessage({
        message: "Can't request alerts without knowing project"
      }))
    }
    return dispatch(secureFetch(getAlertsUrl()))
      .then(res => res.json())
      .then(rtdAlerts => dispatch(receivedRtdAlerts({rtdAlerts, project})))
      .then(() => dispatch(fetchStopsAndRoutes(getState().alerts.entities, 'ALERTS')))
  }
}

export function editAlert (alert: Alert) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(updateActiveAlert(alert))
    push(`/alert/${alert.id}`)
  }
}

export function saveAlert (alert: Alert) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const json = {
      Id: isNew(alert) ? null : alert.id,
      HeaderText: alert.title || 'New Alert',
      DescriptionText: alert.description || '',
      Url: alert.url || '',
      Cause: alert.cause || 'UNKNOWN_CAUSE',
      Effect: alert.effect || 'UNKNOWN_EFFECT',
      Published: alert.published ? 'Yes' : 'No',
      StartDateTime: alert.start / 1000 || 0,
      EndDateTime: alert.end / 1000 || 0,
      ServiceAlertEntities: alert.affectedEntities.map((entity) => {
        return {
          Id: entity.id,
          AlertId: alert.id,
          AgencyId: entity.agency ? getFeedId(entity.agency) : null,
          RouteId: entity.route ? entity.route.route_id : null,
          RouteShortName: entity.route ? entity.route.route_short_name : null,
          RouteType: entity.mode ? entity.mode.gtfsType : null,
          StopId: entity.stop ? entity.stop.stop_id : null,
          StopCode: entity.stop ? entity.stop.stop_code : null,
          TripId: null,
          ServiceAlertTrips: []
        }
      })
    }
    const url = getAlertsUrl() + (isNew(alert) ? '' : '/' + alert.id)
    const method = isNew(alert) ? 'post' : 'put'
    return dispatch(secureFetch(url, method, json))
      .then((res) => res.json())
      .then(json => {
        // On successful save, re-route back to main alerts viewer
        push('/alerts')
        dispatch(fetchRtdAlerts())
      })
      .catch(e => console.log(e))
  }
}

export function onAlertEditorMount (
  alert: ?Alert,
  location: RouterLocation,
  permissionFilter: string,
  user: ManagerUserState
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!isModuleEnabled('alerts')) {
      console.warn('Alerts module is disabled. Aborting onAlertEditorMount.')
      return
    }
    const alertId = location.pathname.split('/alert/')[1]
    if (alert) return
    let activeProject
    dispatch(fetchProjects(true))
      .then(project => {
        activeProject = project
        return dispatch(fetchRtdAlerts())
      })
      // logic for creating new alert or setting active alert (and checking project permissions)
      .then(() => {
        if (
          !user.permissions ||
          !user.permissions.hasProjectPermission(
            activeProject.organizationId,
            activeProject.id,
            'edit-alert'
          )
        ) {
          console.log('cannot create alert!')
          push('/alerts')
          return
        }
        if (!alertId) {
          dispatch(createAlert())
        } else {
          dispatch(setActiveAlert(alertId))
        }
        if (permissionFilter !== 'edit-alert') {
          dispatch(updatePermissionFilter('edit-alert'))
        }
      })
  }
}

export function onAlertsViewerMount (
  alerts: ?Array<Alert>,
  permissionFilter: string,
  project: ?Project
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!isModuleEnabled('alerts')) {
      console.warn('Alerts module is disabled. Aborting onAlertsViewerMount.')
      return
    }
    if (project && project.feedSources && (!alerts || alerts.length === 0)) {
      dispatch(fetchRtdAlerts())
    }
    if (!project || !project.feedSources) {
      dispatch(fetchProjects(true))
        .then(project => dispatch(fetchRtdAlerts()))
    }
    if (permissionFilter !== 'edit-alert') {
      dispatch(updatePermissionFilter('edit-alert'))
    }
  }
}
