// @flow

import * as React from 'react'
import moment from 'moment'
import { browserHistory } from 'react-router'
import { createAction, type ActionType } from 'redux-actions'

import { createVoidPayloadAction, secureFetch } from '../../common/actions'
import { API_PREFIX } from '../../common/constants'
import { getComponentMessages, isExtensionEnabled } from '../../common/util/config'
import { fetchDeployment } from './deployments'
import { fetchFeedSource } from './feeds'
import { fetchProjectWithFeeds } from './projects'
import { downloadSnapshotViaCredentials } from '../../editor/actions/snapshots'

import type {DataToolsConfig, Feed, MergeFeedsResult, ServerJob} from '../../types'
import type {dispatchFn, getStateFn} from '../../types/reducers'

type ErrorMessage = {
  action?: string,
  detail?: any,
  message: string,
  title?: string
}

type ModalContent = {
  action?: any,
  body: string | React.Node,
  detail?: any,
  title: string
}

export const clearStatusModal = createVoidPayloadAction('CLEAR_STATUS_MODAL')
const handlingFinishedJob = createAction(
  'HANDLING_FINISHED_JOB',
  (payload: ServerJob) => payload
)
export const receiveJobs = createAction(
  'RECEIVE_JOBS',
  (payload: Array<ServerJob>) => payload
)
export const removeRetiredJob = createAction(
  'REMOVE_RETIRED_JOB',
  (payload: ServerJob) => payload
)
export const setErrorMessage = createAction(
  'SET_ERROR_MESSAGE',
  (payload: ErrorMessage | Promise<ErrorMessage>) => payload
)
export const setJobMonitorTimer = createAction(
  'SET_JOBMONITOR_TIMER',
  (payload: ?IntervalID) => payload
)
export const setJobMonitorVisible = createAction(
  'SET_JOBMONITOR_VISIBLE',
  (payload: boolean) => payload
)
const setAppInfo = createAction(
  'SET_APP_INFO',
  (payload: {
    commit: string,
    config: DataToolsConfig,
    repoUrl: string
  }) => payload
)

const setStatusModal = createAction(
  'SET_STATUS_MODAL',
  (payload: ModalContent) => payload
)

export type StatusActions = ActionType<typeof clearStatusModal> |
  ActionType<typeof handlingFinishedJob> |
  ActionType<typeof receiveJobs> |
  ActionType<typeof removeRetiredJob> |
  ActionType<typeof setJobMonitorTimer> |
  ActionType<typeof setJobMonitorVisible> |
  ActionType<typeof setErrorMessage> |
  ActionType<typeof setAppInfo>

/**
 * Check status of user's jobs. Handle any finished jobs and if there are no
 * remaining active jobs, stop job monitor.
 */
export function checkJobStatus () {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    return dispatch(secureFetch(`/api/manager/secure/status/jobs`))
      .then(response => response.json())
      .then((jobs: Array<ServerJob>) => {
        // Check for any just-finished jobs
        const completedJobs = jobs
          .filter(job => job.status.completed || job.status.error)
        completedJobs
          // Retire any completed or errored jobs.
          .forEach(job => dispatch(handleFinishedJob(job)))

        const remainingJobs = jobs
          .filter(job => !job.status.completed && !job.status.error)
        if (remainingJobs.length === 0) {
          // If there are no remaining jobs, stop the timer.
          dispatch(stopJobMonitor())
        }
        // Add remaining jobs to set of active jobs. Note, this may be an empty
        // array if finished jobs have been handled, but that is the expected
        // behavior because these finished jobs will appear in a "retired" state.
        dispatch(receiveJobs(remainingJobs))
        return jobs
      })
      // Stop monitor if an error is encountered to avoid repeated requests.
      .catch(err => {
        console.warn('Encountered error fetching server jobs', err)
        dispatch(stopJobMonitor())
      })
  }
}

/**
 * Fetch information about the application state, including the UI and server
 * commits, the repo URL, and the specific configuration used by the backend
 * server.
 */
export async function fetchAppInfo () {
  return async function (dispatch: dispatchFn, getState: getStateFn) {
    // fetch info.  If an error occurs or response json doesn't match, set
    // server info to value indicating an unknown commit and repoUrl
    const info = await dispatch(secureFetch('/api/manager/public/appinfo'))
      .then(response => response.json())
    const config: DataToolsConfig = info.config
    const commit: string = info.commit || 'unknown'
    let repoUrl: string = info.repoUrl
    if (!repoUrl || repoUrl.indexOf('project.scm.url') !== -1) repoUrl = '?'
    else repoUrl = repoUrl.replace('.git', '')
    dispatch(setAppInfo({
      commit,
      config,
      repoUrl
    }))
  }
}

/**
 * Constructs modal content from an service period merge (principally used for
 * MTC).
 */
function getMergeFeedModalContent (result: MergeFeedsResult): ModalContent {
  const SEPARATOR = ': '
  const {
    errorCount,
    failed,
    failureReasons,
    idConflicts,
    mergeStrategy,
    remappedIds,
    remappedReferences,
    skippedIds
  } = result
  const messages = getComponentMessages('MergeFeedsResult')
  const details = []
  details.push(
    [messages('strategyUsed'), messages(mergeStrategy)].join(SEPARATOR)
  )
  // Do nothing or show merged feed modal? Feed version is be created
  details.push([messages('remappedIdCount'), remappedReferences].join(SEPARATOR))
  if (Object.keys(remappedIds).length > 0) {
    const remappedIdStrings = []
    for (const key in remappedIds) {
      // Modify key to remove feed name.
      const split = key.split(':')
      const tableAndId = split.splice(1, 1)
      remappedIdStrings.push(`${tableAndId.join(':')} -> ${remappedIds[key]}`)
    }
    details.push(
      [messages('remappedIds'), remappedIdStrings.join(', ')].join(SEPARATOR)
    )
  }
  if (skippedIds.length > 0) {
    const skippedRecordsForTables = {}
    skippedIds.forEach(id => {
      const table = id.split(':')[0]
      // Increment count of skipped records for each value found per table.
      skippedRecordsForTables[table] = (skippedRecordsForTables[table] || 0) + 1
    })
    const skippedRecordsStrings = []
    for (const key in skippedRecordsForTables) {
      skippedRecordsStrings.push(`${key} - ${skippedRecordsForTables[key]}`)
    }
    details.push(
      [messages('skipped'), skippedRecordsStrings.join(', ')].join(SEPARATOR)
    )
  }
  if (idConflicts.length > 0) {
    details.push(
      [messages('idConflicts'), idConflicts.join(', ')].join(SEPARATOR)
    )
  }
  return {
    title: failed
      ? messages('title.failure')
      : messages('title.success'),
    body: failed
      ? <div>
        {messages('body.failure').replace('$errorCount', errorCount.toString())}
        <ul>
          {failureReasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
      : messages('body.success'),
    detail: details.join('\n')
  }
}

/* eslint-disable complexity */
export function handleFinishedJob (job: ServerJob) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(handlingFinishedJob(job))
    switch (job.type) {
      case 'VALIDATE_FEED':
        if (!job.feedSourceId) {
          // FIXME use setErrorMessage instead?
          console.warn('No feedSourceId found on job')
          return
        }
        dispatch(fetchFeedSource(job.feedSourceId))
          .then((feedSource: Feed) => {
            // If viewing a particular feed, navigate to a new feed version as soon as it becomes available.
            // (If user is not looking at this feed, don't navigate away from their current page.)
            const newVersionPath = `/feed/${feedSource.id}`
            if (browserHistory.getCurrentLocation().pathname.startsWith(`${newVersionPath}/version/`)) {
              browserHistory.push(newVersionPath)
            }
          })

        if (isExtensionEnabled('mtc')) {
          const firstDate = job.validationResult && job.validationResult.firstCalendarDate
          const now = moment().startOf('day')
          if (firstDate && moment(firstDate).isAfter(now)) {
            dispatch(setStatusModal({
              title: 'Warning: Feed contains service for future dates only!',
              body: `Use the 'Merge' button to merge with the currently active feed version.`
            }))
          }
        }
        break
      // CREATE_SNAPSHOT accounts for both creating an initial snapshot from GTFS
      // as well as "restoring" a snapshot to the active buffer, which essentially
      // just creates a copy of the snapshot to restore and points at the new
      // snapshot for the new buffer.
      case 'CREATE_SNAPSHOT':
        if (!job.feedSourceId) {
          // FIXME use setErrorMessage instead?
          console.warn('No feedSourceId found on job')
          return
        }
        dispatch(fetchFeedSource(job.feedSourceId))
        break
      // case 'PROCESS_SNAPSHOT':
      //   dispatch(fetchSnapshots(job.feedVersion.feedSource))
      //   break
      //
      case 'CREATE_FEEDVERSION_FROM_SNAPSHOT':
        if (!job.feedSourceId) {
          // FIXME use setErrorMessage instead?
          console.warn('No feedSourceId found on job')
          return
        }
        dispatch(fetchFeedSource(job.feedSourceId))
        break
      case 'EXPORT_GIS':
        // Download shapefile. NOTE: because this is a temporary file, which is
        // immediately deleted, the server does not also provide an option to
        // download via S3 (it never uploads the file to S3).
        window.location.assign(`${API_PREFIX}downloadshapes/${job.jobId}`)
        break
      case 'EXPORT_SNAPSHOT_TO_GTFS':
        if (job.parentJobId) {
          console.log('Not downloading snapshot GTFS. Export job part of feed version creation.')
        } else {
          if (job.snapshot) {
            dispatch(downloadSnapshotViaCredentials(job.snapshot, false))
          }
        }
        break
      case 'DEPLOY_TO_OTP':
        return dispatch(fetchDeployment(job.deploymentId))
      case 'MERGE_FEED_VERSIONS':
        if (job.mergeType === 'REGIONAL') {
          // If merging feeds for the project, end result is to download zip.
          if (!job.projectId) {
            // FIXME use setErrorMessage instead?
            throw new Error('No project found on job')
          }
          // FIXME
          dispatch(fetchProjectWithFeeds(job.projectId))
        } else {
          const result = job.mergeFeedsResult
          if (result) {
            const modalContent = getMergeFeedModalContent(result)
            dispatch(setStatusModal(modalContent))
          }
        }
        break
      default:
        console.warn(`No completion step defined for job type ${job.type}`)
        break
    }
  }
}

export function handleJobResponse (response: Response, message: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (response.status >= 400) {
      const props = message
        ? { message }
        // If no message specified, use error message supplied by JSON response
        : response.json()
      return dispatch(setErrorMessage(props))
    } else {
      // Resulting JSON contains message and job ID wich which to monitor job.
      const json: {jobId: number, message: string} = (response.json(): any)
      dispatch(startJobMonitor())
      // Return json with job ID in case it is needed upstream
      return json
    }
  }
}

/**
 * Start job monitor. This stops any existing timer function and initializes
 * the fetch user jobs status function on a timer.
 */
export function startJobMonitor (showMonitor: boolean = true) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    stopCurrentTimer(getState())

    // Check job status immediately.
    dispatch(checkJobStatus())
      .then(jobs => {
        // If there are active jobs, set up a check for every two seconds if
        // jobs are still running. Note: when the status endpoint is checked for
        // a user and completed/errored jobs are returned, the server will
        // automatically remove these jobs from the active list.
        if (jobs.length > 0) {
          const timer = setInterval(() => dispatch(checkJobStatus()), 2000)
          dispatch(setJobMonitorTimer(timer))
          if (showMonitor) dispatch(setJobMonitorVisible(true))
        }
      })
      .catch(err => console.warn('Error fetchings jobs', err))
  }
}

/**
 * Stop job time function stored with timer ID stored in state.
 */
function stopCurrentTimer (state) {
  const { timer } = state.status.jobMonitor
  if (timer) clearInterval(timer)
}

/**
 * Stop current job timer function and set job monitor (timer ID) to null.
 */
export function stopJobMonitor () {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    stopCurrentTimer(getState())
    dispatch(setJobMonitorTimer(null))
  }
}
