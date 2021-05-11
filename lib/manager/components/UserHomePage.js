// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Grid, Row, Col, Button, ButtonToolbar, Jumbotron} from 'react-bootstrap'
import objectPath from 'object-path'

import * as feedsActions from '../actions/feeds'
import * as userActions from '../actions/user'
import * as visibilityFilterActions from '../actions/visibilityFilter'
import ManagerPage from '../../common/components/ManagerPage'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../../common/constants'
import {getConfigProperty} from '../../common/util/config'
import {defaultSorter} from '../../common/util/util'
import RecentActivityBlock from './RecentActivityBlock'
import UserAccountInfoPanel from './UserAccountInfoPanel'
import FeedSourcePanel from './FeedSourcePanel'
import HomeProjectDropdown from './HomeProjectDropdown'

import type {Props as ContainerProps} from '../containers/ActiveUserHomePage'
import type {Project} from '../../types'
import type {ManagerUserState, ProjectFilter} from '../../types/reducers'

type Props = ContainerProps & {
  fetchProjectFeeds: typeof feedsActions.fetchProjectFeeds,
  logout: typeof userActions.logout,
  onUserHomeMount: typeof userActions.onUserHomeMount,
  project: Project,
  projectId: string,
  projects: Array<Project>,
  setVisibilityFilter: typeof visibilityFilterActions.setVisibilityFilter,
  setVisibilitySearchText: typeof visibilityFilterActions.setVisibilitySearchText,
  user: ManagerUserState,
  visibilityFilter: ProjectFilter
}

type State = {
  showLoading: boolean
}

const sortByDate = (a, b) => {
  if (a.date < b.date) return 1
  if (a.date > b.date) return -1
  return 0
}

export default class UserHomePage extends Component<Props, State> {
  state = {
    showLoading: false
  }

  componentWillMount () {
    const {onUserHomeMount, projectId, user} = this.props
    onUserHomeMount(user, projectId)
  }

  componentWillReceiveProps (nextProps: Props) {
    const nextId = objectPath.get(nextProps, 'project.id')
    const id = objectPath.get(this.props, 'project.id')
    if (nextId && nextId !== id && !nextProps.project.feedSources) {
      this.props.fetchProjectFeeds(nextProps.project.id)
    }
  }

  componentWillUnmount () {
    this.setState({showLoading: true})
  }

  render () {
    const {
      projects,
      project,
      user,
      logout,
      visibilityFilter,
      setVisibilitySearchText,
      setVisibilityFilter
    } = this.props
    const visibleProjects = projects.sort(defaultSorter)
    const activeProject = project
    return (
      <ManagerPage
        title={project ? `Home (${project.name})` : 'Home'}
        ref='page' forwardRef>
        <Grid fluid>
          {this.state.showLoading ? <Icon className='fa-5x fa-spin' type='refresh' /> : null}
          <Row>
            <Col md={8} xs={12}>
              {/* Top Welcome Box */}
              <Jumbotron style={{ padding: 30 }}>
                <h2>Welcome to {getConfigProperty('application.title') || DEFAULT_TITLE}!</h2>
                <p>{getConfigProperty('application.description') || DEFAULT_DESCRIPTION}</p>
                <ButtonToolbar>
                  <Button
                    bsStyle='primary'
                    bsSize='large'
                    href={getConfigProperty('application.docs_url')}>
                    <Icon type='info-circle' /> User docs
                  </Button>
                </ButtonToolbar>
              </Jumbotron>
              {/* Recent Activity List */}
              <h3 style={{ marginTop: 0, paddingBottom: 5, borderBottom: '2px solid #ddd' }}>
                <Icon type='comments-o' /> Recent Activity
              </h3>
              {user.recentActivity && user.recentActivity.length
                ? user.recentActivity.sort(sortByDate).map((item, k) => {
                  return <RecentActivityBlock item={item} key={k} currentUser={user} />
                })
                : <span>No Recent Activity for your subscriptions.</span>
              }
            </Col>
            <Col md={4} xs={12}>
              <UserAccountInfoPanel
                user={user}
                // organization={organization}
                logout={logout} />
              <HomeProjectDropdown
                activeProject={activeProject}
                user={user}
                visibleProjects={visibleProjects} />
              <FeedSourcePanel
                activeProject={activeProject}
                visibilityFilter={visibilityFilter}
                setVisibilitySearchText={setVisibilitySearchText}
                setVisibilityFilter={setVisibilityFilter}
                user={user} />
            </Col>
          </Row>
        </Grid>
      </ManagerPage>
    )
  }
}
