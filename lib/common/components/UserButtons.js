// @flow

import React, { Component } from 'react'
import { Button, ButtonToolbar } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import Icon from '../../common/components/icon'

import type {ManagerUserState} from '../../types/reducers'

type Props = {
  logout: () => any,
  user: ManagerUserState
}

/**
 *  A common component containing buttons for standard user actions: "My
 *  Account", "Site Admin", and "Logout"
 */
export default class UserButtons extends Component<Props> {
  render () {
    const { logout, user } = this.props
    const buttonStyle = { margin: 2 }
    const isSiteAdmin = user.permissions && user.permissions.isApplicationAdmin() &&
      user.permissions.canAdministerAnOrganization()
    return (
      <ButtonToolbar>
        <LinkContainer to='/settings/profile'>
          <Button bsSize='small' style={buttonStyle}>
            <Icon type='user' /> My account
          </Button>
        </LinkContainer>
        {isSiteAdmin && (
          <LinkContainer to='/admin/users'>
            <Button
              bsSize='small'
              style={buttonStyle}
            >
              <Icon type='cog' /> Admin
            </Button>
          </LinkContainer>
        )}
        <Button
          style={buttonStyle}
          bsSize='small'
          bsStyle='primary'
          onClick={logout}>
          <Icon type='sign-out' /> Log out
        </Button>
      </ButtonToolbar>
    )
  }
}
