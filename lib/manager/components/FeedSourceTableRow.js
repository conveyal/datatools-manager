// @flow

import Icon from '../../common/components/icon'
import humanizeDuration from 'humanize-duration'
import moment from 'moment'
import React, {PureComponent} from 'react'
import {
  Col,
  DropdownButton,
  Glyphicon,
  MenuItem,
  Row
} from 'react-bootstrap'
import {browserHistory, Link} from 'react-router'

import * as deploymentActions from '../actions/deployments'
import * as feedsActions from '../actions/feeds'
import * as versionsActions from '../actions/versions'
import {
  getComponentMessages,
  isModuleEnabled,
  getConfigProperty
} from '../../common/util/config'
import {abbreviate, isValidZipFile} from '../../common/util/util'
import ConfirmModal from '../../common/components/ConfirmModal'
import SelectFileModal from '../../common/components/SelectFileModal'
import WatchButton from '../../common/containers/WatchButton'

import type {Props as ContainerProps} from '../containers/FeedSourceTableRow'
import type {Feed, ValidationSummary} from '../../types'
import type {
  FeedSourceTableComparisonColumns,
  ManagerUserState
} from '../../types/reducers'

type Props = ContainerProps & {
  comparisonColumn: FeedSourceTableComparisonColumns,
  comparisonValidationSummary: ?ValidationSummary,
  createDeploymentFromFeedSource: typeof deploymentActions.createDeploymentFromFeedSource,
  createFeedSource: typeof feedsActions.createFeedSource,
  deleteFeedSource: typeof feedsActions.deleteFeedSource,
  feedSource: Feed,
  runFetchFeed: typeof feedsActions.runFetchFeed,
  updateFeedSource: typeof feedsActions.updateFeedSource,
  uploadFeed: typeof versionsActions.uploadFeed,
  user: ManagerUserState
}

const dateFormat = 'MMM D, YYYY'

const statusAttributeLookup = {
  'active': {
    className: 'status-active',
    icon: 'check-circle'
  },
  'expiring-within-20-days': {
    className: 'status-expiring-20',
    icon: 'exclamation-triangle'
  },
  'expiring-within-5-days': {
    className: 'status-expiring-5',
    icon: 'exclamation-triangle'
  },
  'expired': {
    className: 'status-expired',
    icon: 'times-circle'
  },
  'future': {
    className: 'status-future',
    icon: 'clock-o'
  },
  'no-version': {
    className: 'status-no-version',
    icon: 'minus-circle'
  }
}

/**
 * Helper to lookup status data and return inline in new object
 */
function wrapLookupStatus (status, data = {}) {
  return {
    ...statusAttributeLookup[status],
    ...data,
    status
  }
}

/**
 * Get some UI data from a ValidationSummary
 */
function getVersionDisplayData (
  validationSummary: ?ValidationSummary
) {
  if (validationSummary) {
    const errorCount = validationSummary.errorCount || 'None'
    const endMoment = moment(validationSummary.endDate)
    const startMoment = moment(validationSummary.startDate)
    return wrapLookupStatus(
      endMoment.isBefore(moment())
        ? 'expired'
        : endMoment.isBefore(moment().add(5, 'days'))
          ? 'expiring-within-5-days'
          : endMoment.isBefore(moment().add(20, 'days'))
            ? 'expiring-within-20-days'
            : startMoment.isBefore(moment())
              ? 'active'
              : 'future',
      {
        endDate: endMoment.format(dateFormat),
        errorCount,
        startDate: startMoment.format(dateFormat)
      }
    )
  } else {
    return wrapLookupStatus('no-version')
  }
}

function relativeDuration (time: any) {
  return humanizeDuration(
    (moment().unix() - moment(time).unix()) * 1000,
    { largest: 1 }
  )
}

export default class FeedSourceTableRow extends PureComponent<Props> {
  messages = getComponentMessages('FeedSourceTableRow')

  render () {
    const {
      comparisonColumn,
      comparisonValidationSummary,
      feedSource
    } = this.props

    // data for feed source info column
    let lastVersionUpdate = !!feedSource.lastUpdated &&
      relativeDuration(feedSource.lastUpdated)
    lastVersionUpdate = lastVersionUpdate
      ? `Last updated ${lastVersionUpdate} ago`
      : ''

    // data for comparison column
    const comparisonData = comparisonValidationSummary &&
      getVersionDisplayData(comparisonValidationSummary)

    let comparisonSubtext, comparisonSubtextDate
    if (comparisonData && comparisonValidationSummary) {
      if (comparisonData.status === 'future') {
        comparisonSubtext = `Starting in ${
          relativeDuration(comparisonValidationSummary.startDate)
        }`
        comparisonSubtextDate = comparisonValidationSummary.startDate
      } else if (comparisonData.status === 'expired') {
        comparisonSubtext = `Expired ${
          relativeDuration(comparisonValidationSummary.endDate)
        } ago`
        comparisonSubtextDate = comparisonValidationSummary.endDate
      } else {
        comparisonSubtext = `Valid for another ${
          relativeDuration(comparisonValidationSummary.endDate)
        }`
        comparisonSubtextDate = comparisonValidationSummary.endDate
      }
    }

    // data for latest validation columns
    const currentVersionData = getVersionDisplayData(feedSource.latestValidation)

    if (
      feedSource.latestVersionId &&
        comparisonValidationSummary &&
        feedSource.latestVersionId === comparisonValidationSummary.feedVersionId
    ) {
      currentVersionData.status = comparisonColumn === 'DEPLOYED'
        ? 'same-as-deployed'
        : 'same-as-published'
    }

    return (
      <tr key={feedSource.id} className='feed-source-table-row'>
        <td className='feed-source-info'>
          <FeedInfo feedSource={feedSource} />
        </td>
        {comparisonColumn &&
          <td className='comparison-column'>
            {comparisonData
              ? (
                <Status
                  icon={comparisonData.icon}
                  statusSpanClass={comparisonData.className}
                  statusText={this.messages(`status.${comparisonData.status}`)}
                  subtext={comparisonSubtext}
                  subtextDate={comparisonSubtextDate}
                />
              )
              : <span className='feed-status-subtext'>
                {comparisonColumn === 'PUBLISHED'
                  ? this.messages('status.feedNotPublished')
                  : this.messages('status.feedNotInDeployment')}
              </span>
            }
          </td>
        }
        <td className='feed-version-column'>
          <Status
            icon={currentVersionData.icon}
            statusSpanClass={currentVersionData.className}
            statusText={this.messages(`status.${currentVersionData.status}`)}
            subtext={lastVersionUpdate}
          />
        </td>
        <td className='feed-version-column'>
          {currentVersionData.startDate}
          {currentVersionData.startDate && ' -'}
          {currentVersionData.endDate && <br />}
          {currentVersionData.endDate}
        </td>
        <td className='feed-version-column'>{currentVersionData.errorCount}</td>
        <td>
          <FeedActionsDropdown {...this.props} />
        </td>
      </tr>
    )
  }
}

class FeedInfo extends PureComponent<{ feedSource: Feed }> {
  render () {
    const {feedSource} = this.props

    const lastUpdateText = feedSource.lastUpdated
      ? `Last updated ${moment(feedSource.lastUpdated).format(dateFormat)}`
      : 'No updates yet'

    return (
      <div>
        <h4>
          <Link to={`/feed/${feedSource.id}`}>{feedSource.name}</Link>
        </h4>
        <h5>{lastUpdateText}</h5>
        <Row>
          {feedSource.url &&
            <Col xs={12}>
              <Icon type='link' />
              <a href={feedSource.url} target='_blank'>
                {abbreviate(feedSource.url)}
                <Icon type='external-link' />
              </a>
            </Col>
          }
          {feedSource.retrievalMethod === 'FETCHED_AUTOMATICALLY' &&
            <Col xs={6}>
              <Icon type='feed' />
              Auto fetch
            </Col>
          }
          {feedSource.deployable &&
            <Col xs={6}>
              <Icon type='rocket' />
              Deployable
            </Col>
          }
          <Col xs={6}>
            <Icon type={feedSource.isPublic ? 'globe' : 'lock'} />
            {feedSource.isPublic ? 'Public' : 'Private'}
          </Col>
        </Row>
      </div>
    )
  }
}

class Status extends PureComponent<{
  icon: string,
  statusSpanClass: string,
  statusText: string,
  subtext: ?string,
  subtextDate?: string
}> {
  render () {
    const {icon, subtext, statusSpanClass, statusText, subtextDate} = this.props
    return (
      <div>
        <span className={`feed-status ${statusSpanClass}`}>
          <Icon type={icon} />
          {statusText}
        </span>
        <div className='feed-status-subtext'>
          {subtext}
          {subtextDate && <br />}
          {subtextDate && `(${moment(subtextDate).format(dateFormat)})`}
        </div>
      </div>
    )
  }
}

class FeedActionsDropdown extends PureComponent<Props> {
  _onClickDelete = () => {
    // Delete immediately if feed source is being created.
    if (this.props.feedSource.isCreating) return this._onConfirmDelete()
    // Otherwise, show delete modal.
    this.refs.deleteModal.open()
  }

  _onClickDeploy = () => {
    const {createDeploymentFromFeedSource, feedSource} = this.props
    createDeploymentFromFeedSource(feedSource)
  }

  _onClickEdit = () => push(`/feed/${this.props.feedSource.id}/edit/`)

  _onClickFetch = () => {
    const {feedSource, runFetchFeed} = this.props
    runFetchFeed(feedSource)
  }

  _onClickPublic = () => {
    push(`/public/feed/${this.props.feedSource.id}`)
  }

  _onClickUpload = () => { this.refs.uploadModal.open() }

  _onConfirmDelete = () => {
    this.props.deleteFeedSource(this.props.feedSource)
  }

  _onConfirmUpload = (files: Array<File>) => {
    const {feedSource, uploadFeed} = this.props
    const file = files[0]
    if (isValidZipFile(file)) {
      uploadFeed(feedSource, file)
      return true
    } else {
      return false
    }
  }

  render () {
    const {
      feedSource,
      project,
      user
    } = this.props

    const {permissions, subscriptions} = user
    const disabled = !permissions ||
      !permissions.hasFeedPermission(project.organizationId, project.id, feedSource.id, 'manage-feed')
    const isWatchingFeed = subscriptions &&
      subscriptions.hasFeedSubscription(project.id, feedSource.id, 'feed-updated')
    const editGtfsDisabled = !permissions ||
      !permissions.hasFeedPermission(project.organizationId, project.id, feedSource.id, 'edit-gtfs')

    return (
      <DropdownButton
        id={`feed-source-action-button-${feedSource.id}`}
        title='Menu'
      >
        <ConfirmModal
          ref='deleteModal'
          title='Delete Feed Source?'
          body={`Are you sure you want to delete the feed source ${feedSource.name}?`}
          onConfirm={this._onConfirmDelete}
        />
        <SelectFileModal
          ref='uploadModal'
          title='Upload Feed'
          body='Select a GTFS feed to upload:'
          onConfirm={this._onConfirmUpload}
          errorMessage='Uploaded file must be a valid zip file (.zip).'
        />
        <MenuItem
          disabled={editGtfsDisabled}
          onClick={this._onClickEdit}
        >
          <Glyphicon glyph='pencil' /> Open in Editor
        </MenuItem>
        <MenuItem
          disabled={disabled || !feedSource.url}
          onClick={this._onClickFetch}
        >
          <Glyphicon glyph='refresh' /> Fetch
        </MenuItem>
        <MenuItem
          disabled={disabled}
          onClick={this._onClickUpload}
        >
          <Glyphicon glyph='upload' /> Upload
        </MenuItem>
        {/* show divider only if deployments and notifications are enabled (otherwise, we don't need it) */}
        {isModuleEnabled('deployment') || getConfigProperty('application.notifications_enabled')
          ? <MenuItem divider />
          : null
        }
        {isModuleEnabled('deployment')
          ? <MenuItem
            disabled={disabled || !feedSource.deployable || !feedSource.latestValidation}
            title={disabled
              ? 'You do not have permission to deploy feed'
              : !feedSource.deployable
                ? 'Feed source is not deployable. Change in feed source settings.'
                : !feedSource.latestValidation
                  ? 'No versions exist. Create new version to deploy feed'
                  : 'Deploy feed source.'
            }
            onClick={this._onClickDeploy}
          >
            <Glyphicon glyph='globe' /> Deploy
          </MenuItem>
          : null
        }
        {getConfigProperty('application.notifications_enabled')
          ? <WatchButton
            isWatching={isWatchingFeed}
            user={user}
            target={feedSource.id}
            subscriptionType='feed-updated'
            componentClass='menuItem' />
          : null
        }
        <MenuItem
          disabled={!feedSource.isPublic}
          onClick={this._onClickPublic}
        >
          <Glyphicon glyph='link' /> View public page
        </MenuItem>
        <MenuItem divider />
        <MenuItem
          data-test-id='feed-source-dropdown-delete-feed-source-button'
          disabled={disabled}
          onClick={this._onClickDelete}
        >
          <Icon type='trash' /> Delete
        </MenuItem>
      </DropdownButton>
    )
  }
}
