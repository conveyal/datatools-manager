// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {connect} from 'react-redux'
import {
  Button,
  ButtonGroup,
  Col,
  DropdownButton,
  InputGroup,
  FormControl,
  ListGroup,
  ListGroupItem,
  Panel,
  Row
} from 'react-bootstrap'

import * as adminActions from '../actions/admin'
import MenuItem from '../../common/components/MenuItem'
import {getComponentMessages} from '../../common/util/config'
import CreateUser from './CreateUser'
import * as feedActions from '../../manager/actions/feeds'
import * as managerUserActions from '../../manager/actions/user'
import UserRow from './UserRow'

import type {Organization, Project, UserProfile} from '../../types'
import type {AppState, ManagerUserState} from '../../types/reducers'

type Props = {
  createUser: typeof adminActions.createUser,
  creatingUser: ManagerUserState,
  deleteUser: typeof adminActions.deleteUser,
  fetchProjectFeeds: typeof feedActions.fetchProjectFeeds,
  fetchUsers: typeof adminActions.fetchUsers,
  isFetching: boolean,
  organizations: Array<Organization>,
  page: number,
  perPage: number,
  projects: Array<Project>,
  setUserPage: typeof adminActions.setUserPage,
  setUserPerPage: typeof adminActions.setUserPerPage,
  setUserQueryString: typeof adminActions.setUserQueryString,
  token: string,
  updateUserData: typeof managerUserActions.updateUserData,
  userCount: number,
  users: Array<UserProfile>
}

type State = {
  searchText: string
}

class UserList extends Component<Props, State> {
  messages = getComponentMessages('UserList')
  state = {
    searchText: ''
  }

  _clearSearch = () => {
    this.setState({searchText: ''})
    this._userSearch()
  }

  _decrementPage = () => {
    this._setPage(this.props.page - 1)
  }

  _incrementPage = () => {
    this._setPage(this.props.page + 1)
  }

  _onSearchTextChange = (e: SyntheticInputEvent<HTMLInputElement>) =>
    this.setState({searchText: e.target.value})

  _onSearchTextKeyUp = (e: SyntheticKeyboardEvent<HTMLInputElement>) => {
    switch (e.keyCode) {
      case 13: // ENTER
        return this._userSearch()
      default:
        break
    }
  }

  _setPage (pageNumber: number) {
    const {fetchUsers, setUserPage} = this.props
    setUserPage(pageNumber)
    fetchUsers()
  }

  _setUserPerPage = (perPage: number) => {
    const {fetchUsers, setUserPerPage} = this.props
    setUserPerPage(perPage)
    fetchUsers()
  }

  _userSearch = () => {
    const {fetchUsers, setUserPage, setUserQueryString} = this.props
    setUserPage(0)
    setUserQueryString(this.state.searchText || '')
    fetchUsers()
  }

  render () {
    const {
      createUser,
      creatingUser,
      deleteUser,
      fetchProjectFeeds,
      isFetching,
      organizations,
      page,
      perPage,
      projects,
      token,
      updateUserData,
      userCount,
      users
    } = this.props
    const headerStyle = {
      fontSize: '18px',
      marginLeft: '12px'
    }

    const minUserIndex = (page * perPage) + 1
    const maxUserIndex = Math.min((page + 1) * perPage, userCount)
    const maxPage = Math.ceil(userCount / perPage) - 1
    // const isApplicationAdmin = creatingUser.permissions.isApplicationAdmin()
    // const orgToOption = organization => ({organization, value: organization.id, label: organization.name})
    return (
      <div>
        <Row style={{ marginBottom: '18px' }}>
          <Col xs={12}>
            <ButtonGroup>
              <Button
                disabled={page <= 0}
                onClick={this._decrementPage}>
                <Icon type='arrow-left' />
              </Button>
              <Button
                disabled={page >= maxPage}
                onClick={this._incrementPage}>
                <Icon type='arrow-right' />
              </Button>
            </ButtonGroup>
            {userCount > 0
              ? <span style={headerStyle}>
                {this.messages('showing')}{' '}
                {minUserIndex } - {maxUserIndex}{' '}
                {this.messages('of')} {userCount}
              </span>
              : <span style={headerStyle}>(No results to show)</span>
            }
            <div className='pull-right'>
              {this.messages('perPage')}{' '}
              <DropdownButton
                id='per-page-dropdown'
                title={perPage}
                onSelect={this._setUserPerPage}>
                {// Render users per page options.
                  [10, 25, 50, 100].map(val =>
                    <MenuItem selected={val === perPage} key={`option-${val}`} eventKey={val}>
                      {val}
                    </MenuItem>
                  )
                }
              </DropdownButton>
            </div>
          </Col>
        </Row>
        <Panel
          header={
            <Row>
              <Col xs={10} className='form-inline'>
                <InputGroup ref='foo'>
                  <FormControl
                    data-test-id='search-user-input'
                    onChange={this._onSearchTextChange}
                    onKeyUp={this._onSearchTextKeyUp}
                    placeholder={this.messages('search')}
                    value={this.state.searchText}
                    type='text'
                  />
                  <InputGroup.Button>
                    <Button
                      onClick={this._clearSearch}>
                      <Icon type='remove' />
                    </Button>
                    <Icon
                      type='remove'
                      style={{ cursor: 'pointer' }}
                      onClick={this._clearSearch} />
                  </InputGroup.Button>
                </InputGroup>
                <Button
                  data-test-id='submit-user-search-button'
                  onClick={this._userSearch}
                  style={{marginLeft: '8px'}}
                >
                  <Icon type='refresh' />
                </Button>
                {/* TODO: add filter for organization */}
                {/* isApplicationAdmin &&
                  <FormGroup style={{marginLeft: '8px', width: '200px'}}>
                    <Select
                      value={this.state.organization && orgToOption(this.state.organization)}
                      options={organizations.map(orgToOption)}
                      onChange={value => this.setState({organization: value ? value.organization : null})}
                      placeholder={this.messages('filterByOrg')} />
                  </FormGroup>
                */}
              </Col>
              <Col xs={2}>
                <CreateUser
                  projects={projects}
                  organizations={organizations}
                  creatingUser={creatingUser}
                  fetchProjectFeeds={fetchProjectFeeds}
                  createUser={createUser.bind(this)} />
              </Col>
            </Row>
          }>
          <ListGroup
            data-test-id='user-list'
            fill
          >
            {isFetching
              ? <ListGroupItem style={{ fontSize: '18px', textAlign: 'center' }}>
                <Icon className='fa-2x fa-spin' type='refresh' />
              </ListGroupItem>
              : users.map((user, i) => {
                return <UserRow
                  creatingUser={creatingUser}
                  deleteUser={deleteUser}
                  fetchProjectFeeds={fetchProjectFeeds}
                  key={i}
                  organizations={organizations}
                  projects={projects}
                  token={token}
                  updateUserData={updateUserData}
                  user={user}
                />
              })
            }
          </ListGroup>
        </Panel>
      </div>
    )
  }
}

const mapStateToProps = (state: AppState, ownProps: {}) => {
  const {isFetching, data: users, page, perPage, userCount} = state.admin.users
  const {data: organizations} = state.admin.organizations
  return {
    creatingUser: state.user,
    isFetching,
    organizations,
    page,
    perPage,
    projects: state.projects.all,
    token: state.user.token || 'token-invalid',
    userCount,
    users
  }
}

const {fetchProjectFeeds} = feedActions
const {updateUserData} = managerUserActions
const {
  createUser,
  deleteUser,
  fetchUsers,
  setUserPage,
  setUserPerPage,
  setUserQueryString
} = adminActions

const mapDispatchToProps = {
  createUser,
  deleteUser,
  fetchProjectFeeds,
  fetchUsers,
  setUserPage,
  setUserPerPage,
  setUserQueryString,
  updateUserData
}

export default connect(mapStateToProps, mapDispatchToProps)(UserList)
