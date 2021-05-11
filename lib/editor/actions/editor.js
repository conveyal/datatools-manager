// @flow

import clone from 'lodash/cloneDeep'
import { push } from 'connected-react-router'
import moment from 'moment'
import qs from 'qs'
import {createAction, type ActionType} from 'redux-actions'

import {createVoidPayloadAction, fetchGraphQL, secureFetch} from '../../common/actions'
import {generateUID} from '../../common/util/util'
import {clearGtfsContent, saveActiveGtfsEntity, setActiveGtfsEntity} from './active'
import {ENTITY} from '../constants'
import {
  generateNullProps,
  generateProps,
  getEditorNamespace,
  getTableById
} from '../util/gtfs'
import {fetchGTFSEntities} from '../../manager/actions/versions'

import type {
  dispatchFn,
  getStateFn,
  AppState,
  EditorTables,
  LockState
} from '../../types/reducers'

export const updateEntitySort = createAction('UPDATE_ENTITY_SORT')

const createGtfsEntity = createAction(
  'CREATE_GTFS_ENTITY',
  (payload: { component: string, props: Object }) => payload
)
const receiveBaseGtfs = createAction(
  'RECEIVE_BASE_GTFS',
  (payload: { feed: EditorTables }) => payload
)
const setEditorCheckIn = createAction(
  'SET_EDITOR_CHECK_IN',
  (payload: LockState) => payload
)
export const showEditorModal = createVoidPayloadAction('SHOW_EDITOR_MODAL')

export type EditorActions = ActionType<typeof createGtfsEntity> |
  ActionType<typeof receiveBaseGtfs> |
  ActionType<typeof setEditorCheckIn> |
  ActionType<typeof showEditorModal>

function getCloneProps (entityId: number, component: string, state: AppState) {
  const {active, tables} = state.editor.data
  const activeTable = getTableById(tables, component)
  switch (component) {
    case 'trippattern':
      if (!active.entity) {
        console.warn('no entity is active, unable to get clone props')
        return
      }
      const pattern = active.entity.tripPatterns.find(tp => tp.id === entityId)
      const newPatternId = generateUID()
      const newShapeId = generateUID()
      return {
        ...pattern,
        // Overwrite existing name 'X' with 'X copy'
        name: `${pattern.name} copy`,
        // Overwrite pattern and shape IDs and the IDs of referencing tables.
        patternId: newPatternId,
        shapeId: newShapeId,
        shapePoints: pattern.shapePoints.map(sp => ({...sp, shapeId: newShapeId})),
        patternStops: pattern.patternStops.map(ps => ({...ps, patternId: newPatternId}))
      }
    case 'route':
      const route = clone(activeTable.find(e => e.id === entityId))
      // FIXME: Cloning a route should also clone its patterns.
      // See https://github.com/catalogueglobal/datatools-ui/issues/153
      delete route.tripPatterns
      return route
    default:
      return {...activeTable.find(e => e.id === entityId)}
  }
}

export function patchTable (component: string, patch: any, filter: any) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {feedId, sessionId} = getState().editor.data.lock
    if (!sessionId) throw new Error('No active editing session is open!')
    if (!feedId) throw new Error('No feedId found in session lock!')
    const params = { feedId, sessionId }
    // Add filter fields to query params (e.g., stop_lon=gt.-87.76736)
    if (filter) {
      Object.keys(filter).forEach(key => {
        params[key] = filter[key]
      })
    }
    const url = `/api/editor/secure/${component}?${qs.stringify(params)}`
    return dispatch(secureFetch(url, 'PATCH', patch))
      .then(res => res.json())
      .then(json => {
        window.alert(json.message)
        const namespace = getEditorNamespace(feedId, getState())
        return dispatch(fetchBaseGtfs({namespace, component}))
      })
  }
}

export function cloneGtfsEntity (
  feedSourceId: string,
  component: string,
  entityId: number,
  save?: boolean = false
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (entityId === ENTITY.NEW_ID) {
      // Prevent cloning new entity
      console.warn('Cannot clone entity that has not been saved yet.')
      return null
    }
    const props = {
      ...getCloneProps(entityId, component, getState()),
      // Add ID field after clone props to ensure it overwrites any previous
      // value.
      id: ENTITY.NEW_ID
    }
    dispatch(newGtfsEntity(feedSourceId, component, props, save))
  }
}

export function lockEditorFeedSource (feedId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {feedId: previousFeedId, sessionId, timestamp} = getState().editor.data.lock
    if (sessionId && previousFeedId === feedId) {
      const duration = moment.duration(moment(timestamp).diff(moment()))
      const minutes = duration.asMinutes()
      if (minutes < 60) {
        console.log(`Session ID ${sessionId} found in session storage. Attempting to resume editor sesssion`)
        // There is already an unexpired session open for this browser tab.
        // FIXME: Handle removing session for different feed source.
        dispatch(startEditorLockMaintenance(sessionId, feedId))
        return Promise.resolve(true)
      }
    }
    const url = `/api/editor/secure/lock?feedId=${feedId}`
    return dispatch(secureFetch(url, 'post', undefined, undefined, undefined, 'RE_LOCK'))
      .then(res => res.json())
      .then(json => {
        if (json) {
          dispatch(startEditorLockMaintenance(json.sessionId, feedId))
          return true
        } else return false
      })
      // FIXME: catch error and boot user out of editor?
      .catch(err => {
        // dispatch(setEditorCheckIn({feedId: null, sessionId: null, timer: null, timestamp: null}))
        // push(`/feed/${feedId}/edit`)
        console.warn('Could not create lock on feed source', err)
        return false
      })
  }
}

/**
 * Stop job time function stored with timer ID stored in state.
 */
function stopCurrentTimer (state: AppState) {
  // FIXME
  const {timer} = state.editor.data.lock
  if (timer) clearInterval(timer)
}

/**
 * HTTP call to .
 */
function maintainEditorLock (
  sessionId: string,
  feedId: string
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `/api/editor/secure/lock/${sessionId}?feedId=${feedId}`
    if (!document.hidden) {
      // Only maintain lock if browser tab is active
      return dispatch(secureFetch(url, 'put', undefined, undefined, undefined, 'RE_LOCK'))
        .then(response => response.json())
        .then(json => {
          if (json.code >= 400) dispatch(removeEditorLock(feedId))
          else dispatch(setEditorCheckIn({timestamp: moment().format()}))
        })
        .catch(err => {
          console.warn(err)
          dispatch(removeEditorLock(feedId))
        })
    }
  }
}

/**
 * Start editor lock maintenance. This checks in with the server to indicate that
 * the feed should still be checked out for this user's session. Upon success,
 * the session timestamp is updated.
 */
function startEditorLockMaintenance (
  sessionId: string,
  feedId: string
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    stopCurrentTimer(getState())

    const timerFunction = () => dispatch(maintainEditorLock(sessionId, feedId))
    // make an initial call right now
    timerFunction()
    // Set time to check in every 10 seconds
    const timer = setInterval(timerFunction, 10000)
    // FIXME: Timer needs updating every maintain editor lock call.
    dispatch(setEditorCheckIn({timer, sessionId, feedId, timestamp: moment().format()}))
  }
}

/**
 * Remove current editor lock on feed. This should be called when the GTFS Editor
 * unmounts or the browser tab closes.
 */
export function removeEditorLock (
  feedId: ?string,
  overwrite: ?boolean = false
): any {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!feedId) {
      // If no feed ID is provided, default to the feed ID in the store.
      feedId = getState().editor.data.active.feedSourceId
    }
    const {sessionId} = getState().editor.data.lock
    if (!feedId) {
      console.warn('Feed source ID is undefined! Skipping attempt to remove editor lock.')
      // FIXME: Don't let feed ID become undefined!
      return Promise.resolve(() => false)
    }
    console.log(`removing lock for feed ${feedId}, session ${sessionId || '(undefined)'}`)
    // If sessionId is missing and overwrite is true, the server will
    // overwrite whatever session was currently running for the feed ID with a
    // new session.
    const url = `/api/editor/secure/lock/${sessionId || 'dummy_value'}?feedId=${feedId}${overwrite ? '&overwrite=true' : ''}`
    return dispatch(secureFetch(url, 'delete'))
      .then(res => {
        stopCurrentTimer(getState())
        dispatch(setEditorCheckIn({timer: null, sessionId: null, feedId: null}))
        return res.json()
      })
      .then(json => {
        if (overwrite) {
          // If overwriting with new session, start lock maintenance with new
          // session ID.
          if (json.sessionId) {
            if (!feedId) return false
            dispatch(startEditorLockMaintenance(json.sessionId, feedId))
            return true
          } else {
            // If no session ID is found in the response, the lock was not
            // successful.
            return false
          }
        } else {
          // Otherwise, the intention is to exit the editor. Clear all GTFS
          // content. This must be done finally so as not to interfere with the
          // lock removal.
          dispatch(clearGtfsContent())
        }
      })
  }
}

export function newGtfsEntities (
  feedSourceId: string,
  component: string,
  propsArray: Array<Object>,
  save: boolean
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    Promise.all(propsArray.map(props => dispatch(newGtfsEntity(feedSourceId, component, props, save))))
  }
}

export function newGtfsEntity (
  feedSourceId: ?string,
  component: string,
  props?: Object,
  save?: boolean = false,
  refetch?: boolean = true
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!props) {
      props = generateProps(component, getState().editor)
    }
    props = {
      // Add nulled out fields to component (backend expects full set of fields)
      ...generateNullProps(component),
      ...props
    }
    if (save) {
      return dispatch(saveActiveGtfsEntity(component, props, refetch))
    } else {
      if (!feedSourceId) {
        console.warn('Feed source ID not provided for new GTFS entity. Defaulting to state.')
        const {active} = getState().editor.data
        if (!active.feedSourceId) {
          console.warn('No active feedsource')
          return
        }
        feedSourceId = active.feedSourceId
      }
      dispatch(createGtfsEntity({ component, props }))
      if (props && 'routeId' in props) {
        // Set active entity for trip pattern
        dispatch(setActiveGtfsEntity(feedSourceId, 'route', props.routeId, component, ENTITY.NEW_ID))
      } else {
        // Set active entity for all other basic types (e.g., routes, stops, etc.).
        dispatch(setActiveGtfsEntity(feedSourceId, component, ENTITY.NEW_ID))
      }
    }
  }
}

// GENERIC TABLE ACTIONS

export function uploadBrandingAsset (
  feedId: string,
  entityId: number,
  component: string,
  file: File
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!file) {
      console.warn('No file to upload!')
      return
    }
    var data = new window.FormData()
    data.append('file', file)
    const {sessionId} = getState().editor.data.lock
    const url = `/api/editor/secure/${component}/${entityId}/uploadbranding?feedId=${feedId}&sessionId=${sessionId || ''}`
    // Server handles associating branding asset entity's field
    return dispatch(secureFetch(url, 'post', data, false, false))
      .then(res => res.json())
      .then(r => {
        const namespace = getEditorNamespace(feedId, getState())
        // Refetch entity and replace in store
        dispatch(fetchGTFSEntities({namespace, id: entityId, type: component, editor: true}))
      })
  }
}

// FIXME: add additional params
// TODO: fetch nested elements
export function fetchBaseGtfs ({
  feedSourceId,
  namespace
}: {
  feedSourceId?: string,
  namespace: ?string
}) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const query = `
      query ($namespace: String) {
        feed(namespace: $namespace) {
          trip_counts {
            service_id {
              type
              count
            }
            pattern_id {
              type
              count
            }
            route_id {
              type
              count
            }
          }
          feed_info {
            id
            feed_id
            feed_publisher_name
            feed_publisher_url
            feed_lang
            feed_start_date
            feed_end_date
            feed_version
            default_route_color
            default_route_type
          }
          agency (limit: -1) {
            id
            agency_id
            agency_name
          }
          calendar (limit: -1) {
            id
            service_id
            description
          }
          fares (limit: -1) {
            id
            fare_id
          }
          routes (limit: -1) {
            id
            route_id
            route_short_name
            route_long_name
            # Ensure that we know route type when setting active entity (for edit
            # settings like snap to streets).
            route_type
          }
          schedule_exceptions (limit: -1) {
            id
            name
            # Fetch dates to ensure we can do validation in the UI
            # (avoid duplicate dates).
            dates
          }
          stops (limit: -1) {
            id
            stop_id
            stop_code
            stop_name
            stop_lat
            stop_lon
            zone_id # needed for fares
          }
        }
      }
    `
    // TODO: fetch patterns / subcomponent in nested query?
    if (!getState().editor.data.lock.sessionId) {
      if (!feedSourceId) {
        console.warn('No feedSourceId specified, unable to lock editor!')
        return
      }
      return dispatch(lockEditorFeedSource(feedSourceId))
        .then(lockSuccess => {
          if (!lockSuccess) {
            console.warn('No lock on editor. Canceling feed fetch')
            dispatch(setEditorCheckIn({feedId: null, sessionId: null, timer: null, timestamp: null}))
            push(`/feed/${feedSourceId}/edit`)
            return
          }
          if (!namespace) {
            console.error('Cannot fetch GTFS for undefined or null namespace')
            dispatch(showEditorModal())
            return
          }
          return dispatch(fetchGraphQL({query, variables: {namespace}}))
            .then(data => dispatch(receiveBaseGtfs({...data})))
        })
    } else {
      // If there is already a session lock, skip trying to create another.
      if (!namespace) {
        console.error('Cannot fetch GTFS for undefined or null namespace')
        dispatch(showEditorModal())
        return
      }
      return dispatch(fetchGraphQL({query, variables: {namespace}}))
        .then(data => dispatch(receiveBaseGtfs({...data})))
    }
  }
}
