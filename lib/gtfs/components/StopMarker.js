// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Button } from 'react-bootstrap'
import { divIcon } from 'leaflet'

import TransferPerformance from './TransferPerformance'

import type {Feed, GtfsStop, StopWithFeed} from '../../types'

type Props = {
  onStopClick: ?(props: {entities: Array<GtfsStop>, feed: Feed}) => void,
  popupActionPrefix: ?string,
  renderTransferPerformance: ?boolean,
  routes: Array<any>,
  stop: StopWithFeed
}

export default class StopMarker extends Component<Props> {
  /**
   * Action to fire when a stop action button is clicked in popup.
   */
  _onClickStopAction = () => {
    const {onStopClick, stop} = this.props
    const {feed} = stop
    if (onStopClick) onStopClick({feed, entities: [stop]})
    else console.warn('No action defined for onClick.')
  }

  _getChildStopsContent = () => {
    const {popupActionPrefix, stop} = this.props
    if (!stop.child_stops || stop.child_stops.length === 0) return null
    return (
      <div className='well' style={{marginTop: '5px'}}>
        <strong>
          NOTE: Stop is parent station to {stop.child_stops.length} stop(s):
        </strong>
        <ul
          style={{
            paddingLeft: '15px',
            // Ensure that list does not become too long for popup to display
            // properly.
            maxHeight: '100px',
            overflowY: 'scroll'
          }}>
          {stop.child_stops.map((s, i) =>
            <li key={i}>
              {s.stop_name} ({s.stop_code ? s.stop_code : s.stop_id})
            </li>
          )}
        </ul>
        <Button
          bsStyle='warning'
          block
          onClick={this._onClickChildStopsAction}>
          <Icon type='map-marker' /> {popupActionPrefix} all stops
        </Button>
      </div>
    )
  }

  /**
   * Action to fire when a child stop action button is clicked in popup. The
   * action performed will apply to both the parent and child stops.
   */
  _onClickChildStopsAction = () => {
    const {onStopClick, stop} = this.props
    const {feed} = stop
    const stops = []
    const childStops = stop.child_stops ? stop.child_stops : []
    stops.push(stop)
    stops.push(...childStops)
    if (onStopClick) onStopClick({feed, entities: stops})
    else console.warn('No action defined for onStopClick.')
  }

  render () {
    const {stop, renderTransferPerformance, onStopClick, popupActionPrefix, routes} = this.props
    if (!stop) return null
    const busIcon = divIcon({
      html: `<span title="${stop.stop_name}" class="fa-stack bus-stop-icon" style="opacity: 0.6">
              <i class="fa fa-circle fa-stack-2x" style="color: #ffffff"></i>
              <i class="fa fa-bus fa-stack-1x" style="color: #000000"></i>
            </span>`,
      className: '',
      iconSize: [24, 24]
    })
    const stopCode = stop.stop_code ? stop.stop_code : stop.stop_id
    const hasChildStops = stop.child_stops && stop.child_stops.length > 0
    return (
      <Marker
        ref={`marker-${stop.stop_id}`}
        icon={busIcon}
        position={[stop.stop_lat, stop.stop_lon]}>
        <Popup>
          <div>
            <p style={{fontSize: '1.2em'}}>
              <Icon type='map-marker' />{' '}
              <strong>{stop.stop_name} ({stopCode})</strong>
            </p>
            {renderTransferPerformance && <TransferPerformance stop={stop} routes={routes} />}
            {onStopClick && (
              <Button
                bsStyle='primary'
                block
                onClick={this._onClickStopAction}>
                <Icon type='map-marker' /> {popupActionPrefix}{' '}
                {hasChildStops
                  ? 'this stop only'
                  : 'stop'
                }
              </Button>
            )}
            {this._getChildStopsContent()}
          </div>
        </Popup>
      </Marker>
    )
  }
}
