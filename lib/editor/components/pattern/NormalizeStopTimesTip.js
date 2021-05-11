// @flow

import Icon from '../../../common/components/icon'
import React, { Component } from 'react'

import { getComponentMessages } from '../../../common/util/config'

type Props = {}

export default class NormalizeStopTimesTip extends Component<Props> {
  messages = getComponentMessages('NormalizeStopTimesTip')

  render () {
    return (
      <div>
        <small>
          <Icon type='info-circle' /> {this.messages('info')}
        </small>
      </div>
    )
  }
}
