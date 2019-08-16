// @flow

import Icon from '@conveyal/woonerf/components/icon'
import objectPath from 'object-path'
import React, {Component} from 'react'
import {connect} from 'react-redux'
import Select from 'react-select'
import {
  Row,
  Col,
  Button,
  Panel,
  Glyphicon,
  FormGroup,
  ControlLabel
} from 'react-bootstrap'
import update from 'react-addons-update'

import { getComponentMessages } from '../../common/util/config'
import * as adminActions from '../actions/admin'
import CollapsiblePanel from '../../manager/components/CollapsiblePanel'
import { FIELDS, SERVER_FIELDS, UPDATER_FIELDS } from '../../manager/util/deployment'

import type { OtpServer, Project } from '../../types'
import type { AppState, AdminServersState } from '../../types/reducers'

type ContainerProps = {editDisabled: boolean}
type Props = ContainerProps & {
  deleteServer: typeof adminActions.deleteServer,
  otpServers: AdminServersState,
  projects: Array<Project>,
  updateServer: typeof adminActions.updateServer
}

type State = {
  otpServers: Array<OtpServer>
}

class ServerSettings extends Component<Props, State> {
  messages = getComponentMessages('ServerSettings')

  state = {
    otpServers: []
  }

  componentWillMount () {
    this._updateStateFromProps(this.props)
  }

  componentWillReceiveProps (nextProps) {
    this._updateStateFromProps(nextProps)
  }

  _updateStateFromProps = props => {
    if (props.otpServers && props.otpServers.data) {
      this.setState({ otpServers: props.otpServers.data })
    }
  }

  _getOnChange = (evt, index) => {
    let item = FIELDS.find(f => f.name === evt.target.name)
    if (!item) item = UPDATER_FIELDS.find(f => f.name === evt.target.name)
    if (!item) item = SERVER_FIELDS.find(f => f.name === evt.target.name)
    if (item) {
      const stateUpdate = {}
      item.effects && item.effects.forEach(e => {
        objectPath.set(stateUpdate, `${e.key}.$set`, e.value)
      })
      switch (item.type) {
        case 'checkbox':
          return this._onChangeCheckbox(evt, stateUpdate, index)
        case 'select-bool':
          return this._onSelectBool(evt, stateUpdate, index)
        case 'number':
          return this._onChangeNumber(evt, stateUpdate, index)
        default:
          // check for split property, which indicates that comma-separated list should be split into array
          if (item.split) {
            return this._onChangeSplit(evt, stateUpdate, index)
          } else {
            return this._onChange(evt, stateUpdate, index)
          }
      }
    } else {
      console.warn('no onChange function available')
    }
  }

  _onChangeCheckbox = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    objectPath.set(stateUpdate, `${name}.$set`, evt.target.checked)
    this.setState(update(this.state, stateUpdate))
  }

  _onChangeSplit = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    const splitValues = evt.target.value.split(',').filter(item => item)
    objectPath.set(stateUpdate, `${name}.$set`, splitValues)
    this.setState(update(this.state, stateUpdate))
  }

  _onAddServer = () => {
    const newServer = {
      name: '',
      publicUrl: '',
      internalUrl: [],
      admin: false
    }
    const stateUpdate = { otpServers: { $push: [newServer] } }
    this.setState(update(this.state, stateUpdate))
  }

  _onRemoveServer = (index: number) => {
    if (window.confirm('Are you sure you want to delete this server record?')) {
      const server = this.state.otpServers[index]
      if (!server.id) this.setState(update(this.state, {otpServers: {$splice: [[index, 1]]}}))
      else this.props.deleteServer(this.state.otpServers[index])
    }
  }

  _onSaveServer = (index: number) => this.props.updateServer(this.state.otpServers[index])

  _onChange = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    // If value is empty string or undefined, set to null in settings object.
    // Otherwise, certain fields (such as 'fares') would cause issues with OTP.
    objectPath.set(stateUpdate, `${name}.$set`, evt.target.value || null)
    this.setState(update(this.state, stateUpdate))
  }

  _onChangeNumber = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    objectPath.set(stateUpdate, `${name}.$set`, +evt.target.value)
    this.setState(update(this.state, stateUpdate))
  }

  _onChangeProject = (option, stateUpdate = {}, index) => {
    const value = option ? option.value : null
    objectPath.set(stateUpdate, `otpServers.${index}.projectId.$set`, value)
    this.setState(update(this.state, stateUpdate))
  }

  _onSelectBool = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    objectPath.set(stateUpdate, `${name}.$set`, (evt.target.value === 'true'))
    this.setState(update(this.state, stateUpdate))
  }

  _getFieldName = (evt, index) => index !== null
    ? evt.target.name.replace('$index', `${index}`)
    : evt.target.name

  render () {
    const { otpServers } = this.state
    return (
      <div className='server-settings-panel'>
        {/* OTP server settings */}
        <Panel
          header={
            <Row>
              <Col xs={12}>
                <Button
                  bsStyle='primary'
                  className='pull-right'
                  data-test-id='add-server-button'
                  onClick={this._onAddServer}>
                  <Glyphicon glyph='plus' /> {this.messages('deployment.otpServers.new')}
                </Button>
                <h4 style={{margin: 0, padding: 0, paddingTop: '10px'}}>
                  <Icon type='server' /> {this.messages('deployment.otpServers.title')}
                </h4>
              </Col>
            </Row>
          }>
          <div>
            {otpServers && otpServers.length
              ? otpServers.map((server, i) => (
                <CollapsiblePanel
                  key={i}
                  index={i}
                  fields={SERVER_FIELDS}
                  defaultExpanded={!server.name}
                  title={server.name
                    ? <span>
                      {server.name}{'  '}
                      <small>{server.publicUrl}</small>
                    </span>
                    : `[${this.messages('deployment.otpServers.serverPlaceholder')}]`
                  }
                  data={server}
                  children={
                    <Col xs={6}>
                      <FormGroup>
                        <ControlLabel>Project specific?</ControlLabel>
                        <Select
                          style={{marginBottom: '20px'}}
                          clearable
                          placeholder='Assign to a project or leave open for any project'
                          options={this.props.projects.map(p => ({value: p.id, label: p.name}))}
                          value={server.projectId}
                          onChange={val => this._onChangeProject(val, {}, i)} />
                      </FormGroup>
                    </Col>
                  }
                  onRemove={this._onRemoveServer}
                  onSave={this._onSaveServer}
                  onChange={this._getOnChange} />
              ))
              : <p className='lead text-center'>No servers defined</p>
            }
          </div>
        </Panel>
        <Panel>
          <div>
            <h3>Instructions</h3>
            <p>
              Here you can create and manage servers/targets to deploy bundled transit and
              street network data to. There are a handful of ways to configure
              these servers, but the below instructions detail the generally
              recommended approaches.
            </p>
            <h4>Production deployments</h4>
            <p>
              The recommended approach for production deployments is to create
              an elastic load balancer (ELB) in AWS along with a target group.
              You should then reference the target group ARN in the server
              (an S3 bucket must be identified as well). The steps for this
              approach are as follows:
            </p>
            <ol>
              <li>Data bundle is uploaded to S3.</li>
              <li>EC2 server is commissioned.</li>
              <li>EC2 server downloads data and begins building graph.</li>
              <li>EC2 server uploads built graph to S3 and then starts OTP process to load graph.</li>
              <li>If more EC2 servers are designated, these will be started and told to download and load graph.</li>
            </ol>
            <h4>Test deployments</h4>
            <p>
              A flexible approach for test deployments is to create a stable EC2
              instance with a good amount of memory. Identify one or more <code>internalUrls</code>
              which is the URL where the OTP server is listening for a <code>buildGraphOverWire</code>
              request. (Note: the <code>publicUrl</code> should point to a user interface
              for the trip planner.)
            </p>
          </div>
        </Panel>
      </div>
    )
  }
}

const mapStateToProps = (state: AppState, ownProps: ContainerProps) => {
  return {
    otpServers: state.admin.servers,
    projects: state.projects.all
  }
}

const {
  deleteServer,
  updateServer
} = adminActions

const mapDispatchToProps = {
  deleteServer,
  updateServer
}

export default connect(mapStateToProps, mapDispatchToProps)(ServerSettings)