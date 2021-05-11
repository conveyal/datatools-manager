// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Button, ButtonGroup, DropdownButton, Dropdown, MenuItem, Tooltip, OverlayTrigger } from 'react-bootstrap'
import { browserHistory } from 'react-router'

import * as activeActions from '../actions/active'
import * as mapActions from '../actions/map'
import * as snapshotActions from '../actions/snapshots'
import SelectFileModal from '../../common/components/SelectFileModal.js'
import {getComponentMessages} from '../../common/util/config'
import {isValidZipFile} from '../../common/util/util'
import CreateSnapshotModal from './CreateSnapshotModal'
import { GTFS_ICONS } from '../util/ui'
import {componentToText} from '../util/objects'
import {ENTITY} from '../constants'

import type {Props as ContainerProps} from '../containers/ActiveFeedInfoPanel'
import type {Feed, FeedInfo, Project} from '../../types'

type Props = ContainerProps & {
  displayRoutesShapefile: typeof mapActions.displayRoutesShapefile,
  feedInfo: FeedInfo,
  feedSource: Feed,
  fetchSnapshots: typeof snapshotActions.fetchSnapshots,
  project: Project,
  restoreSnapshot: typeof snapshotActions.restoreSnapshot,
  setActiveEntity: typeof activeActions.setActiveEntity
}

type State = {
  right: number
}

const PANEL_WIDTH = 400

/**
 * This is a hideable menu of shortcut buttons that is displayed within the
 * Editor.
 */
export default class FeedInfoPanel extends Component<Props, State> {
  messages = getComponentMessages('FeedInfoPanel')
  state = {
    right: 5
  }

  _onAddSelect = (key: string) => {
    this.props.setActiveEntity(this.props.feedSource.id, key, {id: ENTITY.NEW_ID})
  }

  _onDropdownArrowClick = () => this.props.fetchSnapshots(this.props.feedSource)

  _onNavigate = (key: string) => {
    switch (key) {
      case '1':
        return push(`/project/${this.props.project.id}`)
      case '2':
        return push(`/feed/${this.props.feedSource.id}`)
    }
  }

  _onSelectSnapshot = (key: string) => {
    const {editorSnapshots: snapshots} = this.props.feedSource
    const snapshot = snapshots && snapshots.find(s => s.id === key)
    snapshot && this.props.showConfirmModal({
      title: `Restore ${key}?`,
      body: `Are you sure you want to restore this snapshot?`,
      onConfirm: () => {
        this.props.restoreSnapshot(this.props.feedSource, snapshot)
      }
    })
  }

  _onToggleHide = () => {
    const toolbarVisible = this.state.right > 0
    if (toolbarVisible) {
      this.setState({right: 30 - PANEL_WIDTH})
    } else {
      this.setState({right: 5})
    }
  }

  _openSnapshotModal = () => {
    // Note: this will need to change if react-redux is upgraded to v6+
    // https://medium.com/octopus-labs-london/how-to-access-a-redux-components-methods-with-createref-ca28a96efd59
    this.refs.snapshotModal.getWrappedInstance().open()
  }

  showUploadFileModal = () => {
    const {displayRoutesShapefile, feedSource} = this.props
    this.refs.selectFileModal.open({
      title: this.messages('uploadShapefile.title'),
      body: this.messages('uploadShapefile.body'),
      onConfirm: (files) => {
        const file = files[0]
        if (isValidZipFile(file)) {
          displayRoutesShapefile(feedSource, file)
          return true
        } else {
          return false
        }
      },
      errorMessage: this.messages('uploadShapefile.error')
    })
  }

  render () {
    const { feedSource, feedInfo } = this.props
    if (!feedInfo) return null
    const panelStyle = {
      position: 'absolute',
      right: this.state.right,
      bottom: 20,
      zIndex: 500,
      borderRadius: '5px',
      width: `${PANEL_WIDTH}px`
    }
    if (!feedInfo || !feedSource) {
      return null
    }
    const toolbarVisible = this.state.right > 0
    const feedName = feedSource && feedSource.name && feedSource.name.length > 10
      ? feedSource.name.substr(0, 10) + '...'
      : feedSource && feedSource.name
        ? feedSource.name
        : 'Unnamed'

    return (
      <div>
        <SelectFileModal ref='selectFileModal' />
        <div style={panelStyle}>
          <CreateSnapshotModal
            ref='snapshotModal'
            feedSource={feedSource}
          />
          <ButtonGroup>
            {/* Hide toolbar toggle */}
            <OverlayTrigger placement='top' overlay={<Tooltip id='hide-tooltip'>{toolbarVisible ? 'Hide toolbar' : 'Show toolbar'}</Tooltip>}>
              <Button
                data-test-id='FeedInfoPanel-visibility-toggle'
                onClick={this._onToggleHide}
              >
                <Icon type={toolbarVisible ? 'caret-right' : 'caret-left'} />
              </Button>
            </OverlayTrigger>
            {/* Navigation dropdown */}
            <DropdownButton
              dropup
              title={<span title={`Editing ${feedSource && feedSource.name}`}>Editing {feedName}</span>}
              id='navigation-dropdown'
              onSelect={this._onNavigate}>
              <MenuItem eventKey='1'><Icon type='reply' /> Back to project</MenuItem>
              <MenuItem eventKey='2'><Icon type='reply' /> Back to feed source</MenuItem>
            </DropdownButton>
            <Button
              onClick={this.showUploadFileModal}>
              <Icon type='upload' />
            </Button>
            {/* Add entity dropdown */}
            <DropdownButton
              pullRight dropup
              title={<span><Icon type='plus' /></span>}
              id='add-entity-dropdown'
              onSelect={this._onAddSelect}>
              {GTFS_ICONS.map(c => {
                if (!c.addable) return null
                return (
                  <MenuItem
                    key={c.id}
                    eventKey={c.id}>
                    <Icon type={c.icon} /> Add {componentToText(c.id)}
                  </MenuItem>
                )
              })}
            </DropdownButton>
            {/* Snapshot dropdown */}
            {
              <Dropdown
                dropup
                pullRight
                id='snapshot-dropdown'
                onSelect={this._onSelectSnapshot}>
                <OverlayTrigger
                  placement='top'
                  overlay={<Tooltip id='snapshot-tooltip'>Take snapshot</Tooltip>}>
                  <Button
                    bsStyle='primary'
                    data-test-id='take-snapshot-button'
                    onClick={this._openSnapshotModal}>
                    <Icon type='camera' />
                  </Button>
                </OverlayTrigger>
                <Dropdown.Toggle
                  bsStyle='primary'
                  onClick={this._onDropdownArrowClick} />
                <Dropdown.Menu style={{maxHeight: '200px', overflowY: 'scroll'}}>
                  {feedSource &&
                    feedSource.editorSnapshots &&
                    feedSource.editorSnapshots.length > 0
                    ? feedSource.editorSnapshots.map(snapshot => {
                      return (
                        <MenuItem
                          key={snapshot.id}
                          eventKey={snapshot.id}>
                          <Icon type='reply' /> Revert to {snapshot.name}
                        </MenuItem>
                      )
                    })
                    : <MenuItem
                      disabled
                      eventKey={null}>
                      <em>No snapshots created</em>
                    </MenuItem>
                  }
                </Dropdown.Menu>
              </Dropdown>
            }
          </ButtonGroup>
        </div>
      </div>
    )
  }
}
