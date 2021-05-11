// @flow

import { push } from 'connected-react-router'
import {createAction, type ActionType} from 'redux-actions'

import {createVoidPayloadAction, secureFetch} from '../../common/actions'
import {isModuleEnabled} from '../../common/util/config'
import {fetchFeedSourceDeployments} from './deployments'
import {fetchSnapshots} from '../../editor/actions/snapshots'
import {fetchProject, fetchProjectWithFeeds} from './projects'
import {handleJobResponse} from './status'
import {fetchFeedVersions} from './versions'

import type {Feed, NewFeed} from '../../types'
import type {dispatchFn, getStateFn} from '../../types/reducers'

// Private actions
const requestingFeedSource = createVoidPayloadAction('REQUESTING_FEEDSOURCE')
const requestingFeedSources = createVoidPayloadAction('REQUESTING_FEEDSOURCES')
export const receiveFeedSources = createAction(
  'RECEIVE_FEEDSOURCES',
  (payload: {
    feedSources: Array<Feed>,
    projectId?: string
  }) => payload
)
const deletingFeedSource = createVoidPayloadAction('DELETING_FEEDSOURCE')
// FIXME: Is receivePublicFeeds needed for the public UI?
// const receivePublicFeeds = createAction('RECEIVE_PUBLIC_FEEDS')
const savingFeedSource = createVoidPayloadAction('SAVING_FEEDSOURCE')
const runningFetchFeed = createVoidPayloadAction('RUNNING_FETCH_FEED')

// Public action used by component or other actions
export const receiveFeedSource = createAction(
  'RECEIVE_FEEDSOURCE',
  (payload: ?Feed) => payload
)

export type FeedActions = ActionType<typeof requestingFeedSource> |
  ActionType<typeof requestingFeedSources> |
  ActionType<typeof receiveFeedSources> |
  ActionType<typeof deletingFeedSource> |
  ActionType<typeof savingFeedSource> |
  ActionType<typeof runningFetchFeed> |
  ActionType<typeof receiveFeedSource>

const FS_URL = '/api/manager/secure/feedsource'
/**
 * Fetch all feeds for a given project ID.
 */
export function fetchProjectFeeds (projectId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingFeedSources())
    return dispatch(secureFetch(`${FS_URL}?projectId=${projectId}`))
      .then(response => response.json())
      .then(feedSources => dispatch(receiveFeedSources({projectId, feedSources})))
  }
}

/**
 * Create new feed source from provided properties.
 */
export function createFeedSource (newFeed: NewFeed) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(savingFeedSource())
    const url = '/api/manager/secure/feedsource'
    return dispatch(secureFetch(url, 'post', newFeed))
      .then((res) => res.json())
      .then((createdFeed) => {
        return dispatch(fetchProjectWithFeeds(newFeed.projectId)).then(() => {
          push(`/feed/${createdFeed.id}`)
        })
      })
  }
}

/**
 * Update existing feed source with provided properties. Then re-fetch versions
 * and snapshots for feed source.
 */
export function updateFeedSource (feedSource: Feed, properties: {[string]: any}) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(savingFeedSource())
    return dispatch(secureFetch(`${FS_URL}/${feedSource.id}`, 'put', {...feedSource, ...properties}))
      // Re-fetch feed source with versions and snapshots.
      .then((res) => dispatch(fetchFeedSource(feedSource.id)))
  }
}

/**
 * Update "external feed resource" properties, i.e., MTC, TransitLand, and
 * TransitFeeds.com.
 */
export function updateExternalFeedResource (
  feedSource: Feed,
  resourceType: string,
  properties: {[string]: any}
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(savingFeedSource())
    const url = `${FS_URL}/${feedSource.id}/updateExternal?resourceType=${resourceType}`
    return dispatch(secureFetch(url, 'put', properties))
      .then((res) => res.json())
      .then(json => dispatch(fetchFeedSource(feedSource.id)))
  }
}

/**
 * Permanently delete single feed source. Re-fetches parent project's feeds
 * after deletion.
 */
export function deleteFeedSource (feedSource: Feed) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(deletingFeedSource())
    // If the feed source has not been saved, simply re-fetch feeds.
    if (feedSource.isCreating) return dispatch(fetchProjectFeeds(feedSource.projectId))
    return dispatch(secureFetch(`${FS_URL}/${feedSource.id}`, 'delete'))
      .then(res => dispatch(fetchProjectFeeds(feedSource.projectId)))
  }
}

/**
 * Get feed source for specified ID along with related tables (e.g., versions
 * and snapshots). This requests the feed source object from the server and
 * should not be confused with runFetchFeed, which attempts to create a new
 * feed version for the feed source by fetching the GTFS file at the feed source
 * fetch URL.
 */
export function fetchFeedSource (feedSourceId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingFeedSource())
    return dispatch(secureFetch(`${FS_URL}/${feedSourceId}`))
      .then(res => res.json())
      .then(feedSource => {
        if (!feedSource) {
          // Feed source not found for ID
          dispatch(receiveFeedSource(null))
          return null
        }
        dispatch(receiveFeedSource(feedSource))
        dispatch(fetchRelatedTables(feedSource))
        return feedSource
      })
  }
}

/**
 * Fetch tables related to feed source, including snapshots, feed versions, and
 * feed source specific deployments. Optionally, exclude feed versions from fetch
 * in case they have already been fetched (there are certain data elements such
 * as validation issue count that are fetched separately from the feed version
 * list which may be overwritten in the store if the versions are re-fetched).
 */
function fetchRelatedTables (feedSource: Feed, shouldFetchVersions: boolean = true) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (shouldFetchVersions) dispatch(fetchFeedVersions(feedSource))
    dispatch(fetchSnapshots(feedSource))
    isModuleEnabled('deployment') && dispatch(fetchFeedSourceDeployments(feedSource))
  }
}

/**
 * When feed source viewer component mounts, load feed source and any feed source
 * sets of objects that reference feed source.
 * TODO: move to component?
 */
export function onFeedSourceViewerMount (initialProps: any) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const {feedSource, project} = initialProps
    const {feedSourceId} = initialProps.router.params
    if (!project) {
      // Fetch project and feed source if project not found.
      dispatch(fetchFeedSourceAndProject(feedSourceId))
        .then(feedSource => {
          // If feed source is not found (e.g., bad ID), feed source viewer will
          // handle error message. Do not continue fetch of related tables.
          if (!feedSource) return
          // Otherwise, fetch related tables (e.g., feed versions, snapshots).
          dispatch(fetchRelatedTables(feedSource))
        })
    } else if (!feedSource) {
      // Fetch feed source with versions and snapshots if the feed source is not
      // found.
      dispatch(fetchFeedSource(feedSourceId))
    } else {
      // Only fetch versions (which can take quite some time to load) if not
      // already available.
      dispatch(fetchRelatedTables(feedSource, !feedSource.feedVersions))
    }
  }
}

/**
 * Fetches feed source and parent project.
 */
export function fetchFeedSourceAndProject (
  feedSourceId: string,
  unsecured?: boolean
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingFeedSource())
    return dispatch(secureFetch(`${FS_URL}/${feedSourceId}`))
      .then(res => res.json())
      .then(feedSource => {
        // Once the project has been fetched, dispatch the recieve feed source
        // action (so that the feed source is nested under project).
        return dispatch(fetchProject(feedSource.projectId, unsecured))
          .then(project => {
            dispatch(receiveFeedSource(feedSource))
            return feedSource
          })
      })
      .catch(err => {
        console.warn(err)
        dispatch(receiveFeedSource(null))
      })
  }
}

/**
 * Check for new GTFS file at feed source fetch URL and create new version from
 * the GTFS file if a new file is found.
 */
export function runFetchFeed (feedSource: Feed) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(runningFetchFeed())
    return dispatch(secureFetch(`${FS_URL}/${feedSource.id}/fetch`, 'post'))
      .then(res => dispatch(handleJobResponse(res, 'Error fetching feed source')))
  }
}
