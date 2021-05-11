// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import {Panel, ListGroup} from 'react-bootstrap'
import moment from 'moment'
import numeral from 'numeral'

import EditableTextField from '../../../common/components/EditableTextField'
import {getProfileLink} from '../../../common/util/util'
import FeedVersionDetails from './FeedVersionDetails'
import FeedVersionMap from './FeedVersionMap'
import FeedVersionTabs from './FeedVersionTabs'
import TransformationsIndicatorBadge from '../transform/TransformationsIndicatorBadge'
import VersionButtonToolbar from './VersionButtonToolbar'
import VersionRetrievalBadge from './VersionRetrievalBadge'

import type {Props as FeedVersionViewerProps} from './FeedVersionViewer'

const dateFormat = 'MMM. DD, YYYY'
const timeFormat = 'h:mma'

type Props = FeedVersionViewerProps

type State = {
  isochroneBand: number,
  tab: string
}

export default class FeedVersionReport extends Component<Props, State> {
  // TODO: move tab and isochroneBand to redux store
  state = {
    tab: 'feed',
    isochroneBand: 60 * 60
  }

  componentWillReceiveProps (nextProps: Props) {
    // Reset tab to summary when version changes
    const { version } = this.props
    if (version && nextProps.version && version.id !== nextProps.version.id) {
      this.setState({ tab: 'feed' })
    }
  }

  selectTab = (tab: string) => this.setState({tab})

  _onVersionNameChange = (value: string) => {
    this.props.renameFeedVersion(this.props.version, value)
  }

  _onChangeIsochroneBand = (value: number) => this.setState({isochroneBand: value * 60})

  render () {
    const {
      isPublic,
      version
    } = this.props
    const {
      fileSize,
      fileTimestamp,
      name,
      updated,
      user,
      validationSummary: summary
    } = version
    const versionLastModified = fileTimestamp
      ? moment(fileTimestamp).format(timeFormat + ', ' + dateFormat)
      : 'N/A'
    const userLink = user
      ? <a href={getProfileLink(user)}><strong>{user}</strong></a>
      : '[unknown]'
    const hasNoErrors = summary.loadStatus === 'SUCCESS' && summary.errorCount === 0
    return (
      <Panel
        // bsStyle='info'
        header={
          <div>
            <h4 style={{margin: '0px'}}>
              {/* Name Display / Editor */}
              {hasNoErrors
                ? (
                  <Icon
                    title='Feed loaded successfully, and is error-free!'
                    className='text-success'
                    type='check'
                    style={{marginRight: 10}}
                  />
                ) : summary.errorCount > 0 ? (
                  <Icon
                    title='Feed loaded successfully, but has errors.'
                    className='text-warning'
                    type='exclamation-triangle'
                    style={{marginRight: 10}}
                  />
                ) : (
                  <Icon
                    title='Feed did not load successfully, something has gone wrong!'
                    className='text-danger'
                    type='times'
                    style={{marginRight: 10}}
                  />
                )
              }

              {isPublic
                ? <span>{name}</span>
                : <EditableTextField
                  inline
                  value={name}
                  maxLength={26}
                  rejectEmptyValue
                  disabled={isPublic}
                  onChange={this._onVersionNameChange} />
              }
              <VersionButtonToolbar size='small' {...this.props} />
            </h4>
            <small>
              <VersionRetrievalBadge version={version} />
              <TransformationsIndicatorBadge version={version} />
              {' '}
              <span title={moment(updated).format(dateFormat + ', ' + timeFormat)}>
                Version published {moment(updated).fromNow()}
              </span>
              {' '}
              by {userLink}
            </small>
          </div>
        }
        footer={
          <span>
            <Icon type='file-archive-o' />
            {' '}
            {numeral(fileSize || 0).format('0 b')} zip file last modified at {versionLastModified}
          </span>}>
        <ListGroup fill>
          <FeedVersionMap
            {...this.props}
            isochroneBand={this.state.isochroneBand}
            tab={this.state.tab} />
          <FeedVersionDetails
            {...this.props}
            tab={this.state.tab} />
          <FeedVersionTabs
            {...this.props}
            onChangeIsochroneBand={this._onChangeIsochroneBand}
            selectTab={this.selectTab}
            isochroneBand={this.state.isochroneBand}
            tab={this.state.tab} />
        </ListGroup>
      </Panel>
    )
  }
}
