// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { GeoJSON, Popup } from 'react-leaflet'
import { Button } from 'react-bootstrap'

import { getRouteName } from '../../editor/util/gtfs'

import type {GtfsRoute, Feed} from '../../types'

type Props = {
  index: number,
  onRouteClick: ?(feed: Feed, route: GtfsRoute) => void,
  pattern: any,
  popupActionPrefix: ?string
}

const COLORS = ['#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99']

export default class PatternGeoJson extends Component<Props> {
  static defaultProps = {
    index: 0
  }
  _onClickAction = () => {
    const {onRouteClick, pattern} = this.props
    const {feed, route} = pattern
    onRouteClick && onRouteClick(feed, route)
  }

  render () {
    const {
      index,
      onRouteClick,
      pattern,
      popupActionPrefix
    } = this.props
    if (!pattern) {
      return null
    }
    const {feed, route: routeArray} = pattern
    const route = Array.isArray(routeArray) ? routeArray[0] : routeArray
    const routeName = route ? getRouteName(route) : pattern.route_name
    const routeId = route ? route.route_id : pattern.route_id
    return (
      <GeoJSON
        color={COLORS[index % (COLORS.length - 1)]}
        data={pattern.geometry}
      >
        <Popup>
          <div>
            <p>
              <Icon type='bus' />{' '}
              <strong>{onRouteClick ? routeName : pattern.name}</strong>
            </p>
            <ul>
              <li><strong>Route ID:</strong> {routeId}</li>
              {feed &&
                <li><strong>Agency:</strong> {feed.name}</li>
              }
            </ul>
            {onRouteClick &&
              <Button
                bsStyle='primary'
                block
                onClick={this._onClickAction}>
                <Icon type='bus' /> {popupActionPrefix} route
              </Button>
            }
          </div>
        </Popup>
      </GeoJSON>
    )
  }
}
