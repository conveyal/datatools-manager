// @flow
import {createBrowserHistory} from 'history'
import createStore from 'redux-mock-store'
import thunkMiddleware from 'redux-thunk'

import {middleware as fetch} from '../fetch'

import multi from './multi'
import promise from './promise'

export const history = createBrowserHistory()

export function configureStore (rootReducer, initialState) {
  return createStore([
    fetch,
    multi,
    promise,
    thunkMiddleware
  ])(initialState)
}
