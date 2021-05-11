// @flow

import React from 'react'
import {render} from 'react-dom'
import {Provider} from 'react-redux'

import admin from './admin/reducers'
import alerts from './alerts/reducers'
import App from './common/containers/App'
import editor from './editor/reducers'
import gtfs from './gtfs/reducers'
import * as gtfsPlusReducers from './gtfsplus/reducers'
import * as managerReducers from './manager/reducers'

import {createStore, getStoreConfig} from './store'

if (process.env.LOGROCKET) {
  const LogRocket = require('logrocket')
  LogRocket.init(process.env.LOGROCKET)
}
const reducers = {
  ...managerReducers,
  admin,
  alerts,
  ...gtfsPlusReducers,
  editor,
  gtfs
}
const store = createStore(reducers)
const {history} = getStoreConfig()
render(
  <Provider store={store}>
    <App history={history} store={store} />
  </Provider>,
  document.getElementById('root')
)
