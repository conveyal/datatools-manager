import {createBrowserHistory} from 'history'
import {routerMiddleware} from 'connected-react-router'
import {applyMiddleware, compose, createStore} from 'redux'
import {createLogger} from 'redux-logger'
import thunkMiddleware from 'redux-thunk'

import {middleware as fetch} from '../fetch'

import multi from './multi'
import promise from './promise'

const logger = createLogger({
  collapsed: true,
  duration: true
})

export const history = createBrowserHistory()

const middlewares = [
  routerMiddleware(history),
  fetch,
  multi,
  promise,
  thunkMiddleware,
  logger
]

if (process.env.LOGROCKET) {
  const LogRocket = require('logrocket')
  middlewares.push(LogRocket.reduxMiddleware())
}
// Use Redux Dev Tools to compose enhancers if available.
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
export function configureStore (rootReducer, initialState) {
  return createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(...middlewares))
  )
}
