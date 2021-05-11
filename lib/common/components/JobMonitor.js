// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {ProgressBar, Button, OverlayTrigger, Popover} from 'react-bootstrap'
import {Link} from 'react-router-dom'

import {removeRetiredJob} from '../../manager/actions/status'
import SidebarPopover from './SidebarPopover'
import {getConfigProperty} from '../util/config'

import type {ServerJob} from '../../types'
import type {JobStatusState} from '../../types/reducers'

type Props = {
  close: () => void,
  expanded: boolean,
  jobMonitor: JobStatusState,
  removeRetiredJob: typeof removeRetiredJob,
  visible: boolean
}

const sortByDate = (a: ServerJob, b: ServerJob) =>
  new Date(a.status.initialized) - new Date(b.status.initialized)

export default class JobMonitor extends Component<Props> {
  popover = null

  // Remove any retired jobs from the monitor
  removeAll = () => {
    const { jobMonitor } = this.props
    jobMonitor.retired.forEach(job => this.props.removeRetiredJob(job))

    // If no active jobs left, then close the popover
    if (jobMonitor.jobs.length === 0) this.props.close()
  }

  render () {
    const {jobMonitor, removeRetiredJob} = this.props
    const {jobs, retired} = jobMonitor
    const activeJobsMessage = retired.length && jobs.length === 0
      ? <span data-test-id='all-jobs-completed'>All jobs completed</span>
      : <span data-test-id='possibly-active-jobs'>
        {`${jobs.length ? jobs.length : 'No'} active job${!jobs.length || jobs.length > 1 ? 's' : ''}`}
      </span>
    return (
      <SidebarPopover
        ref={(SidebarPopover) => { this.popover = SidebarPopover }}
        title='Server Jobs'
        fixedHeight={300}
        minMarginBottom={75}
        {...this.props}
      >
        <div className='job-monitor'>
          {/* The main list of jobs */}
          <div className='job-list'>
            <ul className='list-unstyled'>
              {jobs.sort(sortByDate).map(job => {
                const pctComplete = Math.round(job.status ? job.status.percentComplete : 0)
                return (
                  <li key={job.jobId} className='job-container'>
                    <div className='job-spinner-div'>
                      <Icon type='spinner' className='fa-pulse' />
                    </div>
                    <div className='job-container-inner'>
                      <div>
                        <strong>{job.name}</strong>
                      </div>
                      <ProgressBar active
                        style={{ width: 190 }}
                        label={`${pctComplete}%`}
                        now={pctComplete}
                        className='job-status-progress-bar' />
                      <div className='job-status-message' >
                        {job.status ? job.status.message : 'waiting'}
                      </div>
                    </div>
                  </li>
                )
              })}
              {retired.sort(sortByDate).map(job => (
                <RetiredJob
                  key={`retired-${job.jobId}`}
                  job={job}
                  removeRetiredJob={removeRetiredJob} />
              ))}
            </ul>
          </div>
          {/* Lower panel job count and clear-all button */}
          <div style={{ marginTop: 8 }}>
            <Button
              style={{ float: 'right' }}
              bsSize='small'
              data-test-id='clear-completed-jobs-button'
              disabled={retired.length === 0}
              onClick={this.removeAll}>
              <Icon type='times-circle' /> Clear completed
            </Button>
            <div style={{ paddingTop: 6, fontSize: 13 }}>
              {activeJobsMessage}
            </div>
          </div>
        </div>
      </SidebarPopover>
    )
  }
}

class RetiredJob extends Component<{
  job: ServerJob,
  removeRetiredJob: typeof removeRetiredJob
}> {
  removeJob = () => this.props.removeRetiredJob(this.props.job)

  /**
   * Get path in UI to object created from completed server job. Note: not all
   * jobs will have links (e.g., only PROCESS_FEED should result in a link to
   * the feed version, not VALIDATE_FEED or LOAD_FEED).
   */
  _getPathToObject = () => {
    const {job} = this.props
    switch (job.type) {
      case 'CREATE_SNAPSHOT':
        return job.feedSourceId ? `/feed/${job.feedSourceId}/snapshots` : null
      case 'DEPLOY_TO_OTP':
        if (!job.projectId || !job.deploymentId) return null
        else return `/project/${job.projectId}/deployments/${job.deploymentId}`
      case 'MAKE_PROJECT_PUBLIC':
        return job.projectId ? `/project/${job.projectId}` : null
      case 'PROCESS_FEED':
        return job.feedSourceId ? `/feed/${job.feedSourceId}` : null
      default:
        return null
    }
  }

  render () {
    const {job} = this.props
    const path = this._getPathToObject()
    const supportEmail = getConfigProperty('application.support_email')
    return (
      <li className='job-container'>
        <div style={{ float: 'left' }}>
          {job.status && job.status.error
            ? <Icon className='text-warning' type='exclamation-circle' />
            : <Icon className='text-success' type='check' />
          }
        </div>
        <div className='job-container-inner'>
          <div style={{ float: 'right' }}>
            <Button
              className='close-job-button'
              bsStyle='link'
              style={{ padding: 'none' }}
              onClick={this.removeJob}>
              <Icon className='pull-right' type='times-circle' />
            </Button>
          </div>
          <div>
            <div style={{
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: 170,
              whiteSpace: 'nowrap'
            }}>
              <strong
                title={job.name}>
                {job.name}
              </strong>
            </div>
            <div className='job-status-message'>
              {job.status.message}{' '}
              {path && !job.status.error
                ? <Link to={this._getPathToObject()}>
                  View
                </Link>
                : null}
              {job.status.exceptionDetails
                ? <OverlayTrigger
                  trigger='click'
                  placement='right'
                  overlay={
                    <Popover
                      id='job-exception-detail'
                      style={{
                        minWidth: '400px'
                      }}
                      title={
                        <span>
                          <Icon type='bug' /> Oh no! Looks like an error has occurred.
                        </span>
                      }>
                      {supportEmail
                        ? <p>
                          To submit an error report email a screenshot of your browser
                          window, the following text (current URL and error details),
                          and a detailed description of the steps you followed
                          to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
                        </p>
                        : null
                      }
                      <p>{window.location.href}</p>
                      <span style={{whiteSpace: 'pre', fontSize: 'xx-small'}}>
                        {job.status.exceptionDetails}
                      </span>
                    </Popover>
                  }>
                  <Button
                    bsSize='small'
                    style={{padding: '0px'}}
                    bsStyle='link'>
                    <Icon type='bug' />
                  </Button>
                </OverlayTrigger>
                : null
              }
            </div>
          </div>
        </div>
      </li>
    )
  }
}
