// @flow

import update from 'immutability-helper'

import type { Action } from '../../types/actions'
import type { AdminServersState } from '../../types/reducers'

export const defaultState = {
  isFetching: false,
  data: null
}

const servers = (state: AdminServersState = defaultState, action: Action): AdminServersState => {
  switch (action.type) {
    case 'REQUESTING_SERVERS':
      return update(state, { isFetching: { $set: true } })
    case 'RECEIVE_SERVERS':
      return update(state, {
        isFetching: { $set: false },
        data: { $set: action.payload }
      })
    case 'RECEIVE_SERVER':
      const serverData = action.payload
      if (state.data) {
        const serverIdx = state.data.findIndex(
          server => server.id === serverData.id
        )
        return update(state, {
          isFetching: { $set: false },
          data: { [serverIdx]: { $set: action.payload } }
        })
      }
      return state
    case 'CREATED_SERVER':
      if (state.data) {
        return update(state, { data: { $push: [action.payload] } })
      }
      return state
    default:
      return state
  }
}

export default servers
