// @flow

import clone from 'lodash/cloneDeep'
import { push } from 'connected-react-router'
import {createAction, type ActionType} from 'redux-actions'

import {createVoidPayloadAction, secureFetch} from '../../common/actions'
import {ENTITY} from '../constants'
import {newGtfsEntity, fetchBaseGtfs} from './editor'
import {fetchFeedSourceAndProject} from '../../manager/actions/feeds'
import {fetchGTFSEntities} from '../../manager/actions/versions'
import {saveTripPattern} from './tripPattern'
import {
  getEditorNamespace,
  getTableById,
  isValidComponent,
  subComponentList,
  subSubComponentList
} from '../util/gtfs'
import {getMapFromGtfsStrategy, entityIsNew} from '../util/objects'

import type {Entity, Feed} from '../../types'
import type {dispatchFn, getStateFn, AppState} from '../../types/reducers'

export const clearGtfsContent = createVoidPayloadAction('CLEAR_GTFSEDITOR_CONTENT')
const receivedNewEntity = createAction(
  'RECEIVE_NEW_ENTITY',
  (payload: {
    component: string,
    entity: Entity
  }) => payload
)
export const resetActiveGtfsEntity = createAction(
  'RESET_ACTIVE_GTFS_ENTITY',
  (payload: {
    component: string,
    entity: Entity
  }) => payload
)
export const savedGtfsEntity = createVoidPayloadAction('SAVED_GTFS_ENTITY')
export const savingActiveGtfsEntity = createVoidPayloadAction('SAVING_ACTIVE_GTFS_ENTITY')
export const settingActiveGtfsEntity = createAction(
  'SETTING_ACTIVE_GTFS_ENTITY',
  (payload: {
    activeEntity: any,
    activeSubEntity: any,
    component: any,
    entityId: any,
    feedSourceId: any,
    subComponent: any,
    subEntityId: any,
    subSubComponent: any,
    subSubEntityId: any
  }) => payload
)
export const updateActiveGtfsEntity = createAction(
  'UPDATE_ACTIVE_GTFS_ENTITY',
  (payload: {
    component: string,
    entity: Entity,
    props: Object
  }) => payload
)
export const updateEditSetting = createAction(
  'UPDATE_EDIT_SETTING',
  (payload: {
    setting: string,
    value: any
  }) => payload
)

export type EditorActiveActions = ActionType<typeof clearGtfsContent> |
  ActionType<typeof receivedNewEntity> |
  ActionType<typeof resetActiveGtfsEntity> |
  ActionType<typeof savedGtfsEntity> |
  ActionType<typeof savingActiveGtfsEntity> |
  ActionType<typeof settingActiveGtfsEntity> |
  ActionType<typeof updateActiveGtfsEntity> |
  ActionType<typeof updateEditSetting>

export function enterTimetableEditor () {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {active, tables} = getState().editor.data
    const routes = getTableById(tables, 'route')
    dispatch(setActiveGtfsEntity(
      active.feedSourceId,
      'route',
      routes[0].id,
      'trippattern',
      ENTITY.NEW_ID,
      'timetable'
    ))
  }
}

/**
 * Wrapper function for setActiveGtfsEntity that takes entity objects and sets
 * the ID values.
 */
export function setActiveEntity (
  feedSourceId: string,
  component: string,
  entity: ?Entity | { id: number },
  subComponent?: string,
  subEntity?: any,
  subSubComponent?: string,
  subSubEntity?: any
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    // cast cause the entity id is a finicky thing
    const entityId = (entity && +entity.id: any)
    const subEntityId = subEntity && subEntity.id
    // This should only ever be a calendar entity
    const subSubEntityId = subSubEntity && subSubEntity.service_id
    dispatch(setActiveGtfsEntity(
      feedSourceId,
      component,
      entityId,
      subComponent,
      subEntityId,
      subSubComponent,
      subSubEntityId
    ))
  }
}

function getActiveEntity (
  component: string,
  activeTable: Array<any>,
  entityId: ?number | string
): ?Entity {
  return component === 'feedinfo'
    ? clone(activeTable)[0]
    : activeTable && entityId
      ? clone(activeTable.find(e => e.id === entityId))
      : null
}

function getActiveSubEntity (activeEntity: ?Entity, subEntityId: ?number): any {
  return activeEntity && activeEntity.tripPatterns && Array.isArray(activeEntity.tripPatterns)
    ? clone(activeEntity.tripPatterns.find(p => p.id === subEntityId))
    : null
}

function updateUrl (
  feedSourceId: ?string,
  component: string,
  entityId: ?number | string,
  state: AppState,
  subComponent: ?string,
  subEntityId: ?number,
  subSubComponent: ?string,
  subSubEntityId?: string | number
) {
  const pathItems = [
    'feed',
    feedSourceId,
    'edit',
    component,
    entityId,
    subComponent,
    subEntityId,
    subSubComponent,
    subSubEntityId
  ]
    // Filter out any null or undefined items
    .filter(item => item)
  let url = '/' + pathItems.join('/')
  if (!feedSourceId) {
    console.warn('feedSourceId not defined, could not calculate url')
    return
  } else if (component && !isValidComponent(component)) {
    // If component is not valid, go to editor root.
    console.warn(`"${component}" is not a valid URL component path`)
    url = `/feed/${feedSourceId}/edit/`
  } else if (entityId && subComponentList.indexOf(subComponent) === -1) {
    // If subComponent is not valid, go to active entity
    console.warn(`"subComponent: ${subComponent || 'undefined'}" is not a valid URL subComponent path`)
    url = `/feed/${feedSourceId}/edit/${component}/${entityId}/`
  } else if (entityId && subEntityId && subComponent && subSubComponent && subSubComponentList.indexOf(subSubComponent) === -1) {
    // If subSubComponent is not valid, go to sub entity
    console.warn(`"subSubComponent: ${subSubComponent || 'undefined'}" is not a valid URL subSubComponent path`)
    url = `/feed/${feedSourceId}/edit/${component}/${entityId}/${subComponent}/${subEntityId}/`
  }
  const {locationBeforeTransitions} = state.routing
  const pathname = locationBeforeTransitions && locationBeforeTransitions.pathname
  if (!locationBeforeTransitions || !pathname || pathname !== url) {
    // console.log('updating url', url, pathname)
    push(url)
  }
}

/**
 * This function is used to set the active components in the GTFS editor.
 * It also handles clearing GTFS content should the feed being edited change.
 * It ALSO handles redirecting the browser URL if an entity referenced by a route
 * parameter is not found in the list of entities.
 *
 * FIXME: There is too much going on in this action.
 */
/* eslint-disable complexity */
export function setActiveGtfsEntity (
  feedSourceId: ?string,
  component: string,
  entityId: ?string | number,
  subComponent?: string,
  subEntityId?: ?number,
  subSubComponent?: string,
  subSubEntityId?: string | number,
  forceFetch?: boolean = false
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    // TODO: Figure out a good way to handle route changes without confirm window
    // when there are unsaved changes to the active entity (or subentity).
    // if (getState().editor.data.active.edited && !window.confirm('You have unsaved changes. Discard changes?')) {
    //   return false
    // }
    const state = getState()
    const {data} = state.editor
    const {entityId: prevEntityId, feedSourceId: prevFeedSourceId} = data.active
    const {sessionId} = data.lock
    if (!sessionId) {
      console.warn('No session lock for feed source. Aborting set active entity')
      return
    }
    const activeTable = getTableById(data.tables, component)
    if (prevFeedSourceId && feedSourceId !== prevFeedSourceId) {
      // Feed source has changed. Clear GTFS content
      // FIXME: Do we need to clear GTFS content if namespace changes?
      // FIXME: This should be covered by GtfsEditor#componentWillReceiveProps
      console.warn(`Feed source ID has changed ${prevFeedSourceId} to ${feedSourceId || 'undefined'}. Clearing GTFS content.`)
      dispatch(clearGtfsContent())
    }
    if (
      entityId === ENTITY.NEW_ID &&
      (!activeTable || activeTable.findIndex(e => e.id === ENTITY.NEW_ID) === -1)
    ) {
      // Create new GTFS entity if id is ENTITY.NEW_ID and no ENTITY.NEW_ID
      // entity exists in table
      if (feedSourceId) {
        dispatch(newGtfsEntity(feedSourceId, component))
      }
    }
    updateUrl(
      feedSourceId,
      component,
      entityId,
      getState(),
      subComponent,
      subEntityId,
      subSubComponent,
      subSubEntityId
    )
    const activeEntity = getActiveEntity(component, activeTable, entityId)
    const activeSubEntity = getActiveSubEntity(activeEntity, subEntityId)
    // TODO: Fetch active entity and any subentities.
    // Only fetch entity if it is not being created
    const namespace = getEditorNamespace(feedSourceId, state)
    if (
      namespace &&
      entityId &&
      component &&
      entityId !== ENTITY.NEW_ID &&
      (forceFetch || (!activeSubEntity && !(component === 'route' && prevEntityId === entityId)))
    ) {
      // Only fetch trip patterns if the active pattern is not in the store and
      // if we're changing routes
      dispatch(fetchGTFSEntities({namespace, id: entityId, type: component, editor: true}))
    }
    dispatch(settingActiveGtfsEntity({
      activeEntity,
      activeSubEntity,
      component,
      entityId,
      feedSourceId,
      subComponent,
      subEntityId,
      subSubComponent,
      subSubEntityId
    }))
  }
}

export function saveActiveGtfsEntity (
  component: string,
  optionalEntity?: Entity,
  refetch: ?boolean = true
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {active} = getState().editor.data
    let entity = optionalEntity || active.entity
    const feedId = (entity && entity.feedId) || active.feedSourceId
    switch (component) {
      // FIXME
      case 'trippattern':
        // let route = active.entity
        // let patternId = active.subEntityId
        entity = optionalEntity || active.subEntity // route.tripPatterns.find(p => p.id === patternId)
        if (!entity) {
          console.warn('entity is undefined, unable to save active gtfs entity')
          return
        }
        // cast entity to make flow happy
        return dispatch(saveTripPattern(feedId, (entity: any)))
      default:
        // Default method for agencies, stops, routes, fares, calendars.
        // Trip patterns and feed info are handled above. Trips are handled in
        // timetable actions.
        return dispatch(saveEntity(feedId, entity, component, refetch))
    }
  }
}

/**
 * Generic method for saving an entity using REST endpoint. The only entity
 * types with unique save methods are trip patterns and trips (handled in timetable
 * actions).
 *
 * This method determines the URL from entity type (component), maps the entity
 * data into the required format (primarily updates fields to snake_case), and
 * after performing PUT request re-fetches the entity.
 */
export function saveEntity (
  feedId: ?string,
  entity: ?Entity,
  component: string,
  refetch: ?boolean = true
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!feedId || !entity) {
      return
    }
    dispatch(savingActiveGtfsEntity())
    const notNew = !entityIsNew(entity)
    const method = notNew ? 'put' : 'post'
    const idParam = notNew ? `/${entity.id || ''}` : ''
    const {sessionId} = getState().editor.data.lock
    const route = component === 'fare' ? 'fareattribute' : component
    const url = `/api/editor/secure/${route}${idParam}?feedId=${feedId}&sessionId=${sessionId || ''}`
    const mappingStrategy = getMapFromGtfsStrategy(component)
    const data = mappingStrategy(entity)
    return dispatch(secureFetch(url, method, data))
      .then(res => res.json())
      .then(savedEntity => {
        dispatch(savedGtfsEntity())
        const namespace = getEditorNamespace(feedId, getState())
        // Refetch entity and replace in store
        if (refetch) {
          return dispatch(fetchGTFSEntities({
            namespace,
            id: savedEntity.id,
            type: component,
            editor: true,
            replaceNew: !notNew
          }))
        } else {
          // Push new entity into store.
          dispatch(receivedNewEntity({component, entity: savedEntity}))
          return Promise.resolve(savedEntity)
        }
      })
  }
}

/**
 * Generic delete function for editor GTFS entities.
 */
export function deleteGtfsEntity (
  feedId: string,
  component: string,
  entityId: number,
  routeId?: number
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const namespace = getEditorNamespace(feedId, getState())
    if (!namespace) {
      console.warn('No namespace defined, unable to delete!')
      return
    }
    if (entityId === ENTITY.NEW_ID) {
      // Entity is new/unsaved. Overwrite current table with existing entities.
      // FIXME: we should just remove the ENTITY.NEW_ID entity from the store. This is a
      // waste of network traffic (especially for large feeds)
      return dispatch(fetchBaseGtfs({namespace}))
    }
    const {sessionId} = getState().editor.data.lock
    const entityPath = component === 'trippattern'
      ? 'pattern'
      : component === 'fare' ? 'fareattribute' : component
    if (!sessionId) {
      console.warn('No sessionId defined, unable to delete!')
      return
    }
    const url = `/api/editor/secure/${entityPath}/${entityId}?feedId=${feedId}&sessionId=${sessionId}`
    return dispatch(secureFetch(url, 'delete'))
      .then(response => response.json())
      .then(json => {
        if (component === 'trippattern' && routeId) {
          console.log('fetching trip patterns')
          // Replace trip patterns for route
          return dispatch(fetchGTFSEntities({namespace, id: routeId, type: 'route', editor: true}))
        } else {
          console.log('fetching base gtfs')
          // Replace entire table
          return dispatch(fetchBaseGtfs({namespace, component}))
        }
      })
  }
}

export function refreshBaseEditorData ({
  activeComponent,
  activeEntityId,
  activeSubSubEntity,
  feedSource,
  feedSourceId,
  forceFetch,
  subComponent,
  subEntityId,
  subSubComponent
}: {
  activeComponent: string,
  activeEntityId: number,
  activeSubSubEntity: string,
  feedSource: Feed,
  feedSourceId: string,
  forceFetch?: boolean,
  subComponent: string,
  subEntityId: number,
  subSubComponent: string
}) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    // Get all base GTFS tables
    if (!feedSource || feedSourceId !== feedSource.id) {
      // Get project and feed source if these are missing
      dispatch(fetchFeedSourceAndProject(feedSourceId))
        // Attempt to check out feed source for editing (i.e., lock the feed
        // source to prevent concurrent editing).
        .then(fs => dispatch(fetchBaseGtfs({
          feedSourceId,
          namespace: fs.editorNamespace
        })))
        .then(() => dispatch(setActiveGtfsEntity(
          feedSourceId,
          activeComponent,
          activeEntityId,
          subComponent,
          subEntityId,
          subSubComponent,
          activeSubSubEntity,
          forceFetch
        )))
    } else {
      dispatch(fetchBaseGtfs({
        feedSourceId,
        namespace: feedSource.editorNamespace
      }))
        .then(() => dispatch(setActiveGtfsEntity(
          feedSourceId,
          activeComponent,
          activeEntityId,
          subComponent,
          subEntityId,
          subSubComponent,
          activeSubSubEntity,
          forceFetch
        )))
    }
  }
}
