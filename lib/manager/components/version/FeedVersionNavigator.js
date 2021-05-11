// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import {Row, Col, ButtonGroup, ButtonToolbar, DropdownButton, MenuItem, Button, Glyphicon} from 'react-bootstrap'
import { push } from 'connected-react-router'
import {LinkContainer} from 'react-router-bootstrap'

import * as feedsActions from '../../actions/feeds'
import * as notesActions from '../../actions/notes'
import * as versionsActions from '../../actions/versions'
import OptionButton from '../../../common/components/OptionButton'
import SelectFileModal from '../../../common/components/SelectFileModal'
import {getComponentMessages, isModuleEnabled} from '../../../common/util/config'
import {isValidZipFile} from '../../../common/util/util'
import * as snapshotActions from '../../../editor/actions/snapshots'
import * as gtfsPlusActions from '../../../gtfsplus/actions/gtfsplus'
import * as deploymentActions from '../../../manager/actions/deployments'
import DeploymentPreviewButton from '../deployment/DeploymentPreviewButton'
import FeedVersionViewer from './FeedVersionViewer'
import VersionSelectorDropdown from './VersionSelectorDropdown'

import type {Props as ContainerProps} from '../../containers/ActiveFeedVersionNavigator'
import type {FeedVersion, GtfsPlusValidation, Note} from '../../../types'
import type {GtfsState, ManagerUserState} from '../../../types/reducers'

type Props = ContainerProps & {
  createDeploymentFromFeedSource: typeof deploymentActions.createDeploymentFromFeedSource,
  deleteFeedVersion: typeof versionsActions.deleteFeedVersion,
  downloadFeedViaToken: typeof versionsActions.downloadFeedViaToken,
  downloadGtfsPlusFeed: typeof gtfsPlusActions.downloadGtfsPlusFeed,
  exportVersionShapes: typeof versionsActions.exportVersionShapes,
  feedVersionIndex: number,
  fetchGTFSEntities: typeof versionsActions.fetchGTFSEntities,
  fetchNotesForFeedVersion: typeof notesActions.fetchNotesForFeedVersion,
  fetchValidationErrors: typeof versionsActions.fetchValidationErrors,
  gtfs: GtfsState,
  gtfsPlusValidation: GtfsPlusValidation,
  hasVersions: boolean,
  loadFeedVersionForEditing: typeof snapshotActions.loadFeedVersionForEditing,
  mergeVersions: typeof versionsActions.mergeVersions,
  postNoteForFeedVersion: typeof notesActions.postNoteForFeedVersion,
  publishFeedVersion: typeof versionsActions.publishFeedVersion,
  renameFeedVersion: typeof versionsActions.renameFeedVersion,
  runFetchFeed: typeof feedsActions.runFetchFeed,
  setVersionIndex: typeof versionsActions.setVersionIndex,
  sortedVersions: Array<FeedVersion>,
  uploadFeed: typeof versionsActions.uploadFeed,
  user: ManagerUserState,
  version: FeedVersion,
  versionIndexDoesNotExist: boolean,
  versionSection: ?string
}

type State = {
  listView: boolean
}

export default class FeedVersionNavigator extends Component<Props, State> {
  messages = getComponentMessages('FeedVersionNavigator')
  state = {
    listView: false
  }

  componentDidMount () {
    const {feedSource, feedVersionIndex, setVersionIndex} = this.props
    const hasIndex = typeof feedVersionIndex !== 'undefined'
    // Set version index on mount if index is available.
    if (hasIndex) setVersionIndex(feedSource, feedVersionIndex, false)
  }

  componentWillReceiveProps (nextProps: Props) {
    const {feedSource, feedVersionIndex} = nextProps
    const indexChanged = feedVersionIndex !== this.props.feedVersionIndex
    const hasVersions = feedSource && feedSource.feedVersions
    if (indexChanged && hasVersions) {
      // If index changes, update.
      this.props.setVersionIndex(feedSource, feedVersionIndex, false)
    }
    if (nextProps.versionIndexDoesNotExist) {
      console.warn(`Version index ${nextProps.feedVersionIndex} is invalid.`)
      push(`/feed/${nextProps.feedSource.id}`)
    }
  }

  _onCreateNewVersion = (key: string) => {
    const {createDeploymentFromFeedSource, feedSource, runFetchFeed} = this.props
    switch (key) {
      // case 'delete':
      //   return this.refs['deleteModal'].open()
      case 'fetch':
        return runFetchFeed(feedSource)
      case 'upload':
        return this.refs['uploadModal'].open()
      case 'deploy':
        return createDeploymentFromFeedSource(feedSource)
      case 'public':
        return push(`/public/feed/${feedSource.id}`)
      case 'snapshot':
        return push(`/feed/${feedSource.id}/snapshots`)
    }
  }

  _createDeployment = () => this.props.createDeploymentFromFeedSource(this.props.feedSource)

  _decrementVersion = () => this.props.setVersionIndex(this.props.feedSource, this.props.feedVersionIndex - 1)

  _incrementVersion = () => this.props.setVersionIndex(this.props.feedSource, this.props.feedVersionIndex + 1)

  _onChangeListView = (listView: boolean) => this.setState({listView})

  _onConfirmUpload = (files: Array<File>) => {
    const {feedSource, uploadFeed} = this.props
    if (isValidZipFile(files[0])) {
      uploadFeed(feedSource, files[0])
      return true
    } else {
      return false
    }
  }

  _onVersionNotePosted = (note: Note) => {
    this.props.postNoteForFeedVersion(this.props.version, note)
  }

  _onVersionNotesRequested = () => {
    this.props.fetchNotesForFeedVersion(this.props.version)
  }

  _onSelectVersion = (index: number) => {
    if (index !== this.props.feedVersionIndex) {
      this.props.setVersionIndex(this.props.feedSource, index)
    }
  }

  render () {
    const versionTitleStyle = {
      fontSize: '24px',
      fontWeight: 'bold'
    }
    const {
      deleteDisabled,
      deleteFeedVersion,
      disabled,
      downloadFeedViaToken,
      editDisabled,
      exportVersionShapes,
      feedSource,
      feedVersionIndex,
      fetchGTFSEntities,
      fetchValidationErrors,
      gtfs,
      hasVersions,
      isPublic,
      loadFeedVersionForEditing,
      project,
      publishFeedVersion,
      renameFeedVersion,
      sortedVersions,
      user,
      version,
      versionSection
    } = this.props
    const deploymentForVersion =
      version &&
      feedSource.deployments &&
      feedSource.deployments.find(d => d.feedVersions.findIndex(v => v.id === version.id) !== -1)
    const dropdownTitle = `${this.messages('version')} ${feedVersionIndex} ${this.messages('of')} ${sortedVersions.length}`
    return (
      <div>
        <SelectFileModal ref='uploadModal'
          title='Upload Feed'
          body='Select a GTFS feed to upload:'
          onConfirm={this._onConfirmUpload}
          errorMessage='Uploaded file must be a valid zip file (.zip).' />
        <Row style={{marginBottom: '20px'}}>
          {/* Version Navigation Widget and Name Editor */}
          <Col xs={12} style={versionTitleStyle}>
            <ButtonToolbar>
              <ButtonGroup>
                <OptionButton
                  active={!this.state.listView}
                  value={false}
                  onClick={this._onChangeListView}>
                  <Icon type='square' />
                </OptionButton>
                <OptionButton
                  active={this.state.listView}
                  value={!false}
                  onClick={this._onChangeListView}>
                  <Icon type='list' />
                </OptionButton>
              </ButtonGroup>
              {this.state.listView
                ? null
                : <ButtonGroup> {/* Version Navigation/Selection Widget */}
                  {/* Previous Version Button */}
                  <Button
                    data-test-id='decrement-feed-version-button'
                    disabled={!hasVersions || !sortedVersions[feedVersionIndex - 2]}
                    href='#'
                    onClick={this._decrementVersion}>
                    <Glyphicon glyph='arrow-left' />
                  </Button>

                  {/* Version Selector Dropdown */}
                  {sortedVersions.length > 0 &&
                    <VersionSelectorDropdown
                      dropdownProps={{
                        id: 'versionSelector',
                        onSelect: this._onSelectVersion
                      }}
                      header='Select a version to view summary'
                      title={dropdownTitle}
                      version={version}
                      versions={sortedVersions}
                    />
                  }
                  {/* Next Version Button */}
                  <Button href='#'
                    disabled={!hasVersions || !sortedVersions[feedVersionIndex]}
                    onClick={this._incrementVersion}>
                    <Glyphicon glyph='arrow-right' />
                  </Button>
                </ButtonGroup>
              }
              <ButtonToolbar className='pull-right'>
                <ButtonGroup>
                  {isModuleEnabled('deployment') && deploymentForVersion
                    ? <DeploymentPreviewButton
                      deployment={deploymentForVersion}
                      project={project}>
                      View deployment {version && version.id}
                    </DeploymentPreviewButton>
                    : null
                  }
                  {isModuleEnabled('deployment') && !isPublic
                    ? <Button
                      // Disable deployment if not permitted or no version exists
                      data-test-id='deploy-feed-version-button'
                      disabled={disabled || !hasVersions}
                      onClick={this._createDeployment}>
                      <Icon type='globe' /> Deploy feed
                    </Button>
                    : null
                  }
                  {isModuleEnabled('editor') && !isPublic
                    ? <LinkContainer to={`/feed/${feedSource.id}/edit`}>
                      <Button
                        data-test-id='edit-feed-version-button'
                        disabled={editDisabled}>
                        <Glyphicon glyph='pencil' /> Edit feed
                      </Button>
                    </LinkContainer>
                    : null
                  }
                </ButtonGroup>
                {!isPublic
                  ? <DropdownButton
                    bsStyle='success'
                    disabled={disabled}
                    title={
                      <span>
                        <Icon type='plus' /> Create new version
                      </span>
                    }
                    id='bg-nested-dropdown'
                    onSelect={this._onCreateNewVersion}>
                    <MenuItem
                      data-test-id='fetch-feed-button'
                      disabled={disabled || !feedSource.url}
                      eventKey='fetch'
                    >
                      <Glyphicon glyph='refresh' /> Fetch
                    </MenuItem>
                    <MenuItem
                      data-test-id='upload-feed-button'
                      disabled={disabled}
                      eventKey='upload'
                    >
                      <Glyphicon glyph='upload' /> Upload
                    </MenuItem>
                    <MenuItem divider />
                    <MenuItem
                      disabled={disabled ||
                        !feedSource.editorSnapshots ||
                        feedSource.editorSnapshots.length === 0
                      }
                      eventKey='snapshot'>
                      <Glyphicon glyph='camera' /> From snapshot
                    </MenuItem>
                  </DropdownButton>
                  : null
                }
              </ButtonToolbar>
            </ButtonToolbar>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <FeedVersionViewer
              deleteDisabled={deleteDisabled}
              deleteFeedVersion={deleteFeedVersion}
              downloadFeedViaToken={downloadFeedViaToken}
              downloadGtfsPlusFeed={this.props.downloadGtfsPlusFeed}
              editDisabled={editDisabled}
              exportVersionShapes={exportVersionShapes}
              feedSource={feedSource}
              feedVersionIndex={feedVersionIndex}
              fetchGTFSEntities={fetchGTFSEntities}
              fetchValidationErrors={fetchValidationErrors}
              gtfs={gtfs}
              gtfsPlusValidation={this.props.gtfsPlusValidation}
              hasVersions={hasVersions}
              isPublic={isPublic}
              listView={this.state.listView}
              loadFeedVersionForEditing={loadFeedVersionForEditing}
              mergeVersions={this.props.mergeVersions}
              newNotePosted={this._onVersionNotePosted}
              notesRequested={this._onVersionNotesRequested}
              project={project}
              publishFeedVersion={publishFeedVersion}
              renameFeedVersion={renameFeedVersion}
              user={user}
              version={this.props.version}
              versionSection={versionSection || null}
              versions={sortedVersions} />
          </Col>
        </Row>
      </div>
    )
  }
}
