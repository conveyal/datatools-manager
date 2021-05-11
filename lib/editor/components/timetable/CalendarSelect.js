// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import { Label as BsLabel } from 'react-bootstrap'
import Select from 'react-select'

import * as activeActions from '../../actions/active'
import {entityIsNew} from '../../util/objects'

import type {Pattern, GtfsRoute, Feed, ServiceCalendar, Trip, TripCounts} from '../../../types'

type CalendarOption = {
  calendar: ServiceCalendar,
  calendarTrips: number,
  label: string,
  patternTrips: number,
  service_id: string,
  totalTrips: number,
  value: string
}

type Props = {
  activeCalendar: ?ServiceCalendar,
  activePattern: Pattern,
  calendars: Array<ServiceCalendar>,
  feedSource: Feed,
  route: GtfsRoute,
  setActiveEntity: typeof activeActions.setActiveEntity,
  tripCounts: TripCounts,
  trips: Array<Trip>
}

export default class CalendarSelect extends Component<Props> {
  _optionRenderer = (option: CalendarOption) => {
    const {
      label,
      service_id: serviceId,
      patternTrips,
      totalTrips
    } = option
    // If label consists of service_id, don't append parenthetical service_id to
    // label for title
    const title = label !== serviceId
      ? `${label} (${serviceId})`
      : label
    // FIXME: Add back route count and route trips for calendar?
    return (
      <span title={title}>
        <Icon type='calendar-o' /> {label}
        {' '}
        <BsLabel
          bsStyle={patternTrips ? 'success' : 'default'}
          title={`Calendar has ${patternTrips} trips for pattern`}>
          <Icon type='bars' /> {patternTrips}
        </BsLabel>
        {/** {' '}
        <BsLabel
          title={`Calendar has trips for ${routeCount} routes`}>
          <Icon type='bus' /> {routeCount}
        </BsLabel> **/}
        {' '}
        <BsLabel
          title={`Calendar has ${totalTrips} trips for feed`}>
          <Icon type='building-o' /> {totalTrips}
        </BsLabel>
      </span>
    )
  }

  _onChange = (value: CalendarOption) => {
    const {activePattern, feedSource, route, setActiveEntity} = this.props
    const calendar = value && value.calendar
    setActiveEntity(
      feedSource.id,
      'route',
      route,
      'trippattern',
      activePattern,
      'timetable',
      calendar
    )
  }

  _getTripCount = (tripCounts: ?TripCounts, id: string): number => {
    const item = tripCounts && tripCounts.service_id.find(item => item.type === id)
    return item ? item.count : 0
  }

  _getPatternTripCount = (tripCounts: ?TripCounts, serviceId: string, patternId: string): number => {
    const item = tripCounts && tripCounts[`pattern:${patternId}`] && tripCounts[`pattern:${patternId}`].service_id
      .find(item => item.type === serviceId)
    return item ? item.count : 0
  }

  _getOptions = (): Array<CalendarOption> => {
    const {activePattern, calendars, tripCounts, trips} = this.props
    const patternId = activePattern && activePattern.patternId
    const calendarOptions: Array<CalendarOption> = calendars && activePattern
      ? calendars
        .map(calendar => ({
          label: calendar.description || calendar.service_id,
          value: calendar.service_id,
          service_id: calendar.service_id,
          calendar,
          patternTrips: this._getPatternTripCount(tripCounts, calendar.service_id, patternId),
          totalTrips: this._getTripCount(tripCounts, calendar.service_id),
          // FIXME: argh, IDs should not be integers...
          // routeTrips: 0, // calendar.routes[route.id] || 0,
          calendarTrips: trips.length
        }))
      : []

    return calendarOptions
      .sort((a, b) => {
        return b.patternTrips - a.patternTrips
        // if (route.id in a.routes && !(route.id in b.routes)) return -1
        // else if (route.id in b.routes && !(route.id in a.routes)) return 1
        // else return b.numberOfTrips - a.numberOfTrips
      })
  }

  render () {
    const {
      activePattern,
      activeCalendar
    } = this.props
    return (
      <Select
        value={activeCalendar && activeCalendar.service_id}
        placeholder={<span><Icon type='calendar-o' /> Select calendar...</span>}
        valueRenderer={this._optionRenderer}
        optionRenderer={this._optionRenderer}
        disabled={!activePattern || entityIsNew(activePattern)}
        options={this._getOptions()}
        onChange={this._onChange}
        filterOptions />
    )
  }
}
