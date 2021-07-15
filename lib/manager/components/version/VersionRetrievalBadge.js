// @flow

import Icon from '@conveyal/woonerf/components/icon'
import React from 'react'

import toSentenceCase from '../../../common/util/to-sentence-case'
import type { FeedVersion, RetrievalMethod } from '../../../types'

type Props = {
  retrievalMethod?: RetrievalMethod,
  version?: FeedVersion
}

const iconForRetrievalMethod = (retrievalMethod: RetrievalMethod | 'UNKNOWN') => {
  switch (retrievalMethod) {
    case 'SERVICE_PERIOD_MERGE':
      return 'code-fork'
    case 'REGIONAL_MERGE':
      return 'globe'
    case 'PRODUCED_IN_HOUSE':
    case 'PRODUCED_IN_HOUSE_GTFS_PLUS':
      return 'pencil'
    case 'MANUALLY_UPLOADED':
      return 'upload'
    case 'FETCHED_AUTOMATICALLY':
      return 'cloud-download'
    case 'VERSION_CLONE':
      return 'clone'
    default:
      return 'file-archive-o'
  }
}

export default function VersionRetrievalBadge (props: Props) {
  const { retrievalMethod, version } = props
  const method = retrievalMethod || (version && version.retrievalMethod) || 'UNKNOWN'
  return (
    <Icon
      title={toSentenceCase(method.replace(/_/g, ' '))}
      type={iconForRetrievalMethod(method)}
    />
  )
}
