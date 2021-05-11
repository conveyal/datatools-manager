// @flow

import update from 'immutability-helper'

import type {Action} from '../../types/actions'
import type {AdminUsersState} from '../../types/reducers'

export const defaultState = {
  data: null,
  isFetching: false,
  page: 0,
  perPage: 10,
  userCount: 0,
  userQueryString: null
}

const users = (state: AdminUsersState = defaultState, action: Action): AdminUsersState => {
  switch (action.type) {
    case 'REQUESTING_USERS':
      return update(state, {isFetching: { $set: true }})
    case 'RECEIVE_USERS':
      const {totalUserCount, users} = action.payload
      return update(state, {
        isFetching: { $set: false },
        data: { $set: users },
        userCount: { $set: totalUserCount }
      })
    case 'CREATED_USER':
      if (state.data) {
        return update(state, {data: { $push: [action.payload] }})
      }
      return state
    case 'SET_USER_PAGE':
      return update(state, {page: { $set: action.payload }})
    case 'SET_USER_PER_PAGE':
      return update(state, {perPage: { $set: action.payload }})
    case 'SET_USER_QUERY_STRING':
      return update(state, {userQueryString: { $set: action.payload }})
    default:
      return state
  }
}

export default users
