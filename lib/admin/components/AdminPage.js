// @flow

import {connect} from 'react-redux'
import Icon from '../../common/components/icon'
import * as React from 'react'
import {
  Grid,
  Row,
  Col,
  Panel,
  ListGroup,
  ListGroupItem,
  Button
} from 'react-bootstrap'
import { push } from 'connected-react-router'
import {LinkContainer} from 'react-router-bootstrap'

import * as adminActions from '../actions/admin'
import * as organizationActions from '../actions/organizations'
import ApplicationStatus from './ApplicationStatus'
import ManagerPage from '../../common/components/ManagerPage'
import {getComponentMessages, isModuleEnabled} from '../../common/util/config'
import * as projectActions from '../../manager/actions/projects'
import OrganizationList from './OrganizationList'
import ServerSettings from './ServerSettings'
import UserList from './UserList'

import type {Project} from '../../types'
import type {AppState, ManagerUserState, RouterProps} from '../../types/reducers'

type Props = RouterProps & {
  activeComponent: string,
  fetchOrganizations: typeof organizationActions.fetchOrganizations,
  fetchProjects: typeof projectActions.fetchProjects,
  fetchServers: typeof adminActions.fetchServers,
  fetchUsers: typeof adminActions.fetchUsers,
  projects: Array<Project>,
  user: ManagerUserState
}

class AdminPage extends React.Component<Props> {
  messages = getComponentMessages('AdminPage')

  componentWillMount () {
    const {
      activeComponent,
      fetchUsers,
      fetchProjects,
      fetchOrganizations,
      fetchServers
    } = this.props
    // Set default path to user admin view.
    if (!activeComponent) push('/admin/users')
    // Always load a fresh list of users on load.
    fetchUsers()
    // Always load projects to prevent interference with public feeds viewer
    // loading of projects.
    fetchProjects()
    // Load orgs because they're needed both in org and user creation.
    fetchOrganizations()
    // Load servers if deployments are enabled.
    if (isModuleEnabled('deployment')) fetchServers()
  }

  _getMainContent = (isApplicationAdmin: boolean): React.Node => {
    const {activeComponent} = this.props
    const restricted = <p className='text-center lead'>Restricted access</p>
    switch (activeComponent) {
      case 'users': return <UserList />
      case 'organizations':
        if (!isApplicationAdmin || isModuleEnabled('enterprise')) return restricted
        else return <OrganizationList />
      case 'logs':
        return <ApplicationStatus />
      case 'servers':
        if (!isApplicationAdmin || !isModuleEnabled('deployment')) return restricted
        return <ServerSettings editDisabled={false} />
      default:
        return null
    }
  }

  _createLink = (to: string, label: string) =>
    ({to, children: <ListGroupItem>{label}</ListGroupItem>})

  _getLinks = (isApplicationAdmin: boolean): React.Node[] => {
    const links = [this._createLink('/admin/users', 'User management')]
    // Do not show non-appAdmin users these application-level settings
    if (isApplicationAdmin) {
      if (!isModuleEnabled('enterprise')) {
        links.push(this._createLink('/admin/organizations', 'Organizations'))
      }
      links.push(this._createLink('/admin/logs', 'Application logs'))
      if (isModuleEnabled('deployment')) {
        links.push(this._createLink('/admin/servers', 'Deployment servers'))
      }
    }
    return links.map(link => (<LinkContainer key={link.to} {...link} />))
  }

  render () {
    const { user } = this.props
    const permissions = user && user.permissions
    const isAdmin = permissions &&
      (
        permissions.isApplicationAdmin() ||
        permissions.canAdministerAnOrganization()
      )
    const isApplicationAdmin = !!(permissions && permissions.isApplicationAdmin())
    return (
      <ManagerPage
        ref='page' forwardRef
        title={this.messages('title')}>
        <Grid>
          <Row style={{ marginBottom: '18px' }}>
            <Col xs={12}>
              <h2>
                <LinkContainer className='pull-right' to='/home'>
                  <Button>
                    Back to dashboard
                  </Button>
                </LinkContainer>
                <Icon type='cog' /> {this.messages('title')}
              </h2>
            </Col>
          </Row>
          <Row>
            {isAdmin
              ? <div>
                <Col xs={12} sm={3}>
                  <Panel>
                    <ListGroup fill>
                      {this._getLinks(isApplicationAdmin)}
                    </ListGroup>
                  </Panel>
                </Col>
                <Col xs={12} sm={9}>
                  {this._getMainContent(isApplicationAdmin)}
                </Col>
              </div>
              : <div>
                {user
                  ? <p>{this.messages('noAccess')}</p>
                  : <h1
                    className='text-center'
                    style={{ marginTop: '150px' }}>
                    <Icon className='fa-spin fa-5x' type='refresh' />
                  </h1>
                }
              </div>
            }
          </Row>
        </Grid>
      </ManagerPage>
    )
  }
}

const mapStateToProps = (state: AppState, ownProps: RouterProps) => {
  return {
    activeComponent: ownProps.routeParams.subpage,
    user: state.user
  }
}

const {fetchServers, fetchUsers} = adminActions
const {fetchOrganizations} = organizationActions
const {fetchProjects} = projectActions

const mapDispatchToProps = {
  fetchOrganizations,
  fetchProjects,
  fetchServers,
  fetchUsers
}

export default connect(mapStateToProps, mapDispatchToProps)(AdminPage)
