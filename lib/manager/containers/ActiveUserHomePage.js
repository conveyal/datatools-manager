// @flow

import {connect} from 'react-redux'
import { matchPath } from 'react-router'

import {logout, onUserHomeMount} from '../actions/user'
import {fetchProjectFeeds} from '../actions/feeds'
import {setVisibilitySearchText, setVisibilityFilter} from '../actions/visibilityFilter'
import UserHomePage from '../components/UserHomePage'

import type {AppState, RouterProps} from '../../types/reducers'

export type Props = RouterProps

const mapStateToProps = (state: AppState, ownProps: Props) => {
  const {projects, user} = state
  // react-router now requires getting params via this approach:
  // https://github.com/ReactTraining/react-router/issues/5870#issuecomment-394194338
  const match = matchPath(ownProps.history.location.pathname, {
    path: '/home/:projectId',
    exact: true,
    strict: false
  })
  const {projectId} = match.params
  return {
    user,
    projects: projects.all
      ? projects.all.filter(p => p.isCreating ||
        (user.permissions && user.permissions.isApplicationAdmin()) ||
        (user.permissions && user.permissions.hasProject(p.id, p.organizationId)))
      : [],
    project: projectId && projects.all
      ? projects.all.find(p => p.id === projectId)
      : null,
    projectId,
    visibilityFilter: projects.filter
  }
}

const mapDispatchToProps = {
  fetchProjectFeeds,
  logout,
  onUserHomeMount,
  setVisibilityFilter,
  setVisibilitySearchText
}

const ActiveUserHomePage = connect(
  mapStateToProps,
  mapDispatchToProps
)(UserHomePage)

export default ActiveUserHomePage
