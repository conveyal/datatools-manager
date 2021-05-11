// @flow

import update from 'immutability-helper'
import {getConfigProperty} from '../../common/util/config'
import {defaultSorter} from '../../common/util/util'
import {getIndexesFromFeed} from '../util'

import type {Action} from '../../types/actions'
import type {ProjectsState} from '../../types/reducers'

export const defaultState = {
  isFetching: false,
  all: [],
  active: null,
  filter: {
    // this controls what comparison column to show
    feedSourceTableComparisonColumn: null,
    // this controls how the feed source table toolbar filter counts are
    // calculated. It can be different than the comparison column in certain
    // cases such as when the filter strategy is for the LATEST feed version
    // but the comparison column is for the DEPLOYED version
    feedSourceTableFilterCountStrategy: 'LATEST',
    // in the feed source table, this is a validation status filter
    filter: null,
    // This is used to sort both the Project List or the FeedSourceTable
    searchText: null
  },
  // this is used to sort the FeedSourceTable
  sort: 'alphabetically-asc'
}

/* eslint-disable complexity */
const projects = (state: ProjectsState = defaultState, action: Action): ProjectsState => {
  switch (action.type) {
    case 'SET_FEED_SORT_TYPE':
      return update(state, {sort: {$set: action.payload}})
    case 'SET_PROJECT_VISIBILITY_SEARCH_TEXT':
      return update(state, {filter: {searchText: {$set: action.payload}}})
    case 'SET_PROJECT_VISIBILITY_FILTER':
      return update(state, {filter: {filter: {$set: action.payload}}})
    case 'CREATE_DEPLOYMENT':
      const projectIndex = state.all.findIndex(p => p.id === action.payload)
      const project = state.all[projectIndex]
      let newState
      // if project's deployment array is undefined, add it
      if (!project.deployments) {
        newState = update(state, {
          all: {[projectIndex]: {$merge: {deployments: []}}}
        })
      }
      // add new empty feed source to feedSources array
      const deployment = {
        isCreating: true,
        name: '',
        project: project
      }
      return update(newState || state, {
        all: {[projectIndex]: {deployments: {$unshift: [deployment]}}}
      })
    case 'REQUESTING_FEEDSOURCE':
    case 'REQUESTING_FEEDSOURCES':
    case 'REQUESTING_PROJECT':
    case 'REQUEST_PROJECTS': {
      return update(state, { isFetching: { $set: true } })
    }
    case 'RECEIVE_PROJECTS': {
      const activeProjectId = state.active
        ? state.active.id
        : getConfigProperty('application.active_project')
      let activeIndex = action.payload.findIndex(p => p.id === activeProjectId)
      if (activeIndex === -1) {
        activeIndex = 0
      }
      return {
        isFetching: false,
        all: action.payload,
        active: action.payload[activeIndex],
        filter: {
          feedSourceTableComparisonColumn: null,
          feedSourceTableFilterCountStrategy: 'LATEST',
          filter: null,
          searchText: null
        },
        sort: 'alphabetically-asc'
      }
    }
    case 'RECEIVE_PROJECT': {
      let projects, projectIndex
      if (!action.payload) {
        return update(state, { isFetching: { $set: false } })
      }
      if (!state.all) {
        // there are no current projects loaded
        projects = [action.payload]
      } else {
        // projects already loaded
        // extract because flow https://flow.org/en/docs/lang/refinements/#toc-refinement-invalidations
        const {id} = action.payload
        projectIndex = state.all.findIndex(p => p.id === id)
        if (projectIndex === -1) {
          // projects loaded but not this one; add it
          projects = [
            ...state.all,
            action.payload
          ]
        } else {
          // FIXME: Use $splice
          // projects loaded including this one, replace it
          projects = [
            ...state.all.slice(0, projectIndex),
            action.payload,
            ...state.all.slice(projectIndex + 1)
          ]
        }
      }
      const activeProjectId = state.active
        ? state.active.id
        : getConfigProperty('application.active_project')
      let activeProject = action.payload.id === activeProjectId
        ? action.payload
        : null
      if (state.active && !activeProject) {
        // Active project already exists and received project does not match
        // active project.
        activeProject = state.active
      }
      return update(state, {
        isFetching: {$set: false},
        active: {$set: activeProject},
        all: {$set: projects}
      })
    }
    case 'RECEIVE_FEEDSOURCES': {
      // extract because flow https://flow.org/en/docs/lang/refinements/#toc-refinement-invalidations
      const {feedSources, projectId} = action.payload
      const {projectIndex} = getIndexesFromFeed({ projectId, state })
      if (projectIndex < 0) {
        console.warn(`Project ID ${projectId} not found in state`)
        return state
      }
      const currentFeedSources = state.all[projectIndex].feedSources
      let sourceIndex, feeds
      if (currentFeedSources && currentFeedSources.length === 1) {
        // If lazy fetching the rest of the feed sources, don't overwrite current
        // feed source.
        sourceIndex = feedSources
          .findIndex(fs => fs.id === currentFeedSources[0].id)
        if (sourceIndex === -1) {
          // There is no feed source to overwrite (none is loaded or none exist).
          feeds = feedSources
        } else {
          feedSources.splice(sourceIndex, 1)
          feeds = [
            ...currentFeedSources,
            ...feedSources
          ]
        }
      } else {
        feeds = action.payload.feedSources
      }
      feeds = feeds.sort(defaultSorter)
      if (state.active && action.payload.projectId === state.active.id) {
        // Project is active
        return update(state, {
          isFetching: {$set: false},
          active: {feedSources: {$set: feeds}},
          all: {
            [projectIndex]: {feedSources: {$set: feeds}}
          }
        })
      } else {
        // If projectId does not match active project
        return update(state, {
          isFetching: {$set: false},
          all: {
            [projectIndex]: {feedSources: {$set: feeds}}
          }
        })
      }
    }
    case 'RECEIVE_FEEDSOURCE': {
      if (!action.payload) {
        return update(state, {isFetching: {$set: false}})
      }
      // extract because flow https://flow.org/en/docs/lang/refinements/#toc-refinement-invalidations
      const {id, projectId} = action.payload
      const {projectIndex, sourceIndex} = getIndexesFromFeed({
        feedSourceId: id,
        projectId,
        state
      })
      const updatedSources = sourceIndex > -1
        ? {[sourceIndex]: {$set: action.payload}}
        : {$set: [action.payload]}
      return update(state, {
        all: {
          [projectIndex]: {
            feedSources: updatedSources // contains $set update
          }
        },
        isFetching: { $set: false }
      })
    }
    case 'RECEIVE_FEEDVERSIONS': {
      const {feedSource, versions} = action.payload
      const {projectIndex, sourceIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        projectId: feedSource.projectId,
        state
      })
      const versionSort = (a, b) => {
        if (a.version < b.version) return -1
        if (a.version > b.version) return 1
        return 0
      }
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {$merge: {
          feedVersions: versions.sort(versionSort)
        }}}}}
      })
    }
    case 'RECEIVE_FEEDVERSION': {
      const {feedSource, id} = action.payload
      const {projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        feedVersionId: id,
        projectId: feedSource.projectId,
        state
      })
      const updatedVersions = versionIndex > -1
        ? {[versionIndex]: {$set: action.payload}}
        : {$set: [action.payload]}
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {
          feedVersions: updatedVersions
        }}}}
      })
    }
    case 'PUBLISHED_FEEDVERSION': {
      const {feedSource, id} = action.payload
      const {projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        feedVersionId: id,
        projectId: feedSource.projectId,
        state
      })
      if (versionIndex === -2) {
        console.warn('Feedsource has no feed version')
        return state
      }
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {feedVersions: {
          [versionIndex]: {$set: action.payload
          }}}}}}
      })
    }
    case 'RECEIVE_VALIDATION_ISSUE_COUNT': {
      const {feedVersion} = action.payload
      const {feedSource, id} = feedVersion
      const {projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        feedVersionId: id,
        projectId: feedSource.projectId,
        state
      })
      if (versionIndex === -2) {
        console.warn('Feedsource has no feed version')
        return state
      }
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {feedVersions: {
          [versionIndex]: {validationResult: {$merge: action.payload.validationIssueCount}
          }}}}}}
      })
    }
    case 'RECEIVE_VALIDATION_ERRORS': {
      const {errorType, feedVersion} = action.payload
      const {feedSource} = feedVersion
      const {errorIndex, projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        errorType,
        feedSourceId: feedSource.id,
        feedVersionId: feedVersion.id,
        projectId: feedSource.projectId,
        state
      })
      if (
        versionIndex === -2 ||
        errorIndex === -2 ||
        !state.all[projectIndex].feedSources ||
        !state.all[projectIndex].feedSources[sourceIndex].feedVersions
      ) {
        console.warn('Feedsource has no feed version')
        return state
      }
      const {validationResult} = state.all[projectIndex].feedSources[sourceIndex].feedVersions[versionIndex]
      if (!validationResult.error_counts) {
        console.warn('validation result does not contain error_counts array!')
        return state
      }
      const newErrors = validationResult.error_counts[errorIndex].errors
        ? {$push: action.payload.errors}
        : {$set: action.payload.errors}
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {feedVersions: {
          [versionIndex]: {validationResult: {error_counts: {
            [errorIndex]: {errors: newErrors}
          }}}}}}}
        }
      })
    }
    case 'RECEIVE_FEEDVERSION_ISOCHRONES': {
      const {feedSource, feedVersion} = action.payload
      const {projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        feedVersionId: feedVersion.id,
        projectId: feedSource.projectId,
        state
      })
      if (versionIndex === -2) {
        console.warn('Feedsource has no feed version')
        return state
      }
      const {date, fromLat, fromLon, fromTime, isochrones, toTime} = action.payload
      isochrones.properties = { fromLat, fromLon, date, fromTime, toTime }
      isochrones.features = isochrones && isochrones.features
        ? isochrones.features.map(f => {
          f.type = 'Feature'
          return f
        })
        : null
      return update(state, {
        all: {[projectIndex]: {feedSources: {[sourceIndex]: {feedVersions: {
          [versionIndex]: {$merge: {isochrones: isochrones
          }}}}}}}
      })
    }
    case 'RECEIVE_DEPLOYMENTS': {
      const {deployments, feedSourceId, projectId} = action.payload
      const {projectIndex} = getIndexesFromFeed({ projectId, state })
      if (feedSourceId && state.all[projectIndex].feedSources) {
        const feedSourceIndex = state.all[projectIndex].feedSources
          .findIndex(fs => fs.id === feedSourceId)
        return update(state, {
          all: {[projectIndex]: {
            feedSources: {[feedSourceIndex]: {$merge: {deployments}}}
          }}
        })
      }
      if (state.active && projectId === state.active.id) {
        return update(state, {
          active: {$merge: {deployments}},
          all: {[projectIndex]: {$merge: {deployments}}}
        })
      } else {
        // if projectId does not match active project
        return update(state, {
          all: {[projectIndex]: {$merge: {deployments}}}
        })
      }
    }
    case 'RECEIVE_DEPLOYMENT': {
      const {projectIndex} = getIndexesFromFeed({
        projectId: action.payload.projectId,
        state
      })
      const existingDeployments = state.all[projectIndex].deployments || []
      let updatedDeployments
      const deploymentIndex = existingDeployments
        .findIndex(s => s.id === action.payload.id)
      if (deploymentIndex === -1) {
        // Deployment does not currently exist; add it.
        updatedDeployments = [
          ...existingDeployments,
          action.payload
        ]
      } else {
        // Existing deployment array includes this one, replace it
        updatedDeployments = [
          ...existingDeployments.slice(0, deploymentIndex),
          action.payload,
          ...existingDeployments.slice(deploymentIndex + 1)
        ]
      }
      return update(state, {
        all: {[projectIndex]: {$merge: {deployments: updatedDeployments}}}
      })
    }
    case 'RECEIVE_NOTES_FOR_FEEDSOURCE': {
      const {feedSource, notes} = action.payload
      const {projectIndex, sourceIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        projectId: feedSource.projectId,
        state
      })
      return update(state, {
        // Merge notes into feed source and ensure note count matches notes length
        all: {[projectIndex]: {feedSources: {
          [sourceIndex]: {$merge: {notes, noteCount: notes.length}}}}}
      })
    }
    case 'RECEIVE_NOTES_FOR_FEEDVERSION': {
      const {feedVersion, notes} = action.payload
      const {feedSource} = feedVersion
      const {projectIndex, sourceIndex, versionIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        feedVersionId: feedVersion.id,
        projectId: feedSource.projectId,
        state
      })
      if (versionIndex === -2) {
        console.warn('Feedsource has no feed version')
        return state
      }
      return update(state, {all: {
        [projectIndex]: {feedSources: {[sourceIndex]: {feedVersions: {
          // Merge notes into feed version and ensure note count matches notes length
          [versionIndex]: {$merge: {notes, noteCount: notes.length}
          }}}}}}
      })
    }
    case 'RECEIVE_GTFSEDITOR_SNAPSHOTS': {
      const {feedSource} = action.payload
      const {projectIndex, sourceIndex} = getIndexesFromFeed({
        feedSourceId: feedSource.id,
        projectId: feedSource.projectId,
        state
      })
      return update(state, {
        all: {
          [projectIndex]: {
            feedSources: {
              [sourceIndex]: {
                $merge: {
                  editorSnapshots: action.payload.snapshots
                }
              }
            }
          }
        }
      })
    }
    case 'SET_FEED_SOURCE_TABLE_FILTER_COUNT_STRATEGY':
      return update(
        state,
        {
          filter: {
            feedSourceTableFilterCountStrategy: {
              $set: action.payload
            }
          }
        }
      )
    case 'SET_FEED_SOURCE_TABLE_COMPARISON_COLUMN':
      return update(
        state,
        {
          filter: {
            feedSourceTableComparisonColumn: {
              $set: action.payload
            }
          }
        }
      )
    default:
      return state
  }
}

export default projects
