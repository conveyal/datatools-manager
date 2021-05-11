// @flow

import update from 'immutability-helper'
import { getUserMetadataProperty } from '../../common/util/user'

import type {UiState} from '../../types/reducers'

export const defaultState = {
  sidebarExpanded: true,
  hideTutorial: false
}

const ui = (state: UiState = defaultState, action: any): UiState => {
  switch (action.type) {
    case 'USER_LOGGED_IN':
      const hideTutorial = getUserMetadataProperty(action.profile, 'hideTutorial')
      const sidebarExpanded = getUserMetadataProperty(action.profile, 'sidebarExpanded')
      return update(state, {
        sidebarExpanded: { $set: sidebarExpanded },
        hideTutorial: { $set: hideTutorial }
      })
    case 'SETTING_TUTORIAL_VISIBILITY':
      return update(state, { hideTutorial: { $set: action.value } })
    case 'SETTING_SIDEBAR_EXPANDED':
      return update(state, { sidebarExpanded: { $set: action.payload } })
    default:
      return state
  }
}

export default ui
