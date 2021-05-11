// @flow

import humanizeDuration from 'humanize-duration'
import moment from 'moment'
import Icon from '../../common/components/icon'
import React, { Component } from 'react'
import { Button, Panel } from 'react-bootstrap'
import {Link} from 'react-router-dom'

import * as deploymentActions from '../../manager/actions/deployments'
import { formatTimestamp } from '../util/date-time'

import type { EC2InstanceSummary, ServerJob } from '../../types'

type Props = {
  instance: EC2InstanceSummary,
  job?: ServerJob,
  onClickDownloadUserData?: EC2InstanceSummary => void,
  showDeploymentLink?: boolean,
  terminateEC2InstanceForDeployment: typeof deploymentActions.terminateEC2InstanceForDeployment
}

export default class EC2InstanceCard extends Component<Props> {
  _getTimeActive = () => {
    const { instance } = this.props
    // If instance hasn't launched, don't calculate time.
    if (!instance.launchTime) return 'N/A'
    // Set end time as termination time or now.
    const endTimestamp = this._getTerminationTime()
    let endTime = endTimestamp ? moment(endTimestamp) : moment()
    const launchTime = moment(instance.launchTime)
    const duration = moment.duration(endTime.diff(launchTime))
    const millisecondsRounded = Math.floor(duration.asMilliseconds() / 1000) * 1000
    // Include a max of two units to display duration (e.g., hours + minutes)
    return humanizeDuration(millisecondsRounded, { largest: 2 })
  }

  _onClickDownloadUserDataLog = () => {
    const {instance, onClickDownloadUserData} = this.props
    onClickDownloadUserData && onClickDownloadUserData(instance)
  }

  _getInstanceUrl = () => {
    const { instance } = this.props
    return `https://console.aws.amazon.com/ec2/v2/home?region=${instance.availabilityZone.slice(0, -1)}#Instances:search=${instance.instanceId}`
  }

  _getStatusIcon = (instance: EC2InstanceSummary) => {
    // 'pending' | 'running' | 'shutting-down' | 'stopping' | 'stopped' | 'terminated'
    const color = instance.state.name === 'running'
      ? 'green'
      : instance.state.name === 'pending' || instance.state.name === 'shutting-down'
        ? 'yellow'
        : 'red'
    return <Icon title={instance.state.name} type='circle' style={{ color }} />
  }

  /**
   * Try to parse stateTransitionReason for date that shutdown was initiated.
   * @return {string} date string or null if string not found
   */
  _getTerminationTime = () => {
    const regExp = /\(([^)]+)\)/
    const matches = regExp.exec(this.props.instance.stateTransitionReason)
    if (matches && matches[1]) {
      return matches[1]
    }
    return null
  }

  handleTerminate = () => {
    const {instance, terminateEC2InstanceForDeployment} = this.props
    const { deploymentId, instanceId } = instance
    if (window.confirm('Are you sure you want to terminate this EC2 instance? This action cannot be undone and will remove this instance from the load balancer.')) {
      terminateEC2InstanceForDeployment(deploymentId, [instanceId])
    }
  }

  render () {
    const { instance, job } = this.props
    const { deploymentId, projectId } = instance
    const terminationTime = this._getTerminationTime()
    return (
      <Panel>
        <div>
          {this._getStatusIcon(instance)} {instance.instanceId}{' '}
          <small>({instance.state.name})</small>
        </div>
        <div>
          <small>
            <div className='overflow' style={{ width: '212px' }}>
              <Icon type='id-card-o' /> {instance.name}
            </div>
            {this.props.showDeploymentLink
              ? <div>
                <Icon type='globe' />{' '}
                <Link to={`/project/${projectId}/deployments/${deploymentId}`}>
                  View deployment
                </Link>
              </div>
              : null
            }
            <div>
              <Icon type='clock-o' /> {this._getTimeActive()}{' '}
            </div>
            <div>
              <Icon type='rocket' /> {formatTimestamp(instance.launchTime)}
            </div>
            <div>
              <Icon type='server' /> {instance.instanceType}
            </div>
            <div>
              <Icon type='info' />{' '}
              {job
                ? job.status.message
                : terminationTime
                  ? `Terminated ${formatTimestamp(terminationTime)}`
                  : instance.state.name === 'pending'
                    ? 'Booting up.'
                    : instance.state.name === 'terminated'
                      ? 'Terminated.'
                      : 'Running as server.'
              }
            </div>
            <div>
              {instance.publicIpAddress
                ? <a target='_blank' href={`http://${instance.publicIpAddress}/otp`}>
                  {instance.publicIpAddress}
                </a>
                : 'No public IP'
              }
              {this.props.onClickDownloadUserData
                ? <Button
                  bsSize='xsmall'
                  bsStyle='link'
                  style={{marginTop: 0, paddingTop: 0, borderTop: 0, marginLeft: '10px'}}
                  onClick={this._onClickDownloadUserDataLog}>
                  <Icon type='download' /> log
                </Button>
                : null
              }
              <a
                style={{ marginLeft: '10px', marginRight: '10px' }}
                target='_blank'
                href={this._getInstanceUrl()}
              >
                <Icon type='external-link' /> AWS
              </a>
              <Button
                bsStyle='link'
                bsSize='small'
                disabled={instance.state.name === 'terminated' || instance.state.name === 'shutting-down'}
                style={{padding: '0 2px 4px 2px'}}
                title='Terminate instance'
                onClick={this.handleTerminate}>
                <span className='text-danger'><Icon type='trash' /></span>
              </Button>
            </div>
          </small>
        </div>
      </Panel>
    )
  }
}
