// @flow
import { connectRouter } from 'connected-react-router'
import merge from 'lodash/merge'
import {combineReducers} from 'redux'

export const getStoreConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return require('./store.production')
  } else if (process.env.NODE_ENV === 'test') {
    return require('./store.mock')
  } else {
    return require('./store.development')
  }
}

const {configureStore, history} = getStoreConfig()

export function createStore (reducers) {
  const configuredState = safeParse(process.env.STORE)
  const locallyStoredState = safeParse(window.localStorage ? window.localStorage.getItem('state') : {})
  const store = configureStore(
    combineReducers({router: connectRouter(history), ...reducers}),
    merge(configuredState, locallyStoredState)
  )
  return store
}

function safeParse (str: any) {
  try {
    return JSON.parse(str) || {}
  } catch (e) {
    return {}
  }
}
