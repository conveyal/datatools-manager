// @flow

import moment from 'moment'
import React, {PureComponent, type Node} from 'react'
import {Navbar} from 'react-bootstrap'
import {Link} from 'react-router-dom'

import * as statusActions from '../../manager/actions/status'
import * as userActions from '../../manager/actions/user'
import JobMonitor from './JobMonitor'
import SidebarNavItem from './SidebarNavItem'
import SidebarPopover from './SidebarPopover'
import UserButtons from './UserButtons'
import {DEFAULT_LOGO_SMALL} from '../constants'
import {getComponentMessages, getConfigProperty} from '../util/config'

import type {Props as ContainerProps} from '../containers/ActiveSidebar'
import type {JobStatusState, ManagerUserState, AppInfo} from '../../types/reducers'

// the following three environment variables are generated via mastarm 4.3+
// we can't destructure because that won't work with the envify plugin
const buildTimestamp = process.env.BUILD_TIMESTAMP
const commit = process.env.COMMIT_SHA
const repoUrl = process.env.REPO_URL
export const POPOVER = Object.freeze({
  JOB: 'job',
  HELP: 'help',
  USER: 'user'
})

type Props = ContainerProps & {
  appInfo: AppInfo,
  children: Node,
  expanded: boolean,
  hideTutorial: boolean,
  jobMonitor: JobStatusState,
  logout: typeof userActions.logout,
  removeRetiredJob: typeof statusActions.removeRetiredJob,
  revokeToken: typeof userActions.revokeToken,
  setJobMonitorVisible: typeof statusActions.setJobMonitorVisible,
  startJobMonitor: typeof statusActions.startJobMonitor,
  user: ManagerUserState
}

type State = {visiblePopover: ?string}

export default class Sidebar extends PureComponent<Props, State> {
  messages = getComponentMessages('Sidebar')
  state = {
    visiblePopover: null
  }

  componentWillMount () {
    // Check for active jobs on mount (so that if a user reloads the page, they
    // will still know the status of jobs that had been running).
    this.props.startJobMonitor(false)
  }

  componentWillReceiveProps (nextProps: Props) {
    if (!this.props.jobMonitor.visible && nextProps.jobMonitor.visible) {
      this.setState({ visiblePopover: POPOVER.JOB })
    }
  }

  _clickLogOut = () => {
    this.setState({visiblePopover: null})
    this.props.logout()
  }

  _clickRevokeToken = () => {
    this.setState({visiblePopover: null})
    this.props.revokeToken()
  }

  _closeJobPopover = () => {
    this.props.setJobMonitorVisible(false)
    this._closePopover()
  }

  _closePopover = () => this.setState({visiblePopover: null})

  _select = (key: ?$Values<typeof POPOVER>) =>
    this.setState({visiblePopover: (key === this.state.visiblePopover) ? null : key})

  render () {
    const {
      appInfo,
      children,
      expanded,
      jobMonitor,
      removeRetiredJob,
      user
    } = this.props
    const {visiblePopover} = this.state
    const navbarStyle = {
      width: expanded ? 130 : 50,
      minHeight: '500px'
    }
    const hasActiveJobs = jobMonitor.jobs.length > 0
    return (
      <div className='Sidebar'>
        <Navbar
          inverse
          style={navbarStyle}>
          <Brand expanded={expanded === true} />
          <div className='TopNav'>
            {children}
          </div>
          <div className='BottomNav'>
            <SidebarNavItem
              ref='jobNav'
              expanded={expanded}
              icon={hasActiveJobs ? 'refresh' : 'bell'}
              loading={hasActiveJobs}
              keyName={POPOVER.JOB}
              finished={jobMonitor.jobs.length === 0 && jobMonitor.retired.length > 0}
              label='Server jobs'
              onClick={this._select} />
            <SidebarNavItem
              ref='userNav'
              expanded={expanded}
              keyName={POPOVER.USER}
              icon='user'
              label='Account'
              onClick={this._select} />
            <SidebarNavItem
              ref='settingsNav'
              keyName={POPOVER.HELP}
              expanded={expanded}
              icon='gear'
              label='Settings'
              onClick={this._select} />
          </div>
        </Navbar>

        {/* Job Monitor Popover */}
        <JobMonitor
          jobMonitor={jobMonitor}
          target={this.refs.jobNav}
          expanded={expanded}
          visible={visiblePopover === POPOVER.JOB}
          close={this._closeJobPopover}
          removeRetiredJob={removeRetiredJob} />

        {/* User Popover */}
        <SidebarPopover
          target={this.refs.userNav}
          title={user.profile ? user.profile.email : null}
          expanded={expanded}
          visible={visiblePopover === POPOVER.USER}
          close={this._closePopover}>
          <UserButtons user={user} logout={this._clickLogOut} />
        </SidebarPopover>

        {/* Settings Popover */}
        <SidebarPopover
          close={this._closePopover}
          expanded={expanded}
          target={this.refs.settingsNav}
          title='Settings'
          visible={visiblePopover === POPOVER.HELP}
          width={300}
        >
          <div>
            <div className='app-info'>
              <h5>About this app</h5>
              <table>
                <tbody>
                  <tr>
                    <td>UI Version:</td>
                    <td>
                      {commit && repoUrl
                        ? <a href={`${repoUrl}/commit/${commit}`}>{commit.slice(0, 6)}</a>
                        : this.messages('unknown')
                      }
                    </td>
                  </tr>
                  <tr>
                    <td>UI deployed at:</td>
                    <td>
                      {buildTimestamp
                        ? moment(buildTimestamp).format('LLL')
                        : this.messages('unknown')
                      }
                    </td>
                  </tr>
                  <tr>
                    <td>Server version:</td>
                    <td>
                      {appInfo && appInfo.repoUrl !== '?'
                        ? (
                          <a href={`${appInfo.repoUrl}/commit/${appInfo.commit}`}>
                            {appInfo.commit.slice(0, 6)}
                          </a>
                        )
                        : this.messages('unknown')
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </SidebarPopover>
      </div>
    )
  }
}

class Brand extends PureComponent<{expanded: boolean}> {
  render () {
    const {expanded} = this.props
    const backgroundImage = `url(${getConfigProperty('application.logo') || DEFAULT_LOGO_SMALL})`
    return (
      <Link to='/home'>
        <div className='LogoContainer'>
          <div
            style={{backgroundImage}}
            className='Logo' />
          {expanded && <div className='LogoLabel'>Data Tools</div>}
          <div className='clearfix' />
        </div>
      </Link>
    )
  }
}
