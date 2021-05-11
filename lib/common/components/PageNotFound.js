// @flow

import * as React from 'react'
import {connect} from 'react-redux'
import {Grid, Row, Col} from 'react-bootstrap'

import ManagerPage from './ManagerPage'
import PublicPage from '../../public/components/PublicPage'
import {Link} from 'react-router-dom'

import type {AppState, ManagerUserState, RouterProps} from '../../types/reducers'

type Props = {message?: string, user: ManagerUserState}

class PageNotFound extends React.Component<Props> {
  static defaultProps = {
    message: 'Page Not Found.'
  }

  render () {
    const {message, user} = this.props
    // Return content in public wrapper or manager app wrapper depending on
    // whether user logged in.
    const component = user.profile ? ManagerPage : PublicPage
    return React.createElement(component, {ref: 'page'},
      <Grid>
        <Row>
          <Col xs={12}>
            <h1>{message}</h1>
            <p>
              Go to{' '}
              <Link to={`/${user.profile ? 'home' : ''}`}>home page</Link>
            </p>
          </Col>
        </Row>
      </Grid>
    )
  }
}

// If component is used in Router, it will contain RouterProps (otherwise, it
// will have none).
type ContainerProps = {} | RouterProps

const mapStateToProps = (state: AppState, ownProps: ContainerProps) => {
  return {
    user: state.user
  }
}

const mapDispatchToProps = {}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PageNotFound)
