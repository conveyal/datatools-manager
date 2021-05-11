// @flow

import qs from 'qs'
import { browserHistory } from 'react-router'
import { createAction, type ActionType } from 'redux-actions'

import { createVoidPayloadAction, secureFetch } from '../../common/actions'
import { receiveProject } from './projects'
import { startJobMonitor } from './status'
import fileDownload from '../../common/util/file-download'

import type {Deployment, Feed, SummarizedFeedVersion} from '../../types'
import type {dispatchFn, getStateFn} from '../../types/reducers'

const DEPLOYMENT_URL = `/api/manager/secure/deployments`

// Deployment Actions
export const createDeployment = createAction(
  'CREATE_DEPLOYMENT',
  (payload: string) => payload
)
const receiveDeployment = createAction(
  'RECEIVE_DEPLOYMENT',
  (payload: Deployment) => payload
)
const receiveDeployments = createAction(
  'RECEIVE_DEPLOYMENTS',
  (payload: {
    deployments: Array<Deployment>,
    feedSourceId?: string,
    projectId: string
  }) => payload
)
const requestingDeployment = createVoidPayloadAction('REQUESTING_DEPLOYMENT')
const requestingDeployments = createVoidPayloadAction('REQUESTING_DEPLOYMENTS')
const savingDeployment = createVoidPayloadAction('SAVING_DEPLOYMENT')

export type DeploymentActions = ActionType<typeof createDeployment> |
  ActionType<typeof receiveDeployment> |
  ActionType<typeof receiveDeployments> |
  ActionType<typeof requestingDeployment> |
  ActionType<typeof requestingDeployments> |
  ActionType<typeof savingDeployment>

type FeedVersionId = { id: string }

export function addFeedVersion (
  deployment: Deployment,
  feedVersion: FeedVersionId
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const feedVersions = [...deployment.feedVersions, feedVersion]
    return dispatch(updateDeployment(deployment, {feedVersions}))
  }
}

export function fetchProjectDeployments (projectId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingDeployments())
    return dispatch(secureFetch(`${DEPLOYMENT_URL}?projectId=${projectId}`))
      .then(response => response.json())
      .then(deployments => {
        dispatch(receiveDeployments({projectId, deployments}))
      })
  }
}

export function fetchFeedSourceDeployments (feedSource: Feed) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingDeployments())
    return dispatch(secureFetch(`${DEPLOYMENT_URL}?feedSourceId=${feedSource.id}`))
      .then(response => response.json())
      .then(deployments => dispatch(receiveDeployments({
        feedSourceId: feedSource.id,
        projectId: feedSource.projectId,
        deployments
      })))
  }
}

export function deployToTarget (deployment: Deployment, target: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {id} = deployment
    // Ensure that target server has valid name (used as identifier currently)
    if (!target) return window.alert('OTP Server must have valid name.')
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${id}/deploy/${target}`, 'post'))
      .then(response => {
        // FIXME: Use standard handleJobResponse for deployment job
        if (response.status >= 400 || response.status === 202) {
          // If there is an issue with the deployment, return the JSON response
          // (handled be below alert)
          return response.json()
        } else {
          // If the deployment request succeeded, start monitoring the job.
          dispatch(startJobMonitor())
          dispatch(fetchProjectDeployments(deployment.projectId))
        }
      })
      .then(json => {
        // Show JSON message if there was an issue.
        json && window.alert(json.message || 'Could not process deployment')
      })
  }
}

export function fetchDeployment (id: ?string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingDeployment())
    if (!id) {
      // TODO: replace with more UI-friendly thingy
      window.alert('Invalid deployment id to fetch')
      return
    }
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${id}`))
      .then(response => response.json())
      .then(deployment => dispatch(receiveDeployment(deployment)))
  }
}

/**
 * Download a build artifact for the deployment. Defaults to otp build log file.
 */
export function downloadBuildArtifact (deployment: Deployment, filename: ?string = 'otp-build.log', jobId: ?string = null) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const params = jobId ? {filename, jobId} : {filename}
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${deployment.id}/artifact?${qs.stringify(params)}`))
      .then(response => response.json())
      .then(json => {
        // Download object using presigned S3 URL.
        window.location.assign(json.url)
      })
  }
}

export function downloadDeployment (deployment: Deployment) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${deployment.id}/download`))
      .then(response => response.blob())
      .then(blob => fileDownload(blob, 'test.zip', 'application/zip'))
  }
}

export function fetchDeploymentAndProject (id: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingDeployment())
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${id}`))
      .then(response => response.json())
      .then(deployment => {
        dispatch(receiveProject(deployment.project))
        dispatch(receiveDeployment(deployment))
        return deployment
      })
  }
}

export function deleteDeployment (deployment: Deployment & { isCreating?: boolean }) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {id, isCreating, projectId} = deployment
    if (isCreating) {
      return dispatch(fetchProjectDeployments(projectId))
    }
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${id}`, 'delete'))
      .then((res) => dispatch(fetchProjectDeployments(projectId)))
  }
}

export function terminateEC2InstanceForDeployment (deploymentId: string, instanceIds: Array<string>) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${DEPLOYMENT_URL}/${deploymentId}/ec2?instanceIds=${instanceIds.join(',')}`
    return dispatch(secureFetch(url, 'delete'))
      .then((res) => dispatch(fetchDeployment(deploymentId)))
  }
}

export function deleteFeedVersion (
  deployment: Deployment,
  feedVersion: SummarizedFeedVersion
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const feedVersions = deployment.feedVersions
    const index = feedVersions.findIndex(v => v.id === feedVersion.id)
    feedVersions.splice(index, 1)
    return dispatch(updateDeployment(deployment, {feedVersions}))
  }
}

export function saveDeployment (
  props: { name: string, projectId: string }
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(savingDeployment())
    return dispatch(secureFetch(DEPLOYMENT_URL, 'post', props))
      .then(response => response.json())
      .then(deployment => dispatch(fetchProjectDeployments(deployment.projectId)))
  }
}

export function createDeploymentFromFeedSource (feedSource: Feed) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {id, projectId} = feedSource
    dispatch(savingDeployment())
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/fromfeedsource/${id}`, 'post'))
      .then(response => response.json())
      .then(deployment => {
        dispatch(receiveDeployment(deployment))
        // Redirect browser page to deployment view.
        return push(`/project/${projectId}/deployments/${deployment.id}`)
      })
  }
}

export function updateDeployment (
  deployment: Deployment,
  changes: any // using the any type because $Shape<Deployment> was giving
  // errors due to how feed versions are saved as FeedVersionId types
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {id} = deployment
    dispatch(savingDeployment())
    return dispatch(secureFetch(`${DEPLOYMENT_URL}/${id}`, 'put', changes))
      .then(response => response.json())
      .then(deployment => dispatch(receiveDeployment(deployment)))
  }
}

export function updateVersionForFeedSource (
  deployment: Deployment,
  feedSource: Feed,
  feedVersion: FeedVersionId
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const feedVersions = [...deployment.feedVersions]
    // $FlowFixMe weird error that shouldn't happen
    const index = feedVersions.findIndex(v => v.feedSource.id === feedSource.id)
    feedVersions.splice(index, 1)
    feedVersions.push(feedVersion)
    return dispatch(updateDeployment(deployment, {feedVersions}))
  }
}
