// @flow

import React, {Component} from 'react'
import { ControlLabel, FormControl, FormGroup, Radio, Row, Col } from 'react-bootstrap'
import DateTimeField from 'react-datetime'
import Select from 'react-select'
import moment from 'moment'

import * as organizationActions from '../actions/organizations'
import {getComponentMessages} from '../../common/util/config'
import toSentenceCase from '../../common/util/to-sentence-case'

import type {Organization, Project} from '../../types'

type Props = {
  createOrganization: typeof organizationActions.createOrganization,
  organization?: Organization,
  projects: Array<Project>,
  updateOrganization: typeof organizationActions.updateOrganization
}

type State = any

type Option = {label: string, value: string}
type ProjectOption = Option & {project: Project}

const orgFields = ['name', 'logoUrl']

export default class OrganizationSettings extends Component<Props, State> {
  messages = getComponentMessages('OrganizationSettings')
  componentWillMount () {
    this.setState(this.props.organization || {
      // default values for organization
      usageTier: 'LOW',
      subscriptionBeginDate: +moment().startOf('day'),
      subscriptionEndDate: +moment().startOf('day').add(1, 'year').add(1, 'day'),
      name: undefined,
      logoUrl: undefined
    })
  }

  getSettings () {
    if (this.isValid()) {
      return this.state
    } else {
      return null
    }
  }

  isValid () {
    if (this.state.name) {
      return true
    } else {
      return false
    }
  }

  save = () => {
    const {createOrganization, organization, updateOrganization} = this.props
    if (!organization) {
      createOrganization(this.state)
    } else {
      updateOrganization(organization, this.state)
    }
  }

  handleChange = (evt: SyntheticInputEvent<HTMLInputElement>) =>
    this.setState({[evt.target.name]: evt.target.value})

  handleDateChange = (name: string) => (value: string) => {
    return this.setState({[name]: +value})
  }

  projectToOption = (project: Project): ProjectOption =>
    ({label: project.name, value: project.id, project})

  extensionToOption = (e: string): Option =>
    ({value: e, label: toSentenceCase(e.replace('_', ' '))})

  _onChangeProjects = (values: Array<ProjectOption>) =>
    this.setState({projects: values ? values.map(v => v.project) : []})

  _onChangeExtensions = (values: Array<Option>) =>
    this.setState({extensions: values ? values.map(v => v.value) : []})

  render () {
    console.log(this.state)
    const { organization, projects } = this.props
    const extensions = [
      'GTFS_PLUS',
      'DEPLOYMENT',
      'VALIDATOR',
      'ALERTS',
      'SIGN_CONFIG'
    ]
    const USAGE_TIERS = [{
      label: this.messages('usageTier.low'),
      value: 'LOW'
    }, {
      label: this.messages('usageTier.medium'),
      value: 'MEDIUM'
    }, {
      label: this.messages('usageTier.high'),
      value: 'HIGH'
    }]
    return (
      <Row>
        <Col xs={12}>
          <h4>{this.messages('orgDetails')}</h4>
          {orgFields.map((f, index) => (
            <FormGroup key={index}>
              <ControlLabel>{this.messages(`${f}.label`)}</ControlLabel>
              <FormControl
                type='text'
                name={f}
                value={this.state[f] || ''}
                placeholder={this.messages(`${f}.placeholder`)}
                onChange={this.handleChange} />
            </FormGroup>
          ))}
          <FormGroup>
            <ControlLabel>{this.messages('projects')}</ControlLabel>
            <Select
              multi
              options={projects
                .filter(p => p.organizationId === null || (organization && p.organizationId === organization.id))
                .map(this.projectToOption)}
              value={this.state.projects && this.state.projects.map(this.projectToOption)}
              onChange={this._onChangeProjects} />
          </FormGroup>
          <h4>{this.messages('subDetails')}</h4>
          <FormGroup>
            <ControlLabel style={{marginRight: '5px'}}>Usage tier</ControlLabel>
            {USAGE_TIERS.map((tier, index) => (
              <Radio
                checked={this.state.usageTier === tier.value}
                key={index}
                name='usageTier'
                onChange={this.handleChange}
                value={tier.value}
                inline>{tier.label}</Radio>
            ))}
          </FormGroup>
          <Row>
            <Col xs={6}>
              <FormGroup>
                <ControlLabel>{this.messages('subscriptionBeginDate')}</ControlLabel>
                <DateTimeField
                  name='subscriptionBeginDate'
                  mode='date'
                  dateTime={this.state.subscriptionBeginDate}
                  onChange={this.handleDateChange('subscriptionBeginDate')} />
              </FormGroup>
            </Col>
            <Col xs={6}>
              <FormGroup>
                <ControlLabel>{this.messages('subscriptionEndDate')}</ControlLabel>
                <DateTimeField
                  name='subscriptionEndDate'
                  mode='date'
                  dateTime={this.state.subscriptionEndDate}
                  onChange={this.handleDateChange('subscriptionEndDate')} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <FormGroup>
                <ControlLabel>{this.messages('extensions')}</ControlLabel>
                <Select
                  multi
                  options={extensions.map(this.extensionToOption)}
                  value={this.state.extensions && this.state.extensions.map(this.extensionToOption)}
                  onChange={this._onChangeExtensions} />
              </FormGroup>
            </Col>
          </Row>
        </Col>
      </Row>
    )
  }
}
