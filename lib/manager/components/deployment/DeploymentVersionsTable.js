// @flow

import React, {Component} from 'react'
import {Table, Button, Badge, Glyphicon, ButtonToolbar} from 'react-bootstrap'
import {Link} from 'react-router-dom'

import * as deploymentActions from '../../actions/deployments'
import {getComponentMessages} from '../../../common/util/config'
import {formatTimestamp, fromNow} from '../../../common/util/date-time'
import {versionHasExpired, versionHasNotBegun} from '../../util/version'

import type {Deployment, Feed, Project, SummarizedFeedVersion} from '../../../types'
import type {ManagerUserState} from '../../../types/reducers'

type Props = {
  deleteFeedVersion: typeof deploymentActions.deleteFeedVersion,
  deployment: Deployment,
  project: Project,
  updateVersionForFeedSource: typeof deploymentActions.updateVersionForFeedSource,
  user: ManagerUserState,
  versions: Array<SummarizedFeedVersion>
}

export default class DeploymentVersionsTable extends Component<Props> {
  messages = getComponentMessages('DeploymentVersionsTable')

  render () {
    const {
      deployment,
      deleteFeedVersion,
      project,
      versions,
      updateVersionForFeedSource,
      user
    } = this.props
    return (
      <Table striped hover fill>
        <thead>
          <tr>
            <th className='col-md-4'>{this.messages('name')}</th>
            <th>Version</th>
            <th className='hidden-xs'>{this.messages('dateRetrieved')}</th>
            <th className='hidden-xs'>{this.messages('loadStatus')}</th>
            <th className='hidden-xs'>{this.messages('errorCount')}</th>
            <th className='hidden-xs'>{this.messages('routeCount')}</th>
            <th className='hidden-xs'>{this.messages('tripCount')}</th>
            <th className='hidden-xs'>{this.messages('stopTimesCount')}</th>
            <th>{this.messages('validFrom')}</th>
            <th>{this.messages('expires')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => {
            return <FeedVersionTableRow
              feedSource={version.feedSource}
              version={version}
              project={project}
              deployment={deployment}
              key={version.id}
              user={user}
              updateVersionForFeedSource={updateVersionForFeedSource}
              deleteFeedVersion={deleteFeedVersion} />
          })}
        </tbody>
      </Table>
    )
  }
}

type RowProps = {
    deleteFeedVersion: typeof deploymentActions.deleteFeedVersion,
    deployment: Deployment,
    feedSource: Feed,
    project: Project,
    updateVersionForFeedSource: typeof deploymentActions.updateVersionForFeedSource,
    user: ManagerUserState,
    version: SummarizedFeedVersion
  }

class FeedVersionTableRow extends Component<RowProps> {
  _decrementVersion = () => {
    const {deployment, feedSource, updateVersionForFeedSource, version} = this.props
    const {previousVersionId: id} = version
    if (!id) {
      console.warn('No previous version ID exists for version', version)
      return
    }
    updateVersionForFeedSource(deployment, feedSource, {id})
  }

  _incrementVersion = () => {
    const {deployment, feedSource, updateVersionForFeedSource, version} = this.props
    const {nextVersionId: id} = version
    if (!id) {
      console.warn('No next version ID exists for version', version)
      return
    }
    updateVersionForFeedSource(deployment, feedSource, {id})
  }

  _removeVersion = () => {
    const {deleteFeedVersion, deployment, version} = this.props
    deleteFeedVersion(deployment, version)
  }

  render () {
    const {
      deployment,
      feedSource,
      project,
      user,
      version
    } = this.props
    const {validationResult: result} = version
    const na = (<span style={{ color: 'lightGray' }}>N/A</span>)
    const hasVersionStyle = {cursor: 'pointer'}
    const noVersionStyle = {color: 'lightGray'}
    const disabled = !user.permissions ||
      !user.permissions.hasFeedPermission(
        project.organizationId,
        project.id,
        feedSource.id,
        'manage-feed'
      )
    const expired = versionHasExpired(version)
    const future = versionHasNotBegun(version)
    return (
      <tr key={feedSource.id}>
        <td>
          <Link to={`/feed/${feedSource.id}`}>{feedSource.name}</Link>
        </td>
        <td className='col-md-1 col-xs-2'>
          <Link to={`/feed/${feedSource.id}/version/${version.version}`}>
            <small>Version {version.version}</small>
          </Link>
          <ButtonToolbar>
            <Button
              bsSize='xsmall'
              bsStyle='default'
              style={{color: 'black'}}
              disabled={!version.previousVersionId}
              onClick={this._decrementVersion}>
              <Glyphicon
                glyph='menu-left'
                style={version.previousVersionId ? hasVersionStyle : noVersionStyle}
                title={version.previousVersionId ? 'Previous version' : 'No previous versions'}
                alt='Previous version' />
            </Button>
            <Button
              bsSize='xsmall'
              bsStyle='default'
              style={{color: 'black'}}
              disabled={!version.nextVersionId}
              onClick={this._incrementVersion}>
              <Glyphicon
                glyph='menu-right'
                style={version.nextVersionId ? hasVersionStyle : noVersionStyle}
                title={version.nextVersionId ? 'Next version' : 'No newer versions'}
                alt='Next Version' />
            </Button>
          </ButtonToolbar>
        </td>
        <td className='hidden-xs'>
          {na}
        </td>
        <td className='hidden-xs'>
          <Badge>{result.loadStatus}</Badge>
        </td>
        <td className={`hidden-xs${result.errorCount && ' warning'}`}>
          {result.errorCount}
        </td>
        <td className={`hidden-xs${!result.routeCount ? ' warning' : ''}`}>
          {result.routeCount}
        </td>
        <td className={`hidden-xs${!result.tripCount ? ' warning' : ''}`}>
          {result.tripCount}
        </td>
        <td className={`hidden-xs${!result.stopTimesCount ? ' warning' : ''}`}>
          {result.stopTimesCount}
        </td>
        <td className={future ? 'danger' : ''}>
          {formatTimestamp(result.startDate, false)} ({fromNow(result.startDate)})
        </td>
        <td className={expired ? 'danger' : ''}>
          {formatTimestamp(result.endDate, false)} ({fromNow(result.endDate)})
        </td>
        <td>
          <Button
            bsStyle='danger'
            bsSize='xsmall'
            // Cannot remove feed source if the deployment is feed-specific
            disabled={disabled || deployment.feedSourceId === feedSource.id}
            className='pull-right'
            onClick={this._removeVersion}>
            <Glyphicon glyph='remove' />
          </Button>
        </td>
      </tr>
    )
  }
}
