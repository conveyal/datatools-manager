// @flow

import update from 'immutability-helper'

import {getEntityGraphQLRoot, getEntityIdField} from '../../gtfs/util'

import type {Action} from '../../types/actions'
import type {ValidationState} from '../../types/reducers'

export const defaultState = {
  fetchStatus: {
    fetched: false,
    fetching: false,
    error: false
  },
  data: {}
}

export default function reducer (
  state: ValidationState = defaultState,
  action: Action
): ValidationState {
  switch (action.type) {
    case 'SET_ACTIVE_FEEDVERSION':
      return defaultState
    // TODO: Refactor how validation data is stored for feed version? Currently,
    // this is stored in the projects reducer (project.feedSource.feedVersion),
    // which is a bit cumbersome, but would require quite a bit of effort to
    // refactor.
    // case 'RECEIVE_VALIDATION_ISSUE_COUNT': {
    //   const {feedVersion, validationIssueCount} = action.payload
    //   return update(state, {
    //     validationIssueCount: {$set: validationIssueCount}
    //   })
    // }
    case 'RECEIVE_GTFS_ENTITIES':
      const {data, editor, component} = action.payload
      if (editor) {
        // Ignore entity fetches for the editor
        return state
      }
      const entities = data.feed[getEntityGraphQLRoot(component)]
      const lookup = {}
      entities.forEach(entity => {
        const id = entity[getEntityIdField(component)]
        lookup[`${component}:${id}`] = entity
      })
      return update(state, {
        data: {$merge: lookup}
      })
    default:
      return state
  }
}
