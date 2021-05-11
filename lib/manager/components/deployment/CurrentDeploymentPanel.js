// @flow

import Icon from '../../common/components/icon'
import React, { Component } from 'react'
import {
  Button,
  ButtonToolbar,
  Panel,
  Label as BsLabel
} from 'react-bootstrap'

import * as deploymentActions from '../../actions/deployments'
import { formatTimestamp } from '../../../common/util/date-time'
import { getActiveInstanceCount, getServerForId } from '../../util/deployment'
import DeploymentPreviewButton from './DeploymentPreviewButton'
import EC2InstanceCard from '../../../common/components/EC2InstanceCard'

import type {
  Deployment,
  DeploySummary,
  EC2InstanceSummary,
  OtpServer,
  Project,
  ServerJob
} from '../../../types'

type Props = {
  deployJobs: Array<ServerJob>,
  deployment: Deployment,
  downloadBuildArtifact: typeof deploymentActions.downloadBuildArtifact,
  fetchDeployment: typeof deploymentActions.fetchDeployment,
  project: Project,
  server: ?OtpServer,
  terminateEC2InstanceForDeployment: typeof deploymentActions.terminateEC2InstanceForDeployment
}

type State = {
  activeSummaryIndex: number
}

export default class CurrentDeploymentPanel extends Component<Props, State> {
  state = {
    activeSummaryIndex: 0
  }

  componentDidMount () {
    // Fetch single deployment. This JSON response will contain the #ec2Instances
    // field. The deployment prop that this component originally mounts with
    // is not guaranteed to come with this field because it was likely fetched
    // with the collection of all deployments for the project. We removed the
    // #ec2Instances field from that response because it was causing very slow
    // server responses (i.e., greater than 1 minute) and potentially the root of
    // some server memory issues.
    this.props.fetchDeployment(this.props.deployment.id)
  }

  componentWillReceiveProps (nextProps: Props) {
    // If status message changes while deployment job is in progress, re-fetch
    // deployment to update EC2 instance status.
    const oldDeployJob = this._getDeployJob()
    const newDeployJob = this._getDeployJob(nextProps)
    if (newDeployJob && oldDeployJob) {
      if (newDeployJob.status.message !== oldDeployJob.status.message) {
        this._fetchDeploymentEC2Instances()
      }
    }
  }

  _getDeployJob = (props: Props = this.props) => props.deployJobs.find(job => job.type === 'DEPLOY_TO_OTP')

  _fetchDeploymentEC2Instances = () => this.props.fetchDeployment(this.props.deployment.id)

  _getServer = () => {
    if (this.props.server) return this.props.server
    const deployJob = this._getDeployJob()
    const serverId = deployJob && deployJob.serverId
    return getServerForId(serverId, this.props.project)
  }

  handleDecrementSummary = () => {
    const {activeSummaryIndex} = this.state
    if (activeSummaryIndex > 0) this.setSummaryIndex(activeSummaryIndex - 1)
  }

  handleIncrementSummary = () => {
    const {deployJobSummaries} = this.props.deployment
    const {activeSummaryIndex} = this.state
    if (activeSummaryIndex < deployJobSummaries.length - 1) this.setSummaryIndex(activeSummaryIndex + 1)
  }

  goToFirstSummary = () => this.setSummaryIndex(0)

  goToLastSummary = () => this.setSummaryIndex(this.props.deployment.deployJobSummaries.length - 1)

  setSummaryIndex = (index: number) => {
    this.setState({activeSummaryIndex: index})
  }

  _onClickDownloadUserData = (instance: EC2InstanceSummary) => {
    const {deployment, downloadBuildArtifact} = this.props
    const {instanceId, jobId} = instance
    downloadBuildArtifact(deployment, `${instanceId}.log`, jobId)
  }

  render () {
    const { deployJobs, deployment, project } = this.props
    const { activeSummaryIndex } = this.state
    const deployJob = this._getDeployJob()
    const server = this._getServer()
    const ec2Info = server && server.ec2Info
    const hasPreviouslyDeployed = deployment.deployJobSummaries.length > 0
    return (
      <Panel header={<h3><Icon type='server' /> Deployment Summary</h3>}>
        {deployJob &&
          <div>
            Deployment in progress...<br />
            <small className='overflow' style={{maxWidth: '200px'}}>
              <Icon type='spinner' className='fa-pulse' />{' '}
              {deployJob.status.message}
            </small>
          </div>
        }
        {hasPreviouslyDeployed &&
          <ButtonToolbar block>
            <Button
              disabled={activeSummaryIndex === 0}
              bsSize='xsmall'
              onClick={this.goToFirstSummary}>
              Latest
            </Button>
            <Button
              disabled={activeSummaryIndex === 0}
              bsSize='xsmall'
              onClick={this.handleDecrementSummary}>
              <Icon type='chevron-left' />
            </Button>
            <Button bsSize='xsmall' style={{width: '80px'}}>
              {activeSummaryIndex === 0
                ? 'Latest'
                : `${activeSummaryIndex + 1} / ${deployment.deployJobSummaries.length}`
              }
            </Button>
            <Button
              disabled={activeSummaryIndex === deployment.deployJobSummaries.length - 1}
              bsSize='xsmall'
              onClick={this.handleIncrementSummary}>
              <Icon type='chevron-right' />
            </Button>
            <Button
              disabled={activeSummaryIndex === deployment.deployJobSummaries.length - 1}
              bsSize='xsmall'
              onClick={this.goToLastSummary}>
              Oldest
            </Button>
          </ButtonToolbar>
        }
        {hasPreviouslyDeployed
          ? <DeployJobSummary
            deployment={deployment}
            downloadBuildArtifact={this.props.downloadBuildArtifact}
            project={project}
            server={server}
            summary={deployment.deployJobSummaries[activeSummaryIndex]} />
          : 'No current deployment found'
        }
        {ec2Info // If has EC2 info, show EC2 instances box.
          ? <div>
            <h4>
              EC2 instances ({getActiveInstanceCount(deployment.ec2Instances)} active)
              <Button
                bsSize='xsmall'
                className='pull-right'
                onClick={this._fetchDeploymentEC2Instances}>
                <Icon type='refresh' />
              </Button>
            </h4>
            {deployment.ec2Instances
              ? <div style={{ height: '200px', overflow: 'scroll', paddingRight: '10px' }}>
                {deployment.ec2Instances.map(instance => {
                  return (
                    <EC2InstanceCard
                      key={instance.instanceId}
                      onClickDownloadUserData={this._onClickDownloadUserData}
                      job={deployJobs.find(job => job.instanceId === instance.instanceId)}
                      instance={instance}
                      terminateEC2InstanceForDeployment={this.props.terminateEC2InstanceForDeployment} />
                  )
                })}
              </div>
              : null
            }
          </div>
          : null
        }
      </Panel>
    )
  }
}

class DeployJobSummary extends Component<{
  deployment: Deployment,
  downloadBuildArtifact: typeof deploymentActions.downloadBuildArtifact,
  project: Project,
  server: ?OtpServer,
  summary: ?DeploySummary
}> {
  _getLabelForServer = (server: ?OtpServer, deployment: Deployment) => {
    return (
      <BsLabel>
        {server
          ? server.name
          : deployment.deployedTo
        }
      </BsLabel>
    )
  }

  _getJobId = () => this.props.summary ? this.props.summary.jobId : undefined

  _onClickDownloadBundle = () => {
    this.props.downloadBuildArtifact(this.props.deployment, 'bundle.zip', this._getJobId())
  }

  _onClickDownloadLogs = () => {
    this.props.downloadBuildArtifact(this.props.deployment, 'otp-build.log', this._getJobId())
  }

  _onClickDownloadGraph = () => {
    this.props.downloadBuildArtifact(this.props.deployment, 'Graph.obj', this._getJobId())
  }

  _onClickDownloadReport = () => {
    this.props.downloadBuildArtifact(this.props.deployment, 'graph-build-report.zip')
  }

  render () {
    const {deployment, project, server, summary} = this.props
    const serverLabel = this._getLabelForServer(server, deployment)
    let deploymentType = 'unknown'
    if (server) {
      deploymentType = server.ec2Info
        ? 'ELB'
        : server.internalUrl
          ? 'Build graph over wire'
          : server.s3Bucket
            ? 'S3 only'
            : 'unknown'
    }
    if (!summary) {
      throw new Error('Could not find latest deploy job summary!')
    }
    return (
      <div>
        <ul className='list-unstyled'>
          <li>
            Deployed to: {serverLabel}
          </li>
          <li>Status: {summary.status.error ? 'Failure' : 'Success'}</li>
          <li>Type: {deploymentType}</li>
          <li>Deploy time: {formatTimestamp(summary.finishTime)}</li>
          {summary
            ? <li>otp version: {summary.otpVersion}</li>
            : null
          }
        </ul>
        <ButtonToolbar>
          <Button
            bsSize='xsmall'
            onClick={this._onClickDownloadGraph}>
            <Icon type='ellipsis-h' /> Graph.obj
          </Button>
          <Button
            bsSize='xsmall'
            onClick={this._onClickDownloadLogs}>
            <Icon type='file-text-o' /> Build log
          </Button>
          <Button
            bsSize='xsmall'
            onClick={this._onClickDownloadReport}>
            <Icon type='file-zip-o' /> Graph build report
          </Button>
          <Button
            bsSize='xsmall'
            onClick={this._onClickDownloadBundle}>
            <Icon type='file-zip-o' /> Bundle
          </Button>
        </ButtonToolbar>
        <div style={{ margin: '20px 0' }}>
          <DeploymentPreviewButton
            block
            deployment={deployment}
            project={project} />
        </div>
      </div>
    )
  }
}
