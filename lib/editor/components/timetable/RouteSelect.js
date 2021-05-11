// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import { Label as BsLabel } from 'react-bootstrap'
import Select from 'react-select'
import truncate from 'truncate'

import * as activeActions from '../../actions/active'
import {ENTITY} from '../../constants'
import { getEntityName } from '../../util/gtfs'

import type {Feed, GtfsRoute, TripCounts} from '../../../types'

type RouteOption = {
  label: string,
  route: GtfsRoute,
  routeTrips: number,
  value: number
}

type Props = {
  feedSource: Feed,
  route: GtfsRoute,
  routes: Array<GtfsRoute>,
  setActiveEntity: typeof activeActions.setActiveEntity,
  tripCounts: TripCounts
}

export default class RouteSelect extends Component<Props> {
  _optionRenderer = (option: RouteOption) => {
    return (
      <span title={option.label}>
        <Icon type='bus' /> {truncate(option.label, 23)}
        {' '}
        <BsLabel title={`Route has ${option.routeTrips} trips`}>
          <Icon type='bars' /> {option.routeTrips}
        </BsLabel>
      </span>
    )
  }

  _onChange = (value: RouteOption) => {
    const {route} = value
    const {feedSource, setActiveEntity} = this.props
    // FIXME: On selection of a new route, this sets the pattern to a blank 'new'
    // object in order to keep the timetable editor from being exited (the
    // timetable editor depends on having an active route and trip pattern).
    // Perhaps the new ID should be replaced with a blank ID constant
    const patt = {id: ENTITY.NEW_ID}
    setActiveEntity(feedSource.id, 'route', route, 'trippattern', patt, 'timetable', null)
  }

  _getTripCount = (tripCounts: TripCounts, id: string) => {
    const item = tripCounts && tripCounts.route_id.find(item => item.type === id)
    return item ? item.count : 0
  }

  _getOptions = () => {
    const {routes, tripCounts} = this.props
    if (!routes) return []
    return routes.map(route => ({
      value: route.id,
      label: `${getEntityName(route)}` || '[Unnamed]',
      route,
      routeTrips: this._getTripCount(tripCounts, route.route_id)
    }))
  }

  render () {
    const {route, routes} = this.props
    return (
      <Select
        value={route && route.id}
        component={'route'}
        valueRenderer={this._optionRenderer}
        optionRenderer={this._optionRenderer}
        placeholder={<span><Icon type='bus' /> Select route...</span>}
        options={this._getOptions()}
        clearable={false}
        entities={routes}
        onChange={this._onChange} />
    )
  }
}
