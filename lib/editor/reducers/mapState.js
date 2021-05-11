// @flow

import update from 'immutability-helper'
import {latLngBounds} from 'leaflet'
import type {ActionType} from 'redux-actions'

import {receivedRoutesShapefile, updateMapSetting} from '../actions/map'
import {receiveFeedSource} from '../../manager/actions/feeds'
import { getFeedBounds } from '../util/map'

import type {MapState} from '../../types/reducers'

export const defaultState = {
  zoom: null,
  bounds: latLngBounds([[60, 60], [-60, -20]]), // entire globe
  routesGeojson: null,
  target: null
}

export const reducers = {
  'RECEIVE_FEEDSOURCE' (
    state: MapState,
    action: ActionType<typeof receiveFeedSource>
  ): MapState {
    if (action.payload) {
      return update(state, {
        bounds: {$set: latLngBounds(getFeedBounds(action.payload))},
        target: {$set: action.payload && action.payload.id}
      })
    } else {
      return state
    }
  },
  'RECEIVED_ROUTES_SHAPEFILE' (
    state: MapState,
    action: ActionType<typeof receivedRoutesShapefile>
  ) {
    return update(state, {
      routesGeojson: {$set: action.payload.geojson}
    })
  },
  'UPDATE_MAP_SETTING' (
    state: MapState,
    action: ActionType<typeof updateMapSetting>
  ) {
    const updatedState = {}
    for (const key in action.payload) {
      if (key === 'bounds' && !action.payload[key]) {
        // do nothing. Setting bounds to null would cause an error for Leaflet
      } else {
        updatedState[key] = {$set: action.payload[key]}
      }
    }
    if (!('target' in action.payload)) {
      // If no target present in payload, set to null (no target to focus on)
      updatedState.target = {$set: null}
    }
    return update(state, updatedState)
  }
}
