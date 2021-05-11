// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Grid, Row, Col, Button, Glyphicon, ButtonToolbar} from 'react-bootstrap'
import {LinkContainer} from 'react-router-bootstrap'

import * as userActions from '../../manager/actions/user'

import type {Props as ContainerProps} from '../containers/ActivePublicHeader'

type Props = ContainerProps & {
  logout: typeof userActions.logout,
  title: string,
  userPicture: ?string,
  username: ?string
}

type State = {
  showLogin: boolean
}

export default class PublicHeader extends Component<Props, State> {
  state = { showLogin: false }

  _onLoginClick = () => {
    this.setState({ showLogin: true })
  }

  _onLoginHide = () => {
    this.setState({ showLogin: false })
  }

  _onLogoutClick = () => {
    this.props.logout()
  }

  render () {
    const {username, userPicture} = this.props
    return (
      <Grid>
        <Row style={{marginBottom: 20, marginTop: 40}}>
          {/* Button Column */}
          <Col xs={12} style={{paddingTop: 2}}>
            <ButtonToolbar className='pull-right'>
              {/* TODO: Add Language Selector */}
              {/* "Log In" Button or User Dropdown */}
              {username
                ? (
                  <LinkContainer to='/home'>
                    <Button>
                      <span>
                        <img
                          alt='User'
                          height={20}
                          width={20}
                          src={userPicture}
                        />{' '}
                        My dashboard
                      </span>
                    </Button>
                  </LinkContainer>
                )
                : (
                  <LinkContainer to='/login'>
                    <Button
                      bsStyle='link'
                      data-test-id='header-log-in-button'
                    >
                      <Glyphicon glyph='log-in' /> Log in
                    </Button>
                  </LinkContainer>
                )
              }
              {/* "Log out" Button */}
              {username
                ? (
                  <Button bsStyle='link' onClick={this._onLogoutClick}>
                    <Icon type='sign-out' /> Log out
                  </Button>
                )
                : null}
            </ButtonToolbar>
          </Col>
        </Row>
      </Grid>
    )
  }
}
