// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import moment from 'moment'
import {Link} from 'react-router-dom'

import type {RecentActivity} from '../../types'
import type {ManagerUserState} from '../../types/reducers'

const dateFormat = 'MMM. DD, YYYY'
const timeFormat = 'h:mma'

const getPrimaryURL = (feedSourceId: string, versionIndex: number) => versionIndex
  ? getVersionURL(feedSourceId, versionIndex)
  : getFeedSourceURL(feedSourceId)

const getFeedSourceURL = (id: string) => `/feed/${id}`

const getVersionURL = (feedSourceId: string, versionIndex: number) =>
  `/feed/${feedSourceId}/version/${versionIndex}`

const getIconType = (type: string) => {
  switch (type) {
    case 'feed-commented-on':
    case 'version-commented-on':
      return 'comment'
    case 'feed-created':
      return 'bus'
    case 'version-created':
      return 'list'
    default:
      return null
  }
}

type Props = {
  currentUser: ManagerUserState,
  item: RecentActivity
}

export default class RecentActivityBlock extends Component<Props> {
  render () {
    const { item, currentUser } = this.props
    const {date, type} = item
    const activityDate = moment(date)
    return (
      <div className='recent-activity-container'>
        <div className='recent-activity-icon'>
          <Icon type={getIconType(type)} />
        </div>
        <div className='recent-activity-inner'>
          <div
            className='recent-activity-date'
            title={activityDate.format(dateFormat + ', ' + timeFormat)}>
            {activityDate.fromNow()}
          </div>
          <MetaBlock item={item} currentUser={currentUser} />
          <PrimaryBlock item={item} />
        </div>
      </div>
    )
  }
}

type MetaProps = {
  currentUser: ManagerUserState,
  item: RecentActivity
}

class MetaBlock extends Component<MetaProps> {
  render () {
    const {currentUser, item} = this.props
    // TODO: Refactor below switch to share more of the common JSX with certain
    // items (e.g., links, text) conditionally dependent on recent activity type.
    const {
      feedVersionIndex,
      feedVersionName,
      feedSourceId,
      type,
      feedSourceName,
      userName
    } = item
    switch (type) {
      case 'feed-commented-on':
      case 'version-commented-on':
        return (
          <div>
            {currentUser.profile && currentUser.profile.name === userName
              ? 'You'
              : <b>{userName}</b>
            }
            {' commented on feed '}
            <Link to={getFeedSourceURL(feedSourceId)}>
              <b>{feedSourceName}</b>
            </Link>
            {feedVersionIndex && feedSourceName && (
              <span>
                {', version '}
                <Link to={getVersionURL(feedSourceId, feedVersionIndex)}>
                  <b>{feedVersionName}</b>
                </Link>
              </span>
            )}
            {`:`}
          </div>
        )
      default:
        return null
    }
  }
}

type PrimaryProps = {
  item: RecentActivity
}

class PrimaryBlock extends Component<PrimaryProps> {
  render () {
    const {item} = this.props
    const {
      feedVersionIndex,
      feedVersionName,
      feedSourceId,
      type,
      feedSourceName,
      projectName,
      projectId,
      body
    } = item
    const primaryURL = getPrimaryURL(feedSourceId, feedVersionIndex)
    const primaryName = feedVersionIndex
      ? feedVersionName
      : feedSourceName
    switch (type) {
      case 'feed-commented-on':
      case 'version-commented-on':
        return (
          <div>
            <Link to={`${primaryURL}/comments`}>
              <div className='recent-activity-comment'><i>{body}</i></div>
            </Link>
          </div>
        )
      case 'version-created':
      case 'feed-created':
        return (
          <div>
            {`New ${feedVersionIndex ? 'version' : 'feed'} `}
            <Link to={primaryURL}>
              <b>{primaryName}</b>
            </Link>
            {feedVersionIndex
              ? <span>
                {' created for feed '}
                <Link to={getFeedSourceURL(feedSourceId)}>
                  <b>{feedSourceName}</b>
                </Link>
              </span>
              : <span>
                {' created in project '}
                <Link to={`/project/${projectId}`}>
                  <b>{projectName}</b>
                </Link>
              </span>
            }
          </div>
        )
      default:
        return null
    }
  }
}
