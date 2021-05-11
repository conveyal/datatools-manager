// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Row, Col, Button, Label as BsLabel, Image, ListGroupItem} from 'react-bootstrap'
import uuidv4 from 'uuid/v4'

import * as adminActions from '../actions/admin'
import ConfirmModal from '../../common/components/ConfirmModal'
import UserPermissions from '../../common/user/UserPermissions'
import {getComponentMessages} from '../../common/util/config'
import * as feedActions from '../../manager/actions/feeds'
import * as managerUserActions from '../../manager/actions/user'
import UserSettings from './UserSettings'

import type {UserProfile, Organization, Project} from '../../types'
import type {ManagerUserState} from '../../types/reducers'

// Generate random value to avoid conflicting with an existing project name/id.
const MISSING_PROJECT_VALUE = uuidv4()

type Props = {
  creatingUser: ManagerUserState,
  deleteUser: typeof adminActions.deleteUser,
  fetchProjectFeeds: typeof feedActions.fetchProjectFeeds,
  organizations: Array<Organization>,
  projects: Array<Project>,
  updateUserData: typeof managerUserActions.updateUserData,
  user: UserProfile
}

type State = {
  isEditing: boolean
}

export default class UserRow extends Component<Props, State> {
  messages = getComponentMessages('UserRow')
  state = {
    isEditing: false
  }

  toggleExpansion = () => this.setState({isEditing: !this.state.isEditing})

  cancel () {
    this.toggleExpansion()
  }

  _getOrgLabel = (permissions: UserPermissions) => {
    const {creatingUser, organizations} = this.props
    if (!organizations) return null
    const userOrganization = organizations.find(o => o.id === permissions.getOrganizationId())
    const creatorIsApplicationAdmin = creatingUser.permissions &&
      creatingUser.permissions.isApplicationAdmin()
    return userOrganization && creatorIsApplicationAdmin
      ? <BsLabel bsStyle='default'>{userOrganization.name}</BsLabel>
      : null
  }

  /**
   * Constructs label indicating user authorization level (e.g., app/org admin)
   * or listing the projects the user has access to.
   */
  _getUserPermissionLabel = (permissions: UserPermissions) => {
    const {projects} = this.props
    // Default label to no projects found.
    let labelText = this.messages('noProjectsFound')
    let missingProjectCount = 0
    let labelStyle, title
    if (permissions.isApplicationAdmin()) {
      labelStyle = 'danger'
      labelText = this.messages('appAdmin')
    } else if (permissions.canAdministerAnOrganization()) {
      labelStyle = 'warning'
      labelText = this.messages('orgAdmin')
    } else {
      const missingProjectIds = []
      // Find project names for any projects that exist.
      const projectNames = Object.keys(permissions.projectLookup)
        .map(id => {
          const project = projects.find(p => p.id === id)
          // Use name of project for label (or track missing project with uuid).
          // A missing project can occur when the same Auth0 tenant is used for
          // multiple instances of Data Tools or if a project is deleted (but
          // the permission is still attached to the user).
          if (project) return project.name
          missingProjectCount++
          missingProjectIds.push(id)
          return MISSING_PROJECT_VALUE
        })
        .filter(name => name)
      const uniqueProjectNames = Array.from(new Set(projectNames))
      // Build message based on number of projects.
      if (uniqueProjectNames.length > 0) {
        if (missingProjectCount > 0) {
          // If any missing project ids, use warning label and show in title.
          labelStyle = 'warning'
          title = `${this.messages('missingProject')}: ${missingProjectIds.join(', ')}`
        } else {
          labelStyle = 'info'
        }
        labelText = uniqueProjectNames
          // Replace uuid with missing project count message.
          .map(name => name === MISSING_PROJECT_VALUE
            ? `${missingProjectCount} ${this.messages('missingProject')}`
            : name
          )
          .join(', ')
      }
    }
    return <BsLabel title={title} bsStyle={labelStyle}>{labelText}</BsLabel>
  }

  save = () => {
    const settings = this.refs.userSettings.getSettings()
    this.props.updateUserData(this.props.user, settings)
    this.toggleExpansion()
  }

  delete = () => {
    this.refs.confirm.open({
      title: `${this.messages('delete')} ${this.props.user.email}?`,
      body: this.messages('deleteConfirm'),
      onConfirm: () => {
        this.props.deleteUser(this.props.user)
        this.toggleExpansion()
      }
    })
  }

  render () {
    const {
      creatingUser,
      user,
      organizations,
      projects,
      fetchProjectFeeds
    } = this.props
    const permissions = new UserPermissions(user.app_metadata && user.app_metadata.datatools)
    const creatorIsApplicationAdmin = creatingUser.permissions &&
      creatingUser.permissions.isApplicationAdmin()
    const creatorDoesNotHaveOrg = !creatingUser.permissions ||
      // $FlowFixMe
      !creatingUser.permissions.hasOrganization(permissions.getOrganizationId())
    // return null if creating user is not app admin and list item user is part of a different org
    if (!creatorIsApplicationAdmin && creatorDoesNotHaveOrg) {
      return null
    }
    const userEmailDataSlug = user.email.split('@')[0]

    return (
      <ListGroupItem>
        <Row className='list-group-item-heading'>
          <Col xs={4} sm={2} md={1}>
            <Image
              responsive
              rounded
              src={user.picture}
              alt={user.email} />
          </Col>
          <Col xs={8} sm={5} md={6}>
            <h5>
              {user.email}{' '}
              {this._getUserPermissionLabel(permissions)}
              {' '}
              {this._getOrgLabel(permissions)}
            </h5>
            <small />
          </Col>
          <Col xs={12} sm={5} md={5}>
            <Button
              className='pull-right'
              data-test-id={`edit-user-${userEmailDataSlug}`}
              onClick={this.toggleExpansion}
            >
              {this.state.isEditing
                ? <span><Icon type='remove' /> {this.messages('cancel')}</span>
                : <span><Icon type='edit' /> {this.messages('edit')}</span>
              }
            </Button>
            {this.state.isEditing
              ? <Button
                bsStyle='primary'
                className='pull-right'
                data-test-id={`save-user-${userEmailDataSlug}`}
                onClick={this.save}
                style={{marginRight: '5px'}}
              >
                <Icon type='save' /> {this.messages('save')}
              </Button>
              : null
            }
            {this.state.isEditing
              ? <Button
                bsStyle='danger'
                className='pull-right'
                data-test-id={`delete-user-${userEmailDataSlug}`}
                onClick={this.delete}
                style={{marginRight: '5px'}}
              >
                <Icon type='trash' /> {this.messages('delete')}
              </Button>
              : null
            }
          </Col>
        </Row>
        <ConfirmModal ref='confirm' />
        { this.state.isEditing
          ? <UserSettings ref='userSettings'
            organizations={organizations}
            projects={projects}
            creatingUser={creatingUser}
            fetchProjectFeeds={fetchProjectFeeds}
            permissions={permissions}
            userEmailDataSlug={userEmailDataSlug} />
          : ''
        }
      </ListGroupItem>
    )
  }
}
