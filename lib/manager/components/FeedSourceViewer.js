// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Grid, Row, Col, Badge, Glyphicon, Tabs, Tab} from 'react-bootstrap'
import {Link, browserHistory} from 'react-router'

import * as deploymentActions from '../actions/deployments'
import * as feedsActions from '../actions/feeds'
import * as notesActions from '../actions/notes'
import * as userActions from '../actions/user'
import * as versionsActions from '../actions/versions'
import * as snapshotActions from '../../editor/actions/snapshots'
import * as gtfsPlusActions from '../../gtfsplus/actions/gtfsplus'
import ManagerPage from '../../common/components/ManagerPage'
import {getComponentMessages, isModuleEnabled} from '../../common/util/config'
import ManagerHeader from './ManagerHeader'
import ActiveFeedVersionNavigator from '../containers/ActiveFeedVersionNavigator'
import FeedSourceSettings from './FeedSourceSettings'
import NotesViewer from './NotesViewer'
import ActiveEditorFeedSourcePanel from '../../editor/containers/ActiveEditorFeedSourcePanel'
import {isEditingDisabled} from '../util'

import type {Props as ContainerProps} from '../containers/ActiveFeedSourceViewer'
import type {Feed, Note, Project} from '../../types'
import type {ManagerUserState} from '../../types/reducers'

type Props = ContainerProps & {
  activeComponent: string,
  activeSubComponent: string,
  createDeploymentFromFeedSource: typeof deploymentActions.createDeploymentFromFeedSource,
  deleteFeedSource: typeof feedsActions.deleteFeedSource,
  deleteFeedVersion: typeof versionsActions.deleteFeedVersion,
  downloadFeedViaToken: typeof versionsActions.downloadFeedViaToken,
  downloadGtfsPlusFeed: typeof gtfsPlusActions.downloadGtfsPlusFeed,
  feedSource: Feed,
  feedSourceId: string,
  feedVersionIndex: number,
  fetchNotesForFeedSource: typeof notesActions.fetchNotesForFeedSource,
  fetchNotesForFeedVersion: typeof notesActions.fetchNotesForFeedVersion,
  isFetching: boolean,
  loadFeedVersionForEditing: typeof snapshotActions.loadFeedVersionForEditing,
  onFeedSourceViewerMount: typeof feedsActions.onFeedSourceViewerMount,
  postNoteForFeedSource: typeof notesActions.postNoteForFeedSource,
  postNoteForFeedVersion: typeof notesActions.postNoteForFeedVersion,
  project: Project,
  renameFeedVersion: typeof versionsActions.renameFeedVersion,
  updateExternalFeedResource: typeof feedsActions.updateExternalFeedResource,
  updateFeedSource: typeof feedsActions.updateFeedSource,
  updateTargetForSubscription: typeof userActions.updateTargetForSubscription,
  uploadFeed: typeof versionsActions.uploadFeed,
  user: ManagerUserState
}

export default class FeedSourceViewer extends Component<Props> {
  messages = getComponentMessages('FeedSourceViewer')

  componentWillMount () {
    this.props.onFeedSourceViewerMount(this.props)
  }

  confirmDeleteFeedSource = () => {
    const {deleteFeedSource, feedSource} = this.props
    this.refs.page.showConfirmModal({
      title: 'Delete Feed Source?',
      body: 'Are you sure you want to delete this feed source? This action cannot be undone and all feed versions will be deleted.',
      onConfirm: () => deleteFeedSource(feedSource)
        // $FlowFixMe action wrapped in dispatch is a promise
        .then(
          () => push(`/project/${feedSource.projectId}`)
        )
    })
  }

  _onSelectTab = (key: string) => push(
    `/feed/${this.props.feedSource.id}/${key}`
  )

  _postNote = (note: $Shape<Note>) => {
    this.props.postNoteForFeedSource(this.props.feedSource, note)
  }

  _requestNotes = () => {
    this.props.fetchNotesForFeedSource(this.props.feedSource)
  }

  render () {
    const {
      activeComponent,
      activeSubComponent,
      feedSource,
      feedVersionIndex,
      isFetching,
      project,
      routeParams,
      updateExternalFeedResource,
      updateFeedSource,
      updateTargetForSubscription,
      user
    } = this.props
    if (isFetching && !feedSource) {
      // Show spinner if fetching (and there is no current feed source loaded).
      return (
        <ManagerPage ref='page' forwardRef>
          <Grid fluid>
            <h1
              className='text-center'
              style={{marginTop: '150px'}}>
              <Icon className='fa-5x fa-spin' type='refresh' />
            </h1>
          </Grid>
        </ManagerPage>
      )
    } else if (!feedSource) {
      // If not fetching, but no feed source was fetched, show feed source not
      // found view.
      return (
        <ManagerPage ref='page' forwardRef>
          <Grid fluid>
            <Row>
              <Col xs={12}>
                <p>No feed source found for <strong>{this.props.feedSourceId}</strong></p>
                <p><Link to='/project'>Return to list of projects</Link></p>
              </Col>
            </Row>
          </Grid>
        </ManagerPage>
      )
    }
    const {editorSnapshots, id: feedSourceId, name, noteCount, notes} = feedSource
    const disabled = !user.permissions || !user.permissions.hasFeedPermission(
      project.organizationId, project.id,
      feedSourceId,
      'manage-feed'
    )
    const editDisabled = isEditingDisabled(user, feedSource, project)
    const activeTab = ['settings', 'comments', 'snapshots'].indexOf(activeComponent) === -1 || typeof routeParams.feedVersionIndex !== 'undefined'
      ? ''
      : activeComponent
    return (
      <ManagerPage
        ref='page' forwardRef
        title={name}>
        <Grid fluid>
          <ManagerHeader {...this.props} />
          {/* Feed Versions tab */}
          <Tabs id='feed-source-viewer-tabs'
            style={{minHeight: '400px'}}
            activeKey={activeTab}
            // Ensures that only active tab is mounted.
            mountOnEnter
            // Ensures that FeedSourceNavigator onMount gets called each time
            // tab is clicked.
            unmountOnExit
            onSelect={this._onSelectTab}>
            <Tab
              eventKey=''
              title={
                <span>
                  <Icon className='icon-link' type='database' />
                  <span className='hidden-xs'>
                    {this.messages('gtfs')}
                  </span>
                </span>
              }>
              <Row>
                <Col xs={12}>
                  <ActiveFeedVersionNavigator
                    deleteDisabled={disabled}
                    disabled={disabled}
                    editDisabled={editDisabled}
                    feedSource={feedSource}
                    project={project}
                    routeParams={routeParams}
                    versionIndex={feedVersionIndex} />
                </Col>
              </Row>
            </Tab>

            {isModuleEnabled('editor')
              ? <Tab eventKey='snapshots'
                title={
                  <span>
                    <Icon className='icon-link' type='pencil-square-o' />
                    <span className='hidden-xs'>
                      {this.messages('snapshotsTitle')}{' '}
                    </span>
                    <Badge>{editorSnapshots ? editorSnapshots.length : 0}</Badge>
                  </span>
                }>
                <ActiveEditorFeedSourcePanel
                  project={project}
                  feedSource={feedSource} />
              </Tab>
              : null
            }
            {/* Comments for feed source */}
            <Tab eventKey='comments'
              title={
                <span>
                  <Glyphicon className='icon-link' glyph='comment' />
                  <span className='hidden-xs'>
                    {this.messages('notesTitle')}{' '}
                  </span>
                  <Badge>{noteCount}</Badge>
                </span>
              }
              onEnter={this._requestNotes}>
              <NotesViewer
                type='feed-source'
                notes={notes}
                feedSource={feedSource}
                user={user}
                updateTargetForSubscription={updateTargetForSubscription}
                noteCount={noteCount}
                notesRequested={this._requestNotes}
                newNotePosted={this._postNote} />
            </Tab>
            {/* Settings */}
            <Tab
              disabled={disabled}
              eventKey='settings'
              title={
                <span>
                  <Glyphicon className='icon-link' glyph='cog' />
                  <span className='hidden-xs'>
                    {this.messages('properties.title')}
                  </span>
                </span>
              }>
              <FeedSourceSettings
                activeComponent={activeComponent}
                activeSubComponent={activeSubComponent}
                confirmDeleteFeedSource={this.confirmDeleteFeedSource}
                feedSource={feedSource}
                project={project}
                updateExternalFeedResource={updateExternalFeedResource}
                updateFeedSource={updateFeedSource}
                user={user} />
            </Tab>
          </Tabs>
        </Grid>
      </ManagerPage>
    )
  }
}
