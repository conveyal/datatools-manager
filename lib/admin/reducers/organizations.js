// @flow

import update from 'immutability-helper'

import type {Action} from '../../types/actions'
import type {OrganizationsState} from '../../types/reducers'

export const defaultState = {
  isFetching: false,
  data: null,
  userQueryString: null
}

const organizations = (
  state: OrganizationsState = defaultState,
  action: Action
): OrganizationsState => {
  switch (action.type) {
    case 'REQUESTING_ORGANIZATIONS':
      return update(state, {isFetching: { $set: true }})
    case 'RECEIVE_ORGANIZATIONS':
      return update(state, {
        isFetching: { $set: false },
        data: { $set: action.payload }
      })
    case 'CREATED_ORGANIZATION':
      if (state.data) {
        return update(state, {data: { $push: [action.payload] }})
      }
      return state
    default:
      return state
  }
}

export default organizations
