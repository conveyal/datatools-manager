// @flow

import gravatar from 'gravatar'

import {getComponentMessages} from '../../common/util/config'
import type {Feed, FeedVersion, Project, SummarizedFeedVersion} from '../../types'
import { RETRIEVAL_METHODS } from '../constants'

export function defaultSorter (a: FeedVersion | Project | Feed, b: FeedVersion | Project | Feed): number {
  if (a.isCreating && !b.isCreating) return -1
  if (!a.isCreating && b.isCreating) return 1
  if (a.name && b.name && a.name.toLowerCase() < b.name.toLowerCase()) return -1
  if (a.name && b.name && a.name.toLowerCase() > b.name.toLowerCase()) return 1
  return 0
}

export function getAbbreviatedProjectName (project: Project): string {
  return project && project.name && project.name.length > 16
    ? `${project.name.substr(0, 12)}...`
    : project
      ? project.name
      : ''
}

export function versionsSorter (
  a: (FeedVersion | SummarizedFeedVersion),
  b: (FeedVersion | SummarizedFeedVersion)
): number {
  if (a.feedSource.name < b.feedSource.name) return -1
  if (a.feedSource.name > b.feedSource.name) return 1
  return 0
}

/**
 * Obtains the displayed (localizable) text for the given feed retrieval method.
 */
export function retrievalMethodString (method: string): string {
  // Get the retrieval method strings.
  const messages = getComponentMessages('FeedSourceViewer')
  const retrievalMethod = 'properties.retrievalMethod'

  switch (method) {
    case RETRIEVAL_METHODS.MANUALLY_UPLOADED:
      return messages(`${retrievalMethod}.manuallyUploaded`)
    case RETRIEVAL_METHODS.FETCHED_AUTOMATICALLY:
      return messages(`${retrievalMethod}.fetchedAutomatically`)
    case RETRIEVAL_METHODS.PRODUCED_IN_HOUSE:
      return messages(`${retrievalMethod}.producedInHouse`)
    case RETRIEVAL_METHODS.PRODUCED_IN_HOUSE_GTFS_PLUS:
      return messages(`${retrievalMethod}.producedInHouseGtfsPlus`)
    case RETRIEVAL_METHODS.REGIONAL_MERGE:
      return messages(`${retrievalMethod}.regionalMerge`)
    case RETRIEVAL_METHODS.SERVICE_PERIOD_MERGE:
      return messages(`${retrievalMethod}.servicePeriodMerge`)
    case RETRIEVAL_METHODS.VERSION_CLONE:
      return messages(`${retrievalMethod}.versionClone`)
    default:
      throw new Error('Unknown method')
  }
}

export function generateUID (): string {
  // TODO: replace with better UID generator if possible
  // this has a 1 in 1.7 million chance of a collision
  return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
}

export function generateRandomInt (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateRandomColor (): string {
  var letters = '0123456789ABCDEF'.split('')
  var color = ''
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

export function idealTextColor (bgColor: string): string {
  var nThreshold = 105
  var components = getRGBComponents(bgColor)
  var bgDelta =
    components.R * 0.299 + components.G * 0.587 + components.B * 0.114

  return 255 - bgDelta < nThreshold ? '000000' : 'FFFFFF'
}

function getRGBComponents (color: string): {B: number, G: number, R: number} {
  var r = color.substring(1, 3)
  var g = color.substring(3, 5)
  var b = color.substring(5, 7)

  return {
    R: parseInt(r, 16),
    G: parseInt(g, 16),
    B: parseInt(b, 16)
  }
}
// export const UserIsAuthenticated = UserAuthWrapper({
//   authSelector: state => state.user,
//   predicate: user => user.profile !== null,
//   // redirectAction: routerPush,
//   failureRedirectPath: '/',
//   allowRedirectBack: false,
//   wrapperDisplayName: 'UserIsAuthenticated'
// })
//
// export const UserIsAdmin = UserAuthWrapper({
//   authSelector: state => state.user,
//   predicate: user => user.permissions && user.permissions.isApplicationAdmin(),
//   // redirectAction: routerPush,
//   failureRedirectPath: '/',
//   allowRedirectBack: false,
//   wrapperDisplayName: 'UserIsAdmin'
// })

export function isValidZipFile (file: File): boolean {
  if (!file) return false
  const nameArray = file.name.split('.')
  return (
    // check for various possible zip file types
    (file.type === 'application/zip' ||
      file.type === 'application/x-zip' ||
      file.type === 'application/octet-stream' ||
      file.type === 'application/x-zip-compressed') &&
    nameArray[nameArray.length - 1] === 'zip'
  )
}

export function getProfileLink (email: string): string {
  return gravatar.profile_url(email, {format: 'html'})
}

export function getHeaders (token: string, includeContentType: boolean = true, contentType: string = 'application/json') {
  const headers: {[string]: string} = {
    'Authorization': `Bearer ${token}`
  }
  if (includeContentType) {
    headers['Content-Type'] = contentType
  }
  return headers
}

export function abbreviate (str: string, maxLen: number = 35) {
  return str.length < maxLen
    ? str
    : `${str.substr(0, maxLen)}...`
}
