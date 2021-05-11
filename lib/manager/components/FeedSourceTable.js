// @flow

import Icon from '../../common/components/icon'
import React, {PureComponent} from 'react'

import {Button, ListGroupItem, ListGroup, Panel} from 'react-bootstrap'

import {getComponentMessages} from '../../common/util/config'
import FeedSourceTableRow from '../containers/FeedSourceTableRow'
import ProjectFeedListToolbar from '../containers/ProjectFeedListToolbar'

import type {Props as ContainerProps} from '../containers/FeedSourceTable'
import type {Feed} from '../../types'
import type {
  FeedSourceTableComparisonColumns,
  FeedSourceTableSortStrategiesWithOrders,
  ManagerUserState
} from '../../types/reducers'

type Props = ContainerProps & {
  comparisonColumn: FeedSourceTableComparisonColumns,
  feedSources: Array<Feed>,
  filteredFeedSources: Array<Feed>,
  isFetching: boolean,
  isNotAdmin: boolean,
  sort: FeedSourceTableSortStrategiesWithOrders,
  user: ManagerUserState
}

export default class FeedSourceTable extends PureComponent<Props> {
  messages = getComponentMessages('FeedSourceTable')

  _renderTable = () => {
    const {comparisonColumn, filteredFeedSources, project} = this.props
    return (
      <table className='feed-source-table'>
        <thead>
          <tr>
            <th />
            {comparisonColumn &&
              <th className='comparison-column top-row'>
                <h4>{this.messages(`comparisonColumn.${comparisonColumn}`)}</h4>
              </th>
            }
            <th colSpan={3} className='feed-version-column top-row'>
              <h4>Latest Version</h4>
            </th>
            <th />
          </tr>
          <tr>
            <th>
              <h4>
                <Icon type='info-circle' />
                Feed Info
              </h4>
            </th>
            {comparisonColumn &&
              <th className='comparison-column'>
                <h4>
                  <Icon type='heartbeat' />
                  Status
                </h4>
              </th>
            }
            <th className='feed-version-column'>
              <h4>
                <Icon type='heartbeat' />
                Status
              </h4>
            </th>
            <th className='feed-version-column'>
              <h4>
                <Icon type='calendar-check-o' />
                Dates Valid
              </h4>
            </th>
            <th className='feed-version-column'>
              <h4>
                <Icon type='exclamation-triangle' />
                Issues
              </h4>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filteredFeedSources.map((feedSource: Feed) =>
            <FeedSourceTableRow
              key={feedSource.id || Math.random()}
              feedSource={feedSource}
              project={project}
            />
          )}
        </tbody>
      </table>
    )
  }

  render () {
    const {
      feedSources,
      filteredFeedSources,
      isFetching,
      isNotAdmin,
      onNewFeedSourceClick,
      project
    } = this.props

    return (
      <Panel
        header={
          <ProjectFeedListToolbar
            onNewFeedSourceClick={onNewFeedSourceClick}
            project={project}
          />
        }
      >
        <ListGroup fill>
          {isFetching
            ? <ListGroupItem className='text-center'>
              <Icon className='fa-2x fa-spin' type='refresh' />
            </ListGroupItem>
            : feedSources.length
              ? filteredFeedSources.length
                ? this._renderTable()
                : <ListGroupItem className='text-center'>
                  <h5>No feedsources match this filter</h5>
                </ListGroupItem>
              : <ListGroupItem className='text-center'>
                <Button
                  bsStyle='success'
                  data-test-id='create-first-feed-source-button'
                  disabled={isNotAdmin}
                  onClick={onNewFeedSourceClick}>
                  <Icon type='plus' /> {this.messages('createFirst')}
                </Button>
              </ListGroupItem>
          }
        </ListGroup>
      </Panel>
    )
  }
}
