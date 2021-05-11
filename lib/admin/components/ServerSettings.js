// @flow

import Icon from '../../common/components/icon'
import objectPath from 'object-path'
import React, {Component} from 'react'
import {connect} from 'react-redux'
import Select from 'react-select'
import {
  Button,
  ButtonToolbar,
  Checkbox,
  Col,
  ControlLabel,
  FormGroup,
  Glyphicon,
  Panel,
  Row
} from 'react-bootstrap'
import update from 'immutability-helper'

import { getComponentMessages, getConfigProperty } from '../../common/util/config'
import EC2InstanceCard from '../../common/components/EC2InstanceCard'
import FormInput from '../../common/components/FormInput'
import * as adminActions from '../actions/admin'
import * as deploymentActions from '../../manager/actions/deployments'
import CollapsiblePanel from '../../manager/components/CollapsiblePanel'
import {
  getActiveInstanceCount,
  EC2_INFO_FIELDS,
  SERVER_FIELDS
} from '../../manager/util/deployment'

import type { OtpServer, Project, ReactSelectOption } from '../../types'
import type { AppState, AdminServersState } from '../../types/reducers'

type ContainerProps = {editDisabled: boolean}
type Props = ContainerProps & {
  deleteServer: typeof adminActions.deleteServer,
  fetchServer: typeof adminActions.fetchServer,
  fetchServers: typeof adminActions.fetchServers,
  otpServers: AdminServersState,
  projects: Array<Project>,
  terminateEC2InstanceForDeployment: typeof deploymentActions.terminateEC2InstanceForDeployment,
  terminateEC2Instances: typeof adminActions.terminateEC2Instances,
  updateServer: typeof adminActions.updateServer
}

type State = {
  hasEdits: boolean,
  otpServers: Array<OtpServer>
}

class ServerSettings extends Component<Props, State> {
  messages = getComponentMessages('ServerSettings')

  state = {
    hasEdits: false,
    otpServers: []
  }

  componentWillMount () {
    this._updateStateFromProps(this.props)
  }

  componentWillReceiveProps (nextProps: Props) {
    this._updateStateFromProps(nextProps)
  }

  _updateStateFromProps = props => {
    if (props.otpServers && props.otpServers.data) {
      this.setState({ otpServers: props.otpServers.data, hasEdits: false })
    }
  }

  _applyEdit = (stateUpdate) => {
    const state = update(this.state, stateUpdate)
    state.hasEdits = true
    this.setState(state)
  }

  _onToggleEc2Info = (evt, index) => {
    const stateUpdate = {}
    objectPath.set(
      stateUpdate,
      `otpServers.${index}.ec2Info.$set`,
      evt.target.checked ? {} : null
    )
    this._applyEdit(stateUpdate)
  }

  _getOnChange = (evt, index) => {
    let item = SERVER_FIELDS.find(f => f.name === evt.target.name)
    if (!item) item = EC2_INFO_FIELDS.find(f => f.name === evt.target.name)
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
    this._applyEdit(stateUpdate)
  }

  _onChangeSplit = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    const splitValues = evt.target.value.split(',').filter(item => item)
    objectPath.set(stateUpdate, `${name}.$set`, splitValues)
    this._applyEdit(stateUpdate)
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

  _onRefresh = () => this.props.fetchServers()

  _onDeleteServer = (index: number) => {
    if (window.confirm('Are you sure you want to delete this server record?')) {
      const server = this.state.otpServers[index]
      if (!server.id) this.setState(update(this.state, {otpServers: {$splice: [[index, 1]]}}))
      else this.props.deleteServer(this.state.otpServers[index])
    }
  }

  _onExpandServer = (index: number) => {
    this.props.fetchServer(this.state.otpServers[index].id)
  }

  _onSaveServer = (index: number) => this.props.updateServer(this.state.otpServers[index])

  _onChange = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    // If value is empty string or undefined, set to null in settings object.
    // Otherwise, certain fields (such as 'fares') would cause issues with OTP.
    objectPath.set(stateUpdate, `${name}.$set`, evt.target.value || null)
    this._applyEdit(stateUpdate)
  }

  _onChangeNumber = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    objectPath.set(stateUpdate, `${name}.$set`, +evt.target.value)
    this._applyEdit(stateUpdate)
  }

  _onChangeProject = (option, index) => {
    const stateUpdate = {}
    const value = option ? option.value : null
    objectPath.set(stateUpdate, `otpServers.${index}.projectId.$set`, value)
    this._applyEdit(stateUpdate)
  }

  _onSelectBool = (evt, stateUpdate = {}, index) => {
    const name = this._getFieldName(evt, index)
    objectPath.set(stateUpdate, `${name}.$set`, (evt.target.value === 'true'))
    this._applyEdit(stateUpdate)
  }

  _getFieldName = (evt, index) => index !== null
    ? evt.target.name.replace('$index', `${index}`)
    : evt.target.name

  render () {
    const { projects, terminateEC2Instances } = this.props
    const { otpServers } = this.state
    const serverDocRoot = getConfigProperty('application.docs_url')
    const serverDocUrl = serverDocRoot
      ? (serverDocRoot + '/user/setting-up-aws-servers') : null

    return (
      <div className='server-settings-panel'>
        {/* OTP server settings */}
        <Panel
          header={
            <Row>
              <Col xs={12}>
                <ButtonToolbar className='pull-right'>
                  <Button
                    onClick={this._onRefresh}>
                    <Glyphicon glyph='refresh' /> {this.messages('deployment.otpServers.refresh')}
                  </Button>
                  <Button
                    bsStyle='primary'
                    data-test-id='add-server-button'
                    onClick={this._onAddServer}>
                    <Glyphicon glyph='plus' /> {this.messages('deployment.otpServers.new')}
                  </Button>
                </ButtonToolbar>
                <h4 style={{margin: 0, padding: 0, paddingTop: '10px'}}>
                  <Icon type='server' /> {this.messages('deployment.otpServers.title')}
                </h4>
              </Col>
            </Row>
          }>
          <div>
            {otpServers && otpServers.length
              ? otpServers.map((server, index) => (
                <CollapsiblePanel
                  data={server}
                  defaultExpanded={!server.name}
                  fields={SERVER_FIELDS}
                  index={index}
                  key={`server-${index}`}
                  onChange={this._getOnChange}
                  onEnter={this._onExpandServer}
                  onRemove={this._onDeleteServer}
                  onSave={this._onSaveServer}
                  saveDisabled={!this.state.hasEdits}
                  showButtonsOnBottom
                  testId={server.name ||
                    `[${this.messages('deployment.otpServers.serverPlaceholder')}]`}
                  title={server.name
                    ? <span>
                      {server.name}{'  '}
                      <small>{server.publicUrl}</small>
                    </span>
                    : `[${this.messages('deployment.otpServers.serverPlaceholder')}]`
                  }
                >
                  <ServerSpecialFields
                    index={index}
                    getOnChange={this._getOnChange}
                    server={server}
                    terminateEC2InstanceForDeployment={this.props.terminateEC2InstanceForDeployment}
                    terminateEC2Instances={terminateEC2Instances}
                    onChangeProject={this._onChangeProject}
                    onToggleEc2Info={this._onToggleEc2Info}
                    projects={projects} />
                </CollapsiblePanel>
              ))
              : <p className='lead text-center'>No servers defined</p>
            }
          </div>
        </Panel>
        <Panel>
          <div>
            <h3>Instructions</h3>
            <p>
              <a href={serverDocUrl} target='_blank'>
                Instructions for setting up OTP deployment servers on AWS
              </a>
            </p>
          </div>
        </Panel>
      </div>
    )
  }
}

type ServerSpecialFieldsProps = {
  getOnChange: any,
  index: number,
  onChangeProject: (ReactSelectOption, number) => void,
  onToggleEc2Info: any,
  projects: Array<Project>,
  server: OtpServer,
  terminateEC2InstanceForDeployment: typeof deploymentActions.terminateEC2InstanceForDeployment,
  terminateEC2Instances: typeof adminActions.terminateEC2Instances
}

class ServerSpecialFields extends Component<ServerSpecialFieldsProps> {
  _onChange = evt => this.props.getOnChange(evt, this.props.index)

  _onChangeProject = (val: ReactSelectOption) =>
    this.props.onChangeProject(val, this.props.index)

  _onToggleEc2Info = (evt) => this.props.onToggleEc2Info(evt, this.props.index)

  _terminateEC2Instances = () => {
    const {server, terminateEC2Instances} = this.props
    const count = getActiveInstanceCount(server.ec2Instances)
    if (window.confirm(`Are you sure you want to terminate ${count} instance(s)?\n\n WARNING: This will kill OTP service for any deployments launched for this server.`)) {
      terminateEC2Instances(server)
    }
  }

  render () {
    const {projects, server} = this.props
    return (
      <div>
        <Col xs={12}>
          <FormGroup>
            <ControlLabel>Project specific?</ControlLabel>
            <Select
              style={{marginBottom: '20px'}}
              clearable
              placeholder='Assign to a project or leave open for any project'
              options={projects.map(p => ({value: p.id, label: p.name}))}
              value={server.projectId}
              onChange={this._onChangeProject} />
          </FormGroup>
        </Col>
        <Col>
          <Col xs={6}>
            <FormGroup>
              <Checkbox
                checked={!!server.ec2Info}
                onChange={this._onToggleEc2Info}>
                Use Elastic Load Balancer (ELB)?
              </Checkbox>
            </FormGroup>
            {server.ec2Info
              ? <div>
                {EC2_INFO_FIELDS.map((f, i) => {
                  // Make flow happy by putting the ec2 info into a
                  // local variable.
                  const {ec2Info} = server
                  if (!ec2Info) return null
                  return <FormInput
                    key={i}
                    field={f}
                    value={ec2Info[f.name.split('.').slice(-1)[0]]}
                    onChange={this._onChange} />
                })}
              </div>
              : null
            }
          </Col>
          {server.ec2Info
            ? <Col xs={6}>
              <Button
                block
                style={{marginBottom: '20px'}}
                bsStyle='warning'
                disabled={getActiveInstanceCount(server.ec2Instances) === 0}
                onClick={this._terminateEC2Instances}>
                <Icon type='window-close' /> Terminate EC2 Instances
              </Button>
              <div style={{ height: '492px', overflowY: 'scroll', paddingRight: '10px' }}>
                {server.ec2Instances && server.ec2Instances.length > 0
                  ? server.ec2Instances.map(instance => (
                    <EC2InstanceCard
                      key={instance.instanceId}
                      showDeploymentLink
                      terminateEC2InstanceForDeployment={this.props.terminateEC2InstanceForDeployment}
                      instance={instance} />
                  ))
                  : 'No EC2 instances associated with server.'
                }
              </div>
            </Col>
            : null
          }
        </Col>
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
  fetchServer,
  fetchServers,
  terminateEC2Instances,
  updateServer
} = adminActions

const { terminateEC2InstanceForDeployment } = deploymentActions

const mapDispatchToProps = {
  deleteServer,
  fetchServer,
  fetchServers,
  terminateEC2InstanceForDeployment,
  terminateEC2Instances,
  updateServer
}

export default connect(mapStateToProps, mapDispatchToProps)(ServerSettings)
