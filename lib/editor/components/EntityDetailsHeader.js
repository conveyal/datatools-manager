// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Badge, Button, ButtonGroup, Tooltip, OverlayTrigger, Nav, NavItem} from 'react-bootstrap'

import * as activeActions from '../actions/active'
import * as mapActions from '../actions/map'
import {getEntityBounds, getEntityName} from '../util/gtfs'
import {entityIsNew} from '../util/objects'
import {GTFS_ICONS} from '../util/ui'

import type {Entity, Feed, GtfsRoute, GtfsStop, Pattern} from '../../types'
import type {MapState} from '../../types/reducers'
import type {EditorValidationIssue} from '../util/validation'

type RouteWithPatterns = {tripPatterns: Array<Pattern>} & GtfsRoute

type Props = {
  activeComponent: string,
  activeEntity: Entity,
  activePattern: Pattern,
  activePatternStops: Array<GtfsStop>,
  editFareRules: boolean,
  entityEdited: boolean,
  feedSource: Feed,
  mapState: MapState,
  resetActiveGtfsEntity: typeof activeActions.resetActiveGtfsEntity,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  subComponent: string,
  subEntity: number,
  toggleEditFareRules: boolean => void,
  updateMapSetting: typeof mapActions.updateMapSetting,
  validationErrors: Array<EditorValidationIssue>
}

export default class EntityDetailsHeader extends Component<Props> {
  _onClickSave = () => {
    if (this.props.subComponent === 'trippattern') {
      this.props.saveActiveGtfsEntity('trippattern')
    } else {
      this.props.saveActiveGtfsEntity(this.props.activeComponent)
    }
  }

  _onClickUndo = () => {
    const {
      activeComponent,
      activeEntity,
      activePattern,
      resetActiveGtfsEntity,
      subComponent
    } = this.props
    if (subComponent === 'trippattern') {
      const castedRoute = ((activeEntity: any): RouteWithPatterns)
      const pattern = castedRoute.tripPatterns.find(p => p.id === activePattern.id)
      if (pattern) resetActiveGtfsEntity({ entity: pattern, component: 'trippattern' })
      else console.warn(`Could not locate pattern with id=${activePattern.id}`)
    } else {
      resetActiveGtfsEntity({ entity: activeEntity, component: activeComponent })
    }
  }

  _onClickZoomTo = () => {
    const { activeEntity, activePatternStops, subEntity, updateMapSetting } = this.props
    let props
    if (subEntity) {
      const castedRoute = ((activeEntity: any): RouteWithPatterns)
      const pattern = castedRoute.tripPatterns.find(p => p.id === subEntity)
      props = { bounds: getEntityBounds(pattern, activePatternStops), target: subEntity }
    } else {
      props = { bounds: getEntityBounds(activeEntity), target: +activeEntity.id }
    }
    updateMapSetting(props)
  }

  _showFareAttributes = () => this.props.toggleEditFareRules(false)

  _showFareRules = () => this.props.toggleEditFareRules(true)

  _showRoute = () => {
    const {
      activeComponent,
      activeEntity,
      feedSource,
      setActiveEntity,
      subComponent
    } = this.props
    if (subComponent === 'trippattern') {
      setActiveEntity(feedSource.id, activeComponent, activeEntity)
    }
  }

  _showTripPatterns = () => {
    const {
      activeComponent,
      activeEntity,
      feedSource,
      setActiveEntity,
      subComponent
    } = this.props
    if (subComponent !== 'trippattern') {
      setActiveEntity(feedSource.id, activeComponent, activeEntity, 'trippattern')
    }
  }

  render () {
    const {
      activeComponent,
      activeEntity,
      editFareRules,
      entityEdited,
      mapState,
      subComponent,
      subEntity,
      validationErrors
    } = this.props
    const validationTooltip = (
      <Tooltip id='tooltip'>
        {validationErrors.map((v, i) => (
          <p key={i}>{v.field}: {v.reason}</p>
        ))}
      </Tooltip>
    )
    const hasErrors = validationErrors.length > 0
    const entityName = activeComponent === 'feedinfo'
      ? 'Feed Info'
      : getEntityName(activeEntity)
    const icon = GTFS_ICONS.find(i => i.id === activeComponent)
    const zoomDisabled = activeEntity && !subComponent
      ? mapState.target === activeEntity.id
      : mapState.target === subEntity
    const iconName = icon ? icon.icon : null
    const nameWidth = activeComponent === 'stop' || activeComponent === 'route'
      ? '176px'
      : '210px'
    return (
      <div className='entity-details-header'>
        <h5 className='entity-details-heading'>
          {/* Zoom, undo, and save buttons */}
          <ButtonGroup className='pull-right'>
            {activeComponent === 'stop' || activeComponent === 'route'
              ? <OverlayTrigger
                rootClose
                placement='bottom'
                overlay={<Tooltip id='tooltip'>Zoom to {activeComponent}</Tooltip>}>
                <Button
                  bsSize='small'
                  disabled={zoomDisabled}
                  onClick={this._onClickZoomTo}>
                  <Icon type='search' />
                </Button>
              </OverlayTrigger>
              : null
            }
            <OverlayTrigger
              rootClose
              placement='bottom'
              overlay={<Tooltip id='tooltip'>Undo changes</Tooltip>}>
              <Button
                bsSize='small'
                disabled={!entityEdited}
                onClick={this._onClickUndo}>
                <Icon type='undo' />
              </Button>
            </OverlayTrigger>
            <OverlayTrigger
              rootClose
              placement='bottom'
              overlay={<Tooltip id='tooltip'>Save changes</Tooltip>}>
              <Button
                bsSize='small'
                data-test-id='save-entity-button'
                disabled={!entityEdited || hasErrors}
                onClick={this._onClickSave}>
                <Icon type='floppy-o' />
              </Button>
            </OverlayTrigger>
          </ButtonGroup>
          <span className='entity-details-title' style={{width: nameWidth}}>
            {/* Entity Icon */}
            <span style={{position: 'relative', top: '-4px'}}>
              {activeComponent === 'route'
                ? <span className='fa-stack'>
                  <Icon
                    type='square'
                    style={{color: `#${activeEntity.route_color || 'fff'}`}}
                    className='fa-stack-2x' />
                  <Icon
                    type='bus'
                    style={{color: `#${activeEntity.route_text_color || '000'}`}}
                    className='fa-stack-1x' />
                </span>
                : iconName
                  ? <span className='fa-stack'>
                    <Icon type='square' className='fa-stack-2x' />
                    <Icon type={iconName} className='fa-inverse fa-stack-1x' />
                  </span>
                  // schedule exception icon if no icon found
                  : <span className='fa-stack'>
                    <Icon type='calendar' className='fa-stack-1x' />
                    <Icon type='ban' className='text-danger fa-stack-2x' />
                  </span>
              }
            </span>
            {'  '}
            {/* Entity name */}
            <span
              title={entityName}
              className='entity-details-name'>
              {entityName}
            </span>
          </span>
        </h5>
        {/* Validation issues */}
        <p style={{marginBottom: '2px'}}>
          <small style={{marginTop: '3px'}} className='pull-right'>
            <em className='text-muted'>* denotes required field</em>
          </small>
          <small
            className={`${hasErrors ? ' text-danger' : ' text-success'}`}>
            {hasErrors
              ? <span>
                <Icon type='times-circle' />
                {' '}
                Fix
                {' '}
                <OverlayTrigger
                  placement='bottom'
                  overlay={validationTooltip}>
                  <span style={{borderBottom: '1px dotted #000'}}>
                    {validationErrors.length} validation issue(s)
                  </span>
                </OverlayTrigger>
              </span>
              : <span><Icon type='check-circle' /> No validation issues</span>
            }
          </small>
        </p>
        <div className='clearfix' />
        {activeComponent === 'route'
          ? <Nav style={{marginBottom: '5px'}} bsStyle='pills' justified>
            <NavItem
              eventKey={'route'}
              active={subComponent !== 'trippattern'}
              onClick={this._showRoute}>
              Route details
            </NavItem>
            <OverlayTrigger placement='bottom' overlay={<Tooltip id='tooltip'>Trip patterns define a route&rsquo;s unique stop sequences and timings.</Tooltip>}>
              <NavItem
                active={subComponent === 'trippattern'}
                data-test-id='trippattern-tab-button'
                disabled={!activeEntity || entityIsNew(activeEntity)}
                eventKey={'trippattern'}
                onClick={this._showTripPatterns}
              >
                Trip patterns
                <Badge>{activeEntity.tripPatterns ? activeEntity.tripPatterns.length : 0}</Badge>
              </NavItem>
            </OverlayTrigger>
          </Nav>
          : activeComponent === 'fare'
            ? <Nav style={{marginBottom: '5px'}} bsStyle='pills' justified>
              <NavItem
                active={!editFareRules}
                data-test-id='fare-attributes-tab-button'
                eventKey={'fare'}
                onClick={this._showFareAttributes}
              >
                Attributes
              </NavItem>
              <NavItem
                active={editFareRules}
                data-test-id='fare-rules-tab-button'
                disabled={!activeEntity || entityIsNew(activeEntity)}
                eventKey={'rules'}
                onClick={this._showFareRules}
              >
                Rules
              </NavItem>
            </Nav>
            : null
        }
      </div>
    )
  }
}
