// @flow

import Icon from '../../common/components/icon'
import moment from 'moment'
import React, {Component} from 'react'
import update from 'immutability-helper'
import {
  Button,
  Checkbox,
  Col,
  ControlLabel,
  FormControl,
  FormGroup,
  Glyphicon,
  HelpBlock,
  InputGroup,
  ListGroup,
  ListGroupItem,
  Panel,
  Row
} from 'react-bootstrap'
import DateTimeField from 'react-datetime'
import ReactDOM from 'react-dom'
import {shallowEqual} from 'react-pure-render'
import { push } from 'connected-react-router'

import * as projectsActions from '../actions/projects'
import MapModal from '../../common/components/MapModal.js'
import ConfirmModal from '../../common/components/ConfirmModal'
import TimezoneSelect from '../../common/components/TimezoneSelect'
import {getComponentMessages} from '../../common/util/config'
import {parseBounds, validationState} from '../util'

import type {Bounds, Project} from '../../types'

type ProjectModel = {
  autoFetchFeeds?: boolean,
  autoFetchHour?: number,
  autoFetchMinute?: number,
  bounds?: Bounds,
  defaultTimeZone?: string,
  id?: string,
  name?: string
}

type Props = {
  deleteProject?: typeof projectsActions.deleteProject,
  editDisabled?: boolean,
  onCancelUrl: string,
  project: Project | ProjectModel,
  showDangerZone?: boolean,
  updateProject: typeof projectsActions.updateProject
}

type State = {
  model: ProjectModel,
  validation: {
    bounds: boolean,
    defaultLocation: boolean,
    name: boolean
  }
}

const DEFAULT_FETCH_TIME = moment().startOf('day').add(2, 'hours')

export default class ProjectSettingsForm extends Component<Props, State> {
  messages = getComponentMessages('ProjectSettingsForm')
  state = {
    model: {},
    validation: {
      bounds: true,
      defaultLocation: true,
      name: true
    }
  }

  componentWillMount () {
    this._updateStateFromProps(this.props)
    window.addEventListener('keydown', this._handleKeyDown)
  }

  componentWillUnmount () {
    window.removeEventListener('keydown', this._handleKeyDown)
  }

  _handleKeyDown = (e: SyntheticKeyboardEvent<HTMLInputElement>) => {
    switch (e.keyCode) {
      case 13: // ENTER
        this._onSaveSettings()
        break
      default:
        break
    }
  }

  componentWillReceiveProps (nextProps: Props) {
    this._updateStateFromProps(nextProps)
  }

  shouldComponentUpdate (nextProps: Props, nextState: State) {
    return !shallowEqual(nextProps, this.props) || !shallowEqual(nextState, this.state)
  }

  _updateStateFromProps (props: Props) {
    // cast to make flow happy
    const model: any = props.project
    this.setState({ model })
  }

  _onCancel = () => {
    push(this.props.onCancelUrl)
  }

  _onDeleteProject = () => {
    const {deleteProject, project} = this.props
    if (!deleteProject) {
      throw new Error('ProjectSettingsForm component missing deleteProject action')
    }
    // cast to make flow happy
    const _project = ((project): any)
    this.refs.confirm.open({
      title: this.messages('deleteProject'),
      body: this.messages('confirmDelete'),
      onConfirm: () => deleteProject(_project)
    })
  }

  _onChangeAutoFetch = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const autoFetchMinute = DEFAULT_FETCH_TIME.minutes()
    const autoFetchHour = DEFAULT_FETCH_TIME.hours()
    const autoFetchFeeds = evt.target.checked
    this.setState(update(this.state, {
      model: {
        $merge: {autoFetchFeeds, autoFetchMinute, autoFetchHour}
      }
    }))
  }

  _onChangeBounds = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    // Parse values found in string into floats
    const {value} = evt.target
    const boundsValidation = parseBounds(value)
    if (boundsValidation.valid) {
      this.setState(update(this.state, {
        model: {
          $merge: {bounds: boundsValidation.bounds}
        },
        validation: {
          bounds: {
            $set: true
          }
        }
      }))
    } else {
      this.setState(
        update(this.state, {
          validation: {
            bounds: {
              $set: !value || value === ''
            }
          }
        })
      )
    }
  }

  _onChangeDateTime = (seconds: number) => {
    const time = moment(+seconds)
    this.setState(update(this.state, {
      model: {
        $merge: {
          autoFetchMinute: time.minutes(),
          autoFetchHour: time.hours()
        }
      }
    }))
  }

  _onChangeTimeZone = ({value: defaultTimeZone}: { value: string }) => {
    this.setState(update(this.state, {model: {$merge: {defaultTimeZone}}}))
  }

  _onChangeName = ({target}: {target: HTMLInputElement}) => {
    const {name, value} = target
    this.setState(
      update(this.state, {
        model: { $merge: {[name]: value} },
        validation: { [name]: { $set: value && value.length > 0 } }
      })
    )
  }

  _onOpenMapBoundsModal = () => {
    const project = this.props
    // $FlowFixMe - ignore type check to make flow happy
    const bounds = project.bounds
      ? [
        [project.bounds.south, project.bounds.west],
        [project.bounds.north, project.bounds.east]
      ]
      : null
    this.refs.mapModal.open({
      title: 'Select project bounds',
      body: `Pretend this is a map`,
      bounds: bounds,
      rectangleSelect: true,
      onConfirm: (rectangle) => {
        if (rectangle && rectangle.getBounds()) {
          const [[south, west], [north, east]] = rectangle.getBounds()
            .map(arr => arr.map(v => v.toFixed(6)))
          const domNode: HTMLInputElement = (
            (ReactDOM.findDOMNode(this.refs.boundingBox): any): HTMLInputElement
          )
          if (domNode) {
            domNode.value = `${west},${south},${east},${north}`
          }
          this.setState(update(this.state, {
            model: { $merge: {west, south, east, north} }
          }))
        }
        return rectangle
      }
    })
  }

  _onSaveSettings = () => {
    const {project, updateProject} = this.props
    // Prevent a save if there have been no edits or form is invalid
    if (this._settingsAreUnedited() || !this._formIsValid()) return
    // Only the things that have changed should be sent to the server. This avoids
    // persisting JSON properties derived from a Jackson method.
    updateProject(project.id || '', this._getChanges(), true)
  }

  _getChanges = () => {
    const {model} = this.state
    const {project} = this.props
    let changes: any = {}
    Object.keys(model).map(k => {
      if (model[k] !== project[k]) {
        changes[k] = model[k]
      }
    })
    return changes
  }

  _settingsAreUnedited = () => Object.keys(this._getChanges()).length === 0

  _formIsValid = () => {
    const {validation} = this.state
    return Object.keys(validation).every(k => validation[k])
  }

  render () {
    const {editDisabled, showDangerZone} = this.props
    const {model, validation} = this.state
    const {autoFetchHour, autoFetchMinute} = model
    const autoFetchChecked = model.autoFetchFeeds
    if (editDisabled) {
      return (
        <p className='lead text-center'>
          <strong>Warning!</strong>{' '}
          You do not have permission to edit details for this feed source.
        </p>
      )
    }
    return (
      <div>
        <ConfirmModal />
        <Panel header={<h4>{this.messages('title')}</h4>}>
          <ListGroup fill>
            <ListGroupItem>
              <FormGroup
                data-test-id='project-name-input-container'
                validationState={validationState(validation.name)}
              >
                <ControlLabel>{this.messages('fields.name')}</ControlLabel>
                <FormControl
                  value={model.name || ''}
                  name={'name'}
                  onChange={this._onChangeName}
                />
                <FormControl.Feedback />
                <HelpBlock>Required.</HelpBlock>
              </FormGroup>
            </ListGroupItem>
          </ListGroup>
        </Panel>
        <Panel header={<h4>{this.messages('fields.updates.title')}</h4>}>
          <ListGroup fill>
            <ListGroupItem>
              <FormGroup>
                <Checkbox
                  checked={autoFetchChecked}
                  onChange={this._onChangeAutoFetch}>
                  <strong>
                    {this.messages('fields.updates.autoFetchFeeds')}
                  </strong>
                </Checkbox>
                {autoFetchChecked
                  ? <DateTimeField
                    dateTime={(
                      typeof autoFetchMinute === 'number' &&
                      typeof autoFetchHour === 'number'
                    )
                      ? +moment().startOf('day')
                        .add(autoFetchHour, 'hours')
                        .add(autoFetchMinute, 'minutes')
                      : DEFAULT_FETCH_TIME
                    }
                    mode='time'
                    onChange={this._onChangeDateTime} />
                  : null
                }
              </FormGroup>
            </ListGroupItem>
          </ListGroup>
        </Panel>
        <Panel header={<h4>{this.messages('fields.location.title')}</h4>}>
          <ListGroup fill>
            <ListGroupItem>
              <FormGroup>
                <ControlLabel>
                  <Glyphicon glyph='fullscreen' />{' '}
                  {this.messages('fields.location.boundingBox')}
                </ControlLabel>
                <InputGroup ref='boundingBoxGroup' forwardRef>
                  <FormControl
                    type='text'
                    defaultValue={model.bounds
                      ? `${model.bounds.west},${model.bounds.south},${model.bounds.east},${model.bounds.north}`
                      : ''
                    }
                    ref='boundingBox' forwardRef
                    placeholder={this.messages('fields.location.boundingBoxPlaceHolder')}
                    onChange={this._onChangeBounds} />
                  {
                    <InputGroup.Button>
                      <Button
                        // TODO: wait for react-leaflet-draw to update library
                        // to re-enable bounds select
                        disabled
                        onClick={this._onOpenMapBoundsModal}>
                        <Glyphicon glyph='fullscreen' />
                      </Button>
                    </InputGroup.Button>
                  }
                </InputGroup>
              </FormGroup>
            </ListGroupItem>
            <ListGroupItem>
              <ControlLabel>
                <Glyphicon glyph='time' />{' '}
                {this.messages('fields.location.defaultTimeZone')}
              </ControlLabel>
              <TimezoneSelect
                value={model.defaultTimeZone}
                onChange={this._onChangeTimeZone} />
            </ListGroupItem>
          </ListGroup>
        </Panel>
        {showDangerZone &&
          <Panel bsStyle='danger' header={<h3>Danger zone</h3>}>
            <ListGroup fill>
              <ListGroupItem>
                <Button
                  bsStyle='danger'
                  className='pull-right'
                  data-test-id='delete-project-button'
                  onClick={this._onDeleteProject}
                >
                  <Icon type='trash' /> Delete project
                </Button>
                <h4>Delete this project.</h4>
                <p>Once you delete an project, the project and all feed sources it contains cannot be recovered.</p>
              </ListGroupItem>
            </ListGroup>
          </Panel>
        }
        <Row>
          <Col xs={12}>
            {/* Cancel button */}
            <Button
              onClick={this._onCancel}
              style={{marginRight: 10}}
            >
              {this.messages('cancel')}
            </Button>
            {/* Save button */}
            <Button
              bsStyle='primary'
              data-test-id='project-settings-form-save-button'
              disabled={
                editDisabled ||
                this._settingsAreUnedited() ||
                !this._formIsValid()
              }
              onClick={this._onSaveSettings}>
              {this.messages('save')}
            </Button>
          </Col>
        </Row>
        <MapModal ref='mapModal' forwardRef />
      </div>
    )
  }
}
