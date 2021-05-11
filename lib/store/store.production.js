import {createBrowserHistory} from 'history'
import {routerMiddleware} from 'connected-react-router'
import {applyMiddleware, createStore} from 'redux'
import thunkMiddleware from 'redux-thunk'

import {middleware as fetch} from '../fetch'

import multi from './multi'
import promise from './promise'

export const history = createBrowserHistory()

const middlewares = [
  routerMiddleware(history),
  fetch,
  multi,
  promise,
  thunkMiddleware
]

if (process.env.LOGROCKET) {
  const LogRocket = require('logrocket')
  middlewares.push(LogRocket.reduxMiddleware())
}

export function configureStore (rootReducer, initialState) {
  return createStore(
    rootReducer,
    initialState,
    applyMiddleware(...middlewares)
  )
}
