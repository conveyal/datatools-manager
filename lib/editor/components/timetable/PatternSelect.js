// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import {Label as BsLabel} from 'react-bootstrap'
import Select from 'react-select'

import * as activeActions from '../../actions/active'
import * as tripActions from '../../actions/trip'
import {ENTITY} from '../../constants'
import {getEntityName} from '../../util/gtfs'

import type {Pattern, GtfsRoute, Feed, TripCounts} from '../../../types'

type PatternOption = {
  label: string,
  pattern: Pattern,
  tripCount: number,
  value: number
}

type Props = {
  activePattern: Pattern,
  feedSource: Feed,
  fetchCalendarTripCountsForPattern: typeof tripActions.fetchCalendarTripCountsForPattern,
  route: GtfsRoute,
  setActiveEntity: typeof activeActions.setActiveEntity,
  tripCounts: TripCounts
}

export default class PatternSelect extends Component<Props> {
  /**
   * Fetch active pattern's trip counts when component mounts.
   */
  componentDidMount () {
    const {
      activePattern,
      feedSource,
      fetchCalendarTripCountsForPattern
    } = this.props
    if (activePattern) {
      fetchCalendarTripCountsForPattern(feedSource.id, activePattern.patternId)
    }
  }

  /**
   * Fetch new pattern's trip counts whenever the pattern is changed.
   */
  componentWillReceiveProps (nextProps: Props) {
    const {
      activePattern: newPattern,
      feedSource,
      fetchCalendarTripCountsForPattern
    } = nextProps
    const currentPatternId = this.props.activePattern && this.props.activePattern.id
    if (newPattern && newPattern.id !== currentPatternId) {
      fetchCalendarTripCountsForPattern(feedSource.id, newPattern.patternId)
    }
  }

  _optionRenderer = (option: PatternOption) => {
    // FIXME: Add number of calendars for which pattern has trips?
    // const calendarCount = Object.keys(option.pattern.tripCountByCalendar).length
    return (
      <span title={option.label}>
        <Icon type='code-fork' /> {option.label}
        {' '}
        <BsLabel
          title={`Pattern has ${option.tripCount} trips`}>
          <Icon type='bars' /> {option.tripCount}
        </BsLabel>
        {/** {' '}
        <BsLabel
          title={`Pattern has trips for ${calendarCount} calendars`}>
          <Icon type='calendar-o' /> {calendarCount}
        </BsLabel> **/}
      </span>
    )
  }

  _onChange = (value: PatternOption) => {
    const {feedSource, route, setActiveEntity} = this.props
    const pattern = value ? value.pattern : {id: ENTITY.NEW_ID}
    setActiveEntity(feedSource.id, 'route', route, 'trippattern', pattern, 'timetable', null)
  }

  _getTripCount = (tripCounts: TripCounts, id: string) => {
    const item = tripCounts && tripCounts.pattern_id.find(item => item.type === id)
    return item ? item.count : 0
  }

  _getOptions = (): Array<PatternOption> => {
    const {route, tripCounts} = this.props
    const patterns = route && route.tripPatterns ? route.tripPatterns : []
    return patterns.map(pattern => ({
      value: pattern.id,
      label: `${getEntityName(pattern)}` || '[Unnamed]',
      pattern,
      tripCount: this._getTripCount(tripCounts, pattern.patternId)
    }))
  }

  render () {
    const {activePattern} = this.props
    return (
      <Select
        value={activePattern && activePattern.id}
        component={'pattern'}
        valueRenderer={this._optionRenderer}
        optionRenderer={this._optionRenderer}
        placeholder={<span><Icon type='code-fork' /> Select pattern...</span>}
        options={this._getOptions()}
        onChange={this._onChange} />
    )
  }
}
