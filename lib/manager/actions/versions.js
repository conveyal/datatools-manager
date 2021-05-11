// @flow

import qs from 'qs'
import {createAction, type ActionType} from 'redux-actions'
import { push } from 'connected-react-router'

import {createVoidPayloadAction, fetchGraphQL, secureFetch} from '../../common/actions'
import {SECURE_API_PREFIX} from '../../common/constants'
import {getConfigProperty, isModuleEnabled} from '../../common/util/config'
import {uploadFile} from '../../common/util/upload-file'
import {ENTITY} from '../../editor/constants'
import {getKeyForId} from '../../editor/util/gtfs'
import {getEntityGraphQLRoot, getEntityIdField, getGraphQLFieldsForEntity} from '../../gtfs/util'
import {validateGtfsPlusFeed} from '../../gtfsplus/actions/gtfsplus'
import {handleJobResponse, setErrorMessage, startJobMonitor} from './status'
import {fetchFeedSource} from './feeds'

import type {Feed, FeedVersion, ShapefileExportType} from '../../types'
import type {dispatchFn, getStateFn, ValidationIssueCount} from '../../types/reducers'

const deletingFeedVersion = createVoidPayloadAction('DELETING_FEEDVERSION')
const publishedFeedVersion = createAction(
  'PUBLISHED_FEEDVERSION',
  (payload: FeedVersion) => payload
)
const receiveFeedVersion = createAction(
  'RECEIVE_FEEDVERSION',
  (payload: FeedVersion) => payload
)
const receiveFeedVersionIsochrones = createAction(
  'RECEIVE_FEEDVERSION_ISOCHRONES',
  (payload: {
    date: string,
    feedSource: Feed,
    feedVersion: FeedVersion,
    fromLat: number,
    fromLon: number,
    fromTime: number,
    isochrones: any,
    toLat: number,
    toLon: number,
    toTime: number
  }) => payload
)
const receiveFeedVersions = createAction(
  'RECEIVE_FEEDVERSIONS',
  (payload: {
    feedSource: Feed,
    versions: Array<FeedVersion>
  }) => payload
)
export const receiveGTFSEntities = createAction(
  'RECEIVE_GTFS_ENTITIES',
  (payload: {
    component: string,
    data: any,
    editor: ?boolean,
    id: ?string | number,
    namespace: string,
    replaceNew: ?boolean
  }) => payload
)
const receiveValidationErrors = createAction(
  'RECEIVE_VALIDATION_ERRORS',
  (payload: {
    errorType: string,
    errors: any,
    feedVersion: FeedVersion,
    limit: number,
    offset: number
  }) => payload
)
const receiveValidationIssueCount = createAction(
  'RECEIVE_VALIDATION_ISSUE_COUNT',
  (payload: {
    feedVersion: FeedVersion,
    validationIssueCount: ValidationIssueCount
  }) => payload
)
const renamingFeedVersion = createVoidPayloadAction('RENAMING_FEEDVERSION')
export const requestingFeedVersions = createVoidPayloadAction('REQUESTING_FEEDVERSIONS')
const requestingFeedVersionIsochrones = createVoidPayloadAction('REQUESTING_FEEDVERSION_ISOCHRONES')
const requestingValidationIssueCount = createVoidPayloadAction('REQUESTING_VALIDATION_ISSUE_COUNT')

// setActiveVersion used in components
export const settingActiveVersion = createAction(
  'SET_ACTIVE_FEEDVERSION',
  (payload: FeedVersion) => payload
)
export function setActiveVersion (version: FeedVersion) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    // Dispatch action to set value in reducer.
    dispatch(settingActiveVersion(version))
    if (version) {
      // Fetch validation issue count. NOTE: future version-specific data fetching
      // could also be triggered here.
      dispatch(fetchValidationIssueCount(version))
      // Also, fetch GTFS+ validation if module enabled.
      if (isModuleEnabled('gtfsplus')) dispatch(validateGtfsPlusFeed(version.id))
    }
  }
}
const uploadingFeed = createVoidPayloadAction('UPLOADING_FEED')

export type VersionActions = ActionType<typeof deletingFeedVersion> |
  ActionType<typeof exportVersionShapes> |
  ActionType<typeof mergeVersions> |
  ActionType<typeof publishedFeedVersion> |
  ActionType<typeof receiveFeedVersion> |
  ActionType<typeof receiveFeedVersionIsochrones> |
  ActionType<typeof receiveFeedVersions> |
  ActionType<typeof receiveGTFSEntities> |
  ActionType<typeof receiveValidationErrors> |
  ActionType<typeof receiveValidationIssueCount> |
  ActionType<typeof renamingFeedVersion> |
  ActionType<typeof requestingFeedVersions> |
  ActionType<typeof requestingFeedVersionIsochrones> |
  ActionType<typeof requestingValidationIssueCount> |
  ActionType<typeof setActiveVersion> |
  ActionType<typeof uploadingFeed>

export function fetchFeedVersions (feedSource: Feed, unsecured: ?boolean = false) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingFeedVersions())
    const apiRoot = unsecured ? 'public' : 'secure'
    const url = `/api/manager/${apiRoot}/feedversion?feedSourceId=${feedSource.id}`
    return dispatch(secureFetch(url))
      .then(response => response.json())
      .then(versions => {
        dispatch(receiveFeedVersions({feedSource, versions}))
        return versions
      })
  }
}

/**
 * Fetch feed version for the provided ID.
 */
export function fetchFeedVersion (feedVersionId: string) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${SECURE_API_PREFIX}feedversion/${feedVersionId}`
    return dispatch(secureFetch(url))
      .then(response => response.json())
      .then(version => {
        return dispatch(receiveFeedVersion(version))
      })
  }
}

/**
 * Currently an MTC-specific feature to "publish" feed version to third party
 * server. In the case of MTC, this tells the data tools backend to push this
 * version to the s3 bucket for processing by RTD.
 */
export function publishFeedVersion (feedVersion: FeedVersion) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${SECURE_API_PREFIX}feedversion/${feedVersion.id}/publish`
    return dispatch(secureFetch(url, 'post'))
      .then(response => response.json())
      .then(version => dispatch(publishedFeedVersion(version)))
  }
}

/**
 * Merges two feed versions according to the strategy defined by the mergeType parameter.
 */
export function mergeVersions (targetVersionId: string, versionId: string, mergeType: 'SERVICE_PERIOD' | 'REGIONAL') {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${SECURE_API_PREFIX}feedversion/merge?feedVersionIds=${targetVersionId},${versionId}&mergeType=${mergeType}`
    return dispatch(secureFetch(url, 'put'))
      .then(response => response.json())
      .then(versions => dispatch(startJobMonitor()))
  }
}

/**
 * Upload a GTFS file as a new feed version. This handles the server response if
 * the feed has not been modified since the latest version or there is some error
 * during the upload. If all goes well, the job monitor is started to watch the
 * job's progress.
 */
export function uploadFeed (feedSource: Feed, file: File) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(uploadingFeed())
    // FIXME: lastModified is not part of File spec in safari: https://developer.mozilla.org/en-US/docs/Web/API/File/lastModified#Browser_compatibility
    // $FlowFixMe lastModified is not appearing in File type for some reason
    const lastModified = file.lastModified
    const url = `${SECURE_API_PREFIX}feedversion?feedSourceId=${feedSource.id}&lastModified=${lastModified}`
    const {token} = getState().user
    if (!token) {
      return dispatch(setErrorMessage({
        title: `Unathorized`,
        message: 'You must be logged in to perform this action.'
      }))
    }
    return uploadFile({file, url, token})
    // FIXME: Use standard handleJobResponse for feed upload operation
      .then(res => {
        if (res.status === 304) {
          // 304 halt is thrown by server if uploaded feed matches the hash of
          // the latest version.
          dispatch(setErrorMessage({
            title: `Warning: Feed version for ${feedSource.name} not processed`,
            message: 'Feed upload cancelled because it matches latest feed version.'
          }))
        } else if (res.status >= 400) {
          // If there was some error during the upload (e.g., bad zip file),
          // show the error details.
          res.json()
            .then(json => {
              const {detail, message} = json
              dispatch(setErrorMessage({
                message: message || 'Error uploading feed source',
                detail
              }))
            })
        } else {
          // If no errors and this is a new feed, start job monitor to check
          // the progress of feed processing.
          dispatch(startJobMonitor())
        }
      })
  }
}

/**
 * Permanently delete the feed version object and the loaded GTFS data in the
 * SQL database.
 */
export function deleteFeedVersion (feedVersion: FeedVersion) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(deletingFeedVersion())
    const url = `${SECURE_API_PREFIX}feedversion/${feedVersion.id}`
    return dispatch(secureFetch(url, 'delete'))
      .then((res) => {
        // Re-fetch feed source with versions + snapshots
        return dispatch(fetchFeedSource(feedVersion.feedSource.id))
      })
  }
}
/**
 * Fetch GTFS entities for the provided namespace using gtfs-lib GraphQL schema.
 * If an ID is provided, the ID will be passed as an argument to either the `id`
 * field (if fetching for the editor) or the "GTFS ID" field (elsewhere). If
 * fetching entities for the editor, all fields will be included in query (per
 * the behavior of getGraphQLFieldsForEntity).
 *
 * If no ID is provided (this includes id === 0, which should not be allowed in
 * the editor), the ID argument will be excluded.
 */
export function fetchGTFSEntities ({
  editor = false,
  id,
  namespace,
  patternId,
  replaceNew = false,
  type
}: {
  editor?: boolean,
  id?: number | string,
  namespace: ?string,
  patternId?: number,
  replaceNew?: boolean,
  type: string
}) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (!namespace) {
      console.warn('namespace not defined, so not fetching gtfs entities')
      return
    }
    // If fetching for the editor, query on id field (AKA csv_line)
    const entityIdField = editor ? 'id' : getEntityIdField(type)
    const idFieldType = editor ? 'Int' : '[String]'
    const graphQLRoot = getEntityGraphQLRoot(type)
    if (!graphQLRoot || !entityIdField) {
      console.warn(`No graphql table or filter field for ${type}`)
    }
    const fields = getGraphQLFieldsForEntity(type, editor)
    // If fetching for the editor, query on id which is an Int
    const query = `
      query entityQuery($namespace: String${id ? `, $${entityIdField}: ${idFieldType}` : ''}) {
        feed(namespace: $namespace) {
          feed_id
          feed_version
          filename
          ${graphQLRoot} (limit: -1${id ? `, ${entityIdField}: $${entityIdField}` : ''}) {
            id
            ${fields}
          }
        }
      }
    `
    const variables = !id
      ? {namespace}
      // If fetching a single ID for the editor, cast id to int for csv_line field
      : {namespace, [entityIdField]: editor ? +id : id}
    return dispatch(fetchGraphQL({query, variables}))
      .then(data => {
        dispatch(receiveGTFSEntities({namespace, id, component: type, data, editor, replaceNew}))
        if (editor) {
          // If fetching entities for the editor, check that the entity and pattern
          // IDs are valid and handle pushing new browser URL (if applicable).
          const activePatternId = patternId || getState().editor.data.active.subEntityId
          if (
            typeof activePatternId === 'number' &&
            activePatternId !== ENTITY.NEW_ID
          ) {
            // Only check pre-existing pattern IDs.
            checkEntityIdValidity({activePatternId, data, id, type})
          }
          if (replaceNew) {
            // Push the browser path to a URL containing the entity and pattern
            // IDs that were fetched.
            const {feedSourceId} = getState().editor.data.active
            // It is OK simply to push the new ID to the URL here because the
            // reducer on receiveGTFSEntities will handle updating the active
            // entity. Also, updating trips does not come through
            // this code path, so we don't need to handle setting the timetable active.
            // However, flow typing can't read the above comment, so we have to
            // type check it anyways.  ¯\_(ツ)_/¯
            if (!feedSourceId || !id) {
              throw new Error('feedSourceId or id is not defined')
            }
            let url = `/feed/${feedSourceId}/edit/${type}/${id}`
            if (patternId) url += `/trippattern/${patternId}`
            push(url)
          }
        }
      })
      .catch(err => console.log(err))
  }
}

/**
 * Check that entity and pattern IDs are valid and update URL if not.
 */
function checkEntityIdValidity ({
  activePatternId: patternId,
  data,
  id,
  type
}: {
  activePatternId: number,
  data: any,
  id?: string | number,
  type: string
}) {
  const tableName = getKeyForId(type, 'tableName')
  const entity = data.feed[tableName][0]
  const pathParts = window.location.pathname.split('/')
  let entityNotFound = false
  if (!entity) {
    console.warn(`No ${type} entity found for id=${id || 'undefined'}. Removing id from URL.`)
    entityNotFound = true
    while (pathParts[pathParts.length - 1] !== type) pathParts.pop()
  } else if (type === 'route' && patternId) {
    const pattern = entity.tripPatterns.find(p => p.id === patternId)
    if (!pattern) {
      console.warn(`No pattern entity found for id=${patternId}. Removing id from URL.`)
      entityNotFound = true
      pathParts.pop()
    }
  }
  if (entityNotFound) {
    // If there was no entity found for the requested ID, remove the ID
    // from the URL
    push(pathParts.join('/'))
  }
}

export function fetchValidationErrors ({
  errorType,
  feedVersion,
  limit,
  offset
}: {
  errorType: string,
  feedVersion: FeedVersion,
  limit: number,
  offset: number
}) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const query = `
      query errorsQuery($namespace: String, $errorType: [String], $limit: Int, $offset: Int) {
        feed(namespace: $namespace) {
          feed_id
          feed_version
          filename
          errors (error_type: $errorType, limit: $limit, offset: $offset) {
            error_type
            entity_type
            entity_id
            line_number
            bad_value
            entity_sequence
          }
        }
      }
    `
    const {namespace} = feedVersion
    return dispatch(fetchGraphQL({
      query,
      variables: {namespace, errorType: [errorType], limit, offset},
      errorMessage: 'Error fetching validation issues'
    }))
      .then(data => {
        if (data && data.feed) {
          const {errors} = data.feed
          dispatch(receiveValidationErrors({feedVersion, errorType, limit, offset, errors}))
        }
      })
  }
}

function fetchValidationIssueCount (feedVersion: FeedVersion) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(requestingValidationIssueCount())
    const {namespace} = feedVersion
    const query = `
      query countsQuery($namespace: String) {
        feed(namespace: $namespace) {
          feed_id
          feed_version
          filename
          row_counts {
            stops
            trips
            calendar_dates
            errors
          }
          error_counts {
            type count message priority
          }
        }
      }
    `
    return dispatch(fetchGraphQL({query, variables: {namespace}}))
      .then(data => {
        if (data.feed) {
          dispatch(receiveValidationIssueCount({feedVersion, validationIssueCount: data.feed}))
        } else {
          console.error('Could not fetch validation issues', data)
        }
      })
      .catch(err => console.log(err))
  }
}

export function fetchFeedVersionIsochrones (
  feedVersion: ?FeedVersion,
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  date?: string,
  fromTime?: number,
  toTime?: number
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (typeof date === 'undefined' || typeof fromTime === 'undefined' || typeof toTime === 'undefined') {
      const {dateTimeFilter} = getState().gtfs.filter
      date = dateTimeFilter.date
      fromTime = dateTimeFilter.from
      toTime = dateTimeFilter.to
    }
    if (!feedVersion) {
      console.warn('feedVersion is not set, unable to fetch feed version isochrones')
      return
    }
    dispatch(requestingFeedVersionIsochrones())
    const params = {fromLat, fromLon, toLat, toLon, date, fromTime, toTime}
    const url = `${SECURE_API_PREFIX}feedversion/${feedVersion.id}/isochrones?${qs.stringify(params)}`
    return dispatch(secureFetch(url))
      .then(res => {
        console.log(res.status)
        if (res.status === 202) {
          // Wait for transport network build job to finish
          dispatch(handleJobResponse(res, 'Error building transport network'))
          return []
        }
        return res.json()
      })
      .then(isochrones => {
        if (!feedVersion) {
          console.warn('feedVersion is not set, unable to receive feed version isochrones')
          return
        }
        dispatch(receiveFeedVersionIsochrones({
          feedSource: feedVersion.feedSource,
          feedVersion,
          isochrones,
          fromLat,
          fromLon,
          toLat,
          toLon,
          // get these from params to avoid flow type rechecks
          date: params.date,
          fromTime: params.fromTime,
          toTime: params.toTime
        }))
        return isochrones
      })
  }
}

/**
 * Download a GTFS file for a a given feed version.
 */
export function downloadFeedViaToken (
  feedVersion: FeedVersion,
  isPublic: ?boolean,
  prefix: ?string = 'gtfs'
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const route = isPublic ? 'public' : 'secure'
    const url = `/api/manager/${route}/feedversion/${feedVersion.id}/downloadtoken`
    return dispatch(secureFetch(url))
      .then(response => response.json())
      .then(json => {
        if (getConfigProperty('application.data.use_s3_storage')) {
          if (!json.url) {
            dispatch(setErrorMessage({
              title: `Server Error!`,
              message: 'Could not download feed. Please contact your system administrator.'
            }))
          } else {
            // Download object using presigned S3 URL.
            window.location.assign(json.url)
          }
        } else {
          // Otherwise, use the provided token to download feed from the server.
          window.location.assign(`/api/manager/downloadfeed/${json.id}`)
        }
      })
  }
}

/**
 * Publish an existing snapshot as a new feed version for the specified feed
 * source. This allows a path for validating and downloading GTFS data contained
 * in the editor.
 */
export function createFeedVersionFromSnapshot (
  feedSource: Feed,
  snapshotId: string
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${SECURE_API_PREFIX}feedversion/fromsnapshot?feedSourceId=${feedSource.id}&snapshotId=${snapshotId}`
    return dispatch(secureFetch(url, 'post'))
      .then(res => dispatch(handleJobResponse(res, 'Error downloading snapshot')))
  }
}

/**
 * Rename the specified feed version. Note, there is no update method for feed
 * version objects because these should remain relatively untouched following
 * creation.
 */
export function renameFeedVersion (
  feedVersion: FeedVersion,
  name: string
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    dispatch(renamingFeedVersion())
    const url = `${SECURE_API_PREFIX}feedversion/${feedVersion.id}/rename?name=${name}`
    return dispatch(secureFetch(url, 'put'))
      .then((res) => {
        dispatch(fetchFeedVersion(feedVersion.id))
      })
  }
}

export function setVersionIndex (
  feed: Feed,
  index: number,
  push?: boolean = true,
  isPublic?: boolean
) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    if (feed.feedVersions) {
      dispatch(setActiveVersion(feed.feedVersions[index - 1]))

      if (push) {
        push(`${isPublic ? '/public' : ''}/feed/${feed.id}/version/${index}`)
      }
    } else {
      console.warn('No feed versions for feed were found.', feed)
    }
  }
}

/**
 * Starts the export shapes server job for a particular feed version.
 *
 * NOTE: server endpoint supports more than one feed version (comma separated).
 */
export function exportVersionShapes (feedVersionId: string, type: ShapefileExportType) {
  return function (dispatch: dispatchFn, getState: getStateFn) {
    const url = `${SECURE_API_PREFIX}feedversion/shapes?feedId=${feedVersionId}&type=${type}`
    return dispatch(secureFetch(url, 'post'))
      .then(res => dispatch(handleJobResponse(res, 'Error exporting GIS')))
  }
}
