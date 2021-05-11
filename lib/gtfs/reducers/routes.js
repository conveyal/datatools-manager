// @flow

import update from 'immutability-helper'

import {getEntityName} from '../../editor/util/gtfs'

import type {Action} from '../../types/actions'
import type {RoutesState} from '../../types/reducers'

export const defaultState = {
  allRoutes: {
    fetchStatus: {
      fetched: false,
      fetching: false,
      error: false
    },
    data: []
  },
  routeDetails: {
    fetchStatus: {
      fetched: false,
      fetching: false,
      error: false
    },
    data: null
  }
}

export default function reducer (
  state: RoutesState = defaultState,
  action: Action
): RoutesState {
  switch (action.type) {
    case 'SET_ACTIVE_FEEDVERSION':
      return defaultState
    case 'FETCH_GRAPHQL_ROUTES':
      return update(state, {
        allRoutes: {
          $set: {
            fetchStatus: {
              fetched: false,
              fetching: true,
              error: false
            },
            data: []
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTES_REJECTED':
      return update(state, {
        allRoutes: {
          fetchStatus: {
            $set: {
              fetched: false,
              fetching: false,
              error: true
            }
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTES_FULFILLED':
      return update(state, {
        allRoutes: {
          $set: {
            fetchStatus: {
              fetched: true,
              fetching: false,
              error: false
            },
            data: action.payload.map(route => {
              return {
                ...route,
                route_name: getEntityName(route)
              }
            })
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTE_DETAILS':
      return update(state, {
        routeDetails: {
          $set: {
            fetchStatus: {
              fetched: false,
              fetching: true,
              error: false
            },
            data: null
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTE_DETAILS_REJECTED':
      return update(state, {
        routeDetails: {
          fetchStatus: {
            $set: {
              fetched: false,
              fetching: false,
              error: true
            }
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTE_DETAILS_FULFILLED':
      return update(state, {
        routeDetails: {
          $set: {
            fetchStatus: {
              fetched: true,
              fetching: false,
              error: false
            },
            data: action.payload
          }
        }
      })
    case 'UPDATE_GTFS_DATETIME_FILTER':
      if (action.payload.hasOwnProperty('date')) {
        return update(state, {
          routeDetails: {
            $set: {
              fetchStatus: {
                fetched: false,
                fetching: false,
                error: false
              },
              data: null
            }
          }
        })
      } else {
        return state
      }
    default:
      return state
  }
}
