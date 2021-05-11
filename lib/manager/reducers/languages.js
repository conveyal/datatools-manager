// @flow

import update from 'immutability-helper'
import { getConfigProperty } from '../../common/util/config'

import type {Action} from '../../types/actions'
import type {DataToolsConfig} from '../../types'
import type {LanguagesState} from '../../types/reducers'

export const defaultState = {
  all: getConfigProperty('messages.all'),
  // set active default to english
  active: getConfigProperty('messages.active')
}

const languages = (state: LanguagesState = defaultState, action: Action): LanguagesState => {
  let languageIndex
  switch (action.type) {
    case 'SET_ACTIVE_LANGUAGE':
      const language = action.payload
      languageIndex = state.all.findIndex(l => l.id === language)
      const CONFIG: DataToolsConfig = window.DT_CONFIG
      CONFIG.messages.active = state.all[languageIndex]
      window.localStorage.setItem('lang', language)
      return update(state, {active: { $set: state.all[languageIndex] }})
    default:
      return state
  }
}

export default languages
