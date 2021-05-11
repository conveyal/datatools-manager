// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {connect} from 'react-redux'
import { Panel, Modal, Row, Col, Button, FormControl, Label as BsLabel, ListGroup, ListGroupItem, Image } from 'react-bootstrap'
import validator from 'validator'

import * as organizationActions from '../actions/organizations'
import UserPermissions from '../../common/user/UserPermissions'
import {getComponentMessages} from '../../common/util/config'
import OrganizationSettings from './OrganizationSettings'

import type {Organization, UserProfile, Project} from '../../types'
import type {AppState, OrganizationsState, AdminUsersState} from '../../types/reducers'

type Props = {
  createOrganization: typeof organizationActions.createOrganization,
  deleteOrganization: typeof organizationActions.deleteOrganization,
  fetchOrganizations: typeof organizationActions.fetchOrganizations,
  organizations: OrganizationsState,
  projects: Array<Project>,
  updateOrganization: typeof organizationActions.updateOrganization,
  users: AdminUsersState
}

type State = {
  showModal?: boolean
}

class OrganizationList extends Component<Props, State> {
  messages = getComponentMessages('OrganizationList')
  state = {}

  componentWillMount () {
    this.props.fetchOrganizations()
  }

  showModal = () => this.setState({showModal: true})

  close = () => this.setState({showModal: false})

  save = () => {
    const settings = this.refs.orgSettings.getSettings()
    if (settings) {
      this.props.createOrganization(settings)
      this.close()
    } else {
      window.alert('Must provide organization name.')
    }
  }

  render () {
    const { organizations, users } = this.props
    return (
      <div>
        <Panel
          header={
            <Row>
              <Col xs={10} className='form-inline'>
                {/* TODO: connect this up to filter */}
                <FormControl type='text'
                  ref='searchInput'
                  placeholder={this.messages('search')} />
              </Col>
              <Col xs={2}>
                <Button
                  onClick={this.showModal}
                  bsStyle='primary'>
                  <Icon type='plus' />{' '}
                  {this.messages('new')}
                </Button>
              </Col>
            </Row>
          }>
          <ListGroup fill>
            {organizations.isFetching
              ? <ListGroupItem style={{ fontSize: '18px', textAlign: 'center' }}>
                <Icon className='fa-2x fa-spin' type='refresh' />
              </ListGroupItem>
              : organizations.data && organizations.data.map((organization, i) => {
                const orgUsers = users.data ? users.data.filter(u => {
                  const permissions = new UserPermissions(u.app_metadata && u.app_metadata.datatools)
                  return permissions.getOrganizationId() === organization.id
                }) : []
                return (
                  <OrganizationRow
                    {...this.props}
                    organization={organization}
                    key={i}
                    orgUsers={orgUsers} />
                )
              })
            }
          </ListGroup>
        </Panel>
        <Modal
          show={this.state.showModal}
          onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Create Organization</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <OrganizationSettings
              {...this.props}
              ref='orgSettings' />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={this.save}>
              {this.messages('new')}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

class OrganizationRow extends Component<Props & {
  orgUsers: Array<UserProfile>,
  organization: Organization
},
{isEditing: boolean}> {
  state = {
    isEditing: false
  }

  toggleExpansion = () => {
    this.setState({
      isEditing: !this.state.isEditing
    })
  }

  cancel () {
    this.toggleExpansion()
  }

  save = () => {
    const settings = this.refs.orgSettings.getSettings()
    this.props.updateOrganization(this.props.organization, settings)
    this.toggleExpansion()
  }

  delete = () => {
    this.props.deleteOrganization(this.props.organization)
    this.toggleExpansion()
  }
  render () {
    const {
      organization,
      orgUsers
    } = this.props
    return (
      <ListGroupItem
        header={
          <Row>
            <Col xs={4} sm={2} md={1}>
              <Image
                responsive rounded
                src={organization.logoUrl && validator.isURL(organization.logoUrl, {protocol: 'https'}) ? organization.logoUrl : `http://placehold.it/60x60?text=${organization.name.substr(0, 3)}`}
                alt={organization.name} />
            </Col>
            <Col xs={8} sm={5} md={6}>
              <h5>
                {organization.name}{' '}
                {orgUsers.length ? <BsLabel>{orgUsers.length} users</BsLabel> : null}
              </h5>
              <small />
            </Col>
            <Col xs={12} sm={5} md={5}>
              <Button
                className='pull-right'
                onClick={this.toggleExpansion}>
                {this.state.isEditing
                  ? <span><Icon type='remove' /> Cancel</span>
                  : <span><Icon type='edit' /> Edit</span>
                }
              </Button>
              {this.state.isEditing
                ? <Button
                  className='pull-right'
                  bsStyle='primary'
                  style={{marginRight: '5px'}}
                  onClick={this.save}>
                  <Icon type='save' /> Save
                </Button>
                : null
              }
              {this.state.isEditing
                ? <Button
                  className='pull-right'
                  bsStyle='danger'
                  style={{marginRight: '5px'}}
                  onClick={this.delete}>
                  <Icon type='trash' /> Delete
                </Button>
                : null
              }
            </Col>
          </Row>
        }
      >
        { this.state.isEditing
          ? <OrganizationSettings
            {...this.props}
            ref='orgSettings' />
          : ''
        }
      </ListGroupItem>
    )
  }
}

const mapStateToProps = (state: AppState, ownProps: {}) => {
  return {
    projects: state.projects.all,
    users: state.admin.users,
    organizations: state.admin.organizations
  }
}

const {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization
} = organizationActions

const mapDispatchToProps = {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization
}

export default connect(mapStateToProps, mapDispatchToProps)(OrganizationList)
