// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { ListGroupItem, Row, Col, Button, Collapse, Glyphicon, Label as BsLabel } from 'react-bootstrap'

import * as activeAlertActions from '../actions/activeAlert'
import { getFeed } from '../../common/util/modules'
import { getRouteNameAlerts } from '../../editor/util/gtfs'
import AgencySelector from './AgencySelector'
import ModeSelector from './ModeSelector'
import StopSelector from './StopSelector'
import RouteSelector from './RouteSelector'

import type {AlertEntity, Feed} from '../../types'

type Props = {
  activeFeeds: Array<Feed>,
  deleteActiveEntity: typeof activeAlertActions.deleteActiveEntity,
  entity: AlertEntity,
  feeds: Array<Feed>,
  updateActiveEntity: typeof activeAlertActions.updateActiveEntity
}

type State = {
  active: boolean
}

export default class AffectedEntity extends Component<Props, State> {
  state = {
    active: false
  }

  _onRowClick = () => this.setState({ active: !this.state.active })

  _onClickDeleteEntity = () => this.props.deleteActiveEntity(this.props.entity)

  getEntitySummary (entity: AlertEntity) {
    const { feeds } = this.props
    const { stop } = entity
    const type = entity.type || 'AGENCY'
    const val = entity[type.toLowerCase()]
    let agencyName = ''
    let stopName = entity.stop_id
    if (entity.agency) {
      agencyName = entity.agency.name
    } else if (stop) {
      // FIXME feed_id?
      const feed = getFeed(feeds, stop.feed_id)
      agencyName = feed
        ? feed.name
        : 'Unknown agency'
    }
    const routeName = entity.route
      ? getRouteNameAlerts(entity.route)
      : entity.route_id
    if (stop) {
      const stopCode = stop.stop_code ? stop.stop_code : stop.stop_id
      stopName = `${stop.stop_name} (${stopCode}) ${agencyName}`
    }
    let summary = ''
    switch (type) {
      case 'AGENCY' :
        return (
          <span>
            <BsLabel bsStyle='warning'><Icon type='building' /></BsLabel>{' '}
            {agencyName}<br />
            <small style={{ marginLeft: '18px' }}>
              Note: this selection will apply to all stops and routes for
              {agencyName}.
            </small>
          </span>
        )
      case 'STOP' :
        summary = stopName || '[no stop id]'
        if (routeName) {
          summary += ` for ${routeName}`
        }
        return <span><Icon type='map-marker' /> {summary}</span>
      case 'ROUTE' :
        summary = routeName || '[no route id]'
        if (stopName) {
          summary += ` at ${stopName}`
        }
        return <span><Glyphicon glyph='option-horizontal' /> {summary}</span>
      case 'MODE' :
        summary = val.name
        if (stopName) {
          summary += ` at ${stopName}`
        }
        return (
          <span>
            {type}: {summary}<br />
            <small style={{marginLeft: '18px'}}>
              Note: this selection will apply to all {val.name.toLowerCase()}{' '}
              routes{stopName && ` stopping at ${stopName}`}.
            </small>
          </span>
        )
    }
  }

  renderHeader (entity: AlertEntity) {
    return (
      <Row
        className='list-group-item-heading'
        onClick={this._onRowClick}
        style={{cursor: 'pointer'}}>
        <Col xs={10}>
          <h5>
            <Icon type={this.state.active ? 'caret-down' : 'caret-right'} />
            {this.getEntitySummary(entity)}
          </h5>
        </Col>
        <Col xs={2}>
          <Button
            bsSize='small'
            className='pull-right'
            style={{marginTop: '5px'}}
            onClick={this._onClickDeleteEntity}>
            <Icon type='remove' />
          </Button>
        </Col>
      </Row>
    )
  }

  renderEntity (entity: AlertEntity) {
    const {activeFeeds, feeds, updateActiveEntity} = this.props
    const indent = {
      paddingLeft: '30px'
    }
    const selectedFeeds = entity.agency ? [entity.agency] : activeFeeds
    const selectedRoute = entity.route
    const selectedStop = entity.stop
    switch (entity.type) {
      case 'AGENCY':
        return (
          <div className='list-group-item-text'>
            <span><b>Agency:</b></span>
            <AgencySelector
              feeds={feeds}
              updateActiveEntity={updateActiveEntity}
              entity={entity} />
          </div>
        )
      case 'MODE':
        return (
          <div className='list-group-item-text'>
            <span><b>Mode:</b></span>
            <ModeSelector
              updateActiveEntity={updateActiveEntity}
              value={entity.type}
              entity={entity} />
            <div style={indent}>
              <span><i>Refine by Agency:</i></span>
              <AgencySelector
                feeds={feeds}
                updateActiveEntity={updateActiveEntity}
                entity={entity} />
              <span><i>Refine by Stop:</i></span>
              <StopSelector
                feeds={selectedFeeds}
                stop={entity.stop}
                updateActiveEntity={updateActiveEntity}
                entity={entity} />
            </div>
          </div>
        )
      case 'STOP':
        return (
          <div className='list-group-item-text'>
            <span><b>Stop:</b></span>
            <StopSelector
              feeds={activeFeeds}
              stop={entity.stop}
              clearable={false}
              updateActiveEntity={updateActiveEntity}
              entity={entity} />
            <div style={indent}>
              <span><i>Refine by Route:</i></span>
              <RouteSelector
                feeds={selectedFeeds}
                minimumInput={0}
                filterByStop={selectedStop}
                route={entity.route}
                updateActiveEntity={updateActiveEntity}
                entity={entity} />
            </div>
          </div>
        )
      case 'ROUTE':
        return (
          <div className='list-group-item-text'>
            <span><b>Route:</b></span>
            <RouteSelector
              feeds={activeFeeds}
              route={entity.route}
              clearable={false}
              updateActiveEntity={updateActiveEntity}
              entity={entity} />
            <div style={indent}>
              <span><i>Refine by Stop:</i></span>
              <StopSelector
                feeds={selectedFeeds}
                minimumInput={0}
                filterByRoute={selectedRoute}
                stop={entity.stop}
                updateActiveEntity={updateActiveEntity}
                entity={entity} />
            </div>
          </div>
        )
    }
  }

  render () {
    const {entity} = this.props
    const {type} = entity
    const bsStyle = (entity && (type === 'AGENCY' || type === 'MODE'))
      ? 'warning'
      : undefined
    return (
      <ListGroupItem bsStyle={bsStyle}>
        {this.renderHeader(entity)}
        <Collapse in={this.state.active}>
          {this.renderEntity(entity)}
        </Collapse>
      </ListGroupItem>
    )
  }
}
