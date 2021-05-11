// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Checkbox} from 'react-bootstrap'

import * as shapesActions from '../actions/shapes'
import {getComponentMessages} from '../../common/util/config'

import type {FetchStatus} from '../../types'
import type {Props as ContainerProps} from '../containers/ShowAllRoutesOnMapFilter'

type Props = ContainerProps & {
  fetchStatus: FetchStatus,
  showAllRoutesOnMap: boolean,
  toggleShowAllRoutesOnMap: typeof shapesActions.toggleShowAllRoutesOnMap
}

export default class ShowAllRoutesOnMapFilter extends Component<Props> {
  messages = getComponentMessages('ShowAllRoutesOnMapFilter')

  onChange = () => {
    const {toggleShowAllRoutesOnMap, version} = this.props
    toggleShowAllRoutesOnMap(version.namespace)
  }

  render () {
    const {
      fetchStatus,
      showAllRoutesOnMap,
      version
    } = this.props
    // If there are over a million records, let the user know that UI
    // performance might suffer (server should be fine). This is a somewhat
    // arbitrary limit. NL has over 4M shape records.
    const tooManyShapeRecords = version.feedLoadResult.shapes.rowCount > 1000000
    return (
      <Checkbox
        checked={showAllRoutesOnMap}
        disabled={fetchStatus.fetching}
        onChange={this.onChange}
      >
        {fetchStatus.fetching
          ? <span className='text-muted'>
            {this.messages('fetching')} <Icon className='fa-spin' type='refresh' />
          </span>
          : <span>
            {this.messages('showAllRoutesOnMap')}
            {tooManyShapeRecords && !fetchStatus.fetched &&
              <small>{' '}({this.messages('tooManyShapeRecords')})</small>
            }
          </span>
        }
      </Checkbox>
    )
  }
}
