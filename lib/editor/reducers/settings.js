// @flow

import update from 'immutability-helper'
import type {ActionType} from 'redux-actions'

import {settingActiveGtfsEntity, updateEditSetting} from '../actions/active'
import {
  controlPointDragOrEnd,
  updatePatternGeometry,
  updateTempPatternGeometry
} from '../actions/map'
import { CLICK_OPTIONS } from '../util'

import type {EditSettingsState} from '../../types/reducers'

export const defaultState = {
  addStops: false,
  afterIntersection: true,
  controlPoints: null,
  currentDragId: null,
  distanceFromIntersection: 5,
  editGeometry: false,
  followStreets: true,
  hideInactiveSegments: false,
  intersectionStep: 2,
  onMapClick: CLICK_OPTIONS[0],
  patternSegments: null,
  shapePoints: null,
  showStops: true,
  showTooltips: true,
  hideStopHandles: true,
  stopInterval: 400
}

export const reducers = {
  'CONTROL_POINT_DRAG_START_OR_END' (
    state: EditSettingsState,
    action: ActionType<typeof controlPointDragOrEnd>
  ): EditSettingsState {
    return update(state, {
      currentDragId: {$set: action.payload}
    })
  },
  'RESET_ACTIVE_GTFS_ENTITY' (
    state: EditSettingsState,
    action: ActionType<typeof settingActiveGtfsEntity>
  ): EditSettingsState {
    return {
      ...defaultState,
      // Do not reset follow streets if exiting pattern editing.
      // TODO: Are there other edit settings that should not be overridden?
      followStreets: state.followStreets
    }
  },
  'SETTING_ACTIVE_GTFS_ENTITY' (
    state: EditSettingsState,
    action: ActionType<typeof settingActiveGtfsEntity>
  ): EditSettingsState {
    // Default for no route type is true (most routes are buses/follow streets)
    let followStreets = true
    const {activeEntity, component} = action.payload
    // Update value for follow streets when setting active route
    if (activeEntity && component === 'route') {
      // If route type is bus or tram, set to true. If other, set false.
      followStreets = (
        activeEntity.route_type === 3 ||
        activeEntity.route_type === 0 ||
        typeof activeEntity.route_type === 'undefined'
      )
    }
    return {
      ...defaultState,
      followStreets
    }
  },
  'UPDATE_TEMP_PATTERN_GEOMETRY' (
    state: EditSettingsState,
    action: ActionType<typeof updateTempPatternGeometry>
  ): EditSettingsState {
    return update(state, {
      controlPoints: {$set: action.payload.controlPoints},
      patternSegments: {$set: action.payload.patternSegments}
    })
  },
  'UPDATE_PATTERN_GEOMETRY' (
    state: EditSettingsState,
    action: ActionType<typeof updatePatternGeometry>
  ): EditSettingsState {
    return update(state, {
      controlPoints: {$set: action.payload.controlPoints},
      patternSegments: {$set: action.payload.patternSegments}
    })
  },
  'UPDATE_EDIT_SETTING' (
    state: EditSettingsState,
    action: ActionType<typeof updateEditSetting>
  ): EditSettingsState {
    const {setting, value} = action.payload
    return update(state, { [setting]: {$set: value} })
  }
}
