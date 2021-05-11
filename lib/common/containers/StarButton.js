// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Button} from 'react-bootstrap'
import {connect} from 'react-redux'

import {getComponentMessages} from '../util/config'
// $FlowFixMe FIXME action no longer present in user actions
import {updateStar} from '../../manager/actions/user'

import type {dispatchFn, ManagerUserState} from '../../types/reducers'

type Props = {
  dispatch: dispatchFn,
  isStarred: boolean,
  target: string,
  user: ManagerUserState
}

class StarButton extends Component<Props> {
  messages = getComponentMessages('StarButton')

  _onClick = () => {
    const {dispatch, isStarred, user, target} = this.props
    dispatch(updateStar(user.profile, target, !isStarred))
  }

  render () {
    const {isStarred} = this.props

    return (
      <Button
        onClick={this._onClick}>
        {isStarred
          ? <span><Icon type='star-o' /> {this.messages('unstar')}</span>
          : <span><Icon type='star' /> {this.messages('star')}</span>
        }
      </Button>
    )
  }
}

export default connect()(StarButton)
