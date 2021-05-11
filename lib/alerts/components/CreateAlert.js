// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Button } from 'react-bootstrap'

import * as alertActions from '../actions/alerts'

type Props = {
  createAlert: typeof alertActions.createAlert,
  disabled: boolean,
  fetched: boolean
}

export default class CreateAlert extends Component<Props> {
  render () {
    const {
      createAlert,
      disabled,
      fetched
    } = this.props
    const createDisabled = disabled != null
      ? disabled || !fetched
      : false
    return (
      <Button
        bsStyle='primary'
        bsSize='large'
        style={{marginTop: '-8px'}}
        disabled={createDisabled}
        onClick={createAlert}
        className='pull-right'>
        {fetched
          ? 'New Alert'
          : <span>
            Fetching alerts{' '}
            <Icon className='fa-spin' type='refresh' />
          </span>
        }
      </Button>
    )
  }
}
