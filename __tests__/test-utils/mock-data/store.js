// @flow

import multi from '../multi'
import promise from '../promise'
import {middleware as fetchMiddleware} from '../fetch'
import Enzyme, {mount} from 'enzyme'
import EnzymeReactAdapter from 'enzyme-adapter-react-16'
import {mountToJson} from 'enzyme-to-json'
import clone from 'lodash/cloneDeep'
import {get} from 'object-path'
import React from 'react'
import {Provider} from 'react-redux'
import { createBrowserHistory } from 'history'
import { routerMiddleware } from 'connected-react-router'
import {applyMiddleware, combineReducers, createStore} from 'redux'
import configureStore from 'redux-mock-store'
import thunkMiddleware from 'redux-thunk'

import admin from '../../../lib/admin/reducers'
import {defaultState as defaultAdminOrganizationsState} from '../../../lib/admin/reducers/organizations'
import {defaultState as defaultAdminServersState} from '../../../lib/admin/reducers/servers'
import {defaultState as defaultAdminUsersState} from '../../../lib/admin/reducers/users'
import alerts from '../../../lib/alerts/reducers'
import {defaultState as defaultAlertsActiveState} from '../../../lib/alerts/reducers/active'
import {defaultState as defaultAlertsAlertsState} from '../../../lib/alerts/reducers/alerts'
import editor from '../../../lib/editor/reducers'
import {defaultState as defaultEditorDataState} from '../../../lib/editor/reducers/data'
import {defaultState as defaultEditorMapState} from '../../../lib/editor/reducers/mapState'
import {defaultState as defaultEditorSettingsState} from '../../../lib/editor/reducers/settings'
import {defaultState as defaultEditorTimetableState} from '../../../lib/editor/reducers/timetable'
import gtfs from '../../../lib/gtfs/reducers'
import {defaultState as defaultGtfsFilterState} from '../../../lib/gtfs/reducers/filter'
import {defaultState as defaultGtfsPatternState} from '../../../lib/gtfs/reducers/patterns'
import {defaultState as defaultGtfsRoutesState} from '../../../lib/gtfs/reducers/routes'
import {defaultState as defaultGtfsShapesState} from '../../../lib/gtfs/reducers/shapes'
import {defaultState as defaultGtfsStopsState} from '../../../lib/gtfs/reducers/stops'
import {defaultState as defaultGtfsTimetablesState} from '../../../lib/gtfs/reducers/timetables'
import {defaultState as defaultGtfsValidationState} from '../../../lib/gtfs/reducers/validation'
import * as gtfsPlusReducers from '../../../lib/gtfsplus/reducers'
import {defaultState as defaultGtfsPlusState} from '../../../lib/gtfsplus/reducers/gtfsplus'
import * as managerReducers from '../../../lib/manager/reducers'
import {defaultState as defaultManagerLanguagesState} from '../../../lib/manager/reducers/languages'
import {defaultState as defaultManagerProjectsState} from '../../../lib/manager/reducers/projects'
import {defaultState as defaultManagerStatusState} from '../../../lib/manager/reducers/status'
import {defaultState as defaultManagerUiState} from '../../../lib/manager/reducers/ui'
import {defaultState as defaultManagerUserState} from '../../../lib/manager/reducers/user'
import * as manager from './manager'

import type {AppState} from '../../../lib/types/reducers'

Enzyme.configure({ adapter: new EnzymeReactAdapter() })

const defaultManagerState = {
  languages: defaultManagerLanguagesState,
  projects: defaultManagerProjectsState,
  status: defaultManagerStatusState,
  ui: defaultManagerUiState,
  user: defaultManagerUserState
}

const defaultRouterLocation = {
  action: '',
  hash: '',
  key: '',
  pathname: '',
  query: {},
  search: ''
}

/**
 * Returns a cloned version of the initial load state of the redux store.
 */
export function getMockInitialState (): AppState {
  return clone({
    admin: {
      organizations: defaultAdminOrganizationsState,
      servers: defaultAdminServersState,
      users: defaultAdminUsersState
    },
    alerts: {
      ...defaultAlertsActiveState,
      ...defaultAlertsAlertsState
    },
    ...defaultManagerState,
    editor: {
      data: defaultEditorDataState,
      // The editSettings state below represents the default state of redux-undo
      // which this reducer uses.
      editSettings: {
        future: [],
        present: defaultEditorSettingsState,
        index: 0,
        limit: 1,
        past: []
      },
      mapState: defaultEditorMapState,
      timetable: defaultEditorTimetableState
    },
    gtfs: {
      filter: defaultGtfsFilterState,
      patterns: defaultGtfsPatternState,
      routes: defaultGtfsRoutesState,
      shapes: defaultGtfsShapesState,
      stops: defaultGtfsStopsState,
      timetables: defaultGtfsTimetablesState,
      validation: defaultGtfsValidationState
    },
    gtfsplus: defaultGtfsPlusState,
    routing: {
      location: defaultRouterLocation,
      routeParams: {}
    } // react-router state
  })
}

/**
 * This store state models the store state with a admin user logged in to the
 * webapp.
 */
export function getMockStateWithAdminUser (): AppState {
  const state = clone(getMockInitialState())
  state.user = manager.mockAdminUser
  return state
}

/**
 * This store state builds on top of the admin user state by also adding a
 * project without any feeds
 */
export function getMockStateWithProject (): AppState {
  const state = clone(getMockStateWithAdminUser())
  const {mockProject} = manager
  state.projects.active = mockProject
  state.projects.all.push(mockProject)
  state.routing.routeParams.projectId = mockProject.id
  return state
}

/**
 * This store state builds on top of the admin user state by also adding a
 * project with feeds and a deployment. The state is also made with the
 * assumption that the all data needed to display the FeedSourceTable has been
 * loaded.
 */
export function getMockStateWithProjectWithFeedsAndDeployment (): AppState {
  const state = clone(getMockStateWithProject())
  const {mockProjectWithDeployment} = manager
  state.projects.active = mockProjectWithDeployment
  state.projects.all.push(mockProjectWithDeployment)
  state.projects.filter.feedSourceTableComparisonColumn = 'DEPLOYED'
  state.routing.routeParams.projectId = mockProjectWithDeployment.id
  return state
}

/**
 * Returns a cloned version of the state or the redux store with a feed loaded
 * for editing in the editor.
 *
 * TODO: modify the state so a feed is actually loaded in
 */
export function getMockEditorState (): AppState {
  const editorState = clone(getMockStateWithProject())
  return editorState
}

const storeMiddleWare = [
  fetchMiddleware,
  multi,
  promise,
  thunkMiddleware
]

/**
 * Creates a new store with reducers that will update state.
 */
const history = createBrowserHistory()
export function makeMockStore (initialState: AppState = getMockInitialState()) {
  const store = createStore(
    // $FlowFixMe not sure why this is giving a flow error
    combineReducers({
      ...{
        ...managerReducers,
        admin,
        alerts,
        ...gtfsPlusReducers,
        editor,
        gtfs
      }
    }),
    initialState,
    applyMiddleware(
      routerMiddleware(history),
      ...storeMiddleWare
    )
  )
  // Helper method to snapshot a part of the state. Don't snapshot the entire
  // state, because the messages are huge!
  store.expectStateToMatchSnapshot = (subStatePath: ?string) => {
    if (!subStatePath) throw new Error('Snapshotting the entire state not allowed!')
    expect(get(store.getState(), subStatePath)).toMatchSnapshot()
  }
  return store
}

/**
 * Mount a react component within a mock redux store. This mock redux store
 * accepts actions, but doesn't send any of those results to the reducers.
 * This function is primarily used for taking snapshots of components and
 * containers in order to verify that they are rendering expected values.
 */
export function mockWithProvider (
  ConnectedComponent: any,
  connectedComponentProps: any = {},
  storeState: AppState = getMockInitialState()
) {
  const store = configureStore(storeMiddleWare)(storeState)
  const wrapper = mount(
    <Provider store={store}>
      <ConnectedComponent {...connectedComponentProps} />
    </Provider>
  )

  return {
    snapshot: () => mountToJson(wrapper),
    store,
    wrapper
  }
}
