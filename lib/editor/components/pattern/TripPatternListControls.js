// @flow

import Icon from '../../../common/components/icon'
import clone from 'lodash/cloneDeep'
import React, {Component} from 'react'
import {OverlayTrigger, Tooltip, ButtonGroup, Button} from 'react-bootstrap'

import {ENTITY} from '../../constants'
import {generateUID} from '../../../common/util/util'
import {entityIsNew} from '../../util/objects'

import type {Props} from './TripPatternList'

export default class TripPatternListControls extends Component<Props> {
  _onClickClonePattern = () => {
    const {activePattern, cloneGtfsEntity, feedSource} = this.props
    cloneGtfsEntity(feedSource.id, 'trippattern', activePattern.id, true)
  }

  _onClickDeletePattern = () => {
    const {
      activeEntity,
      activePattern,
      deleteGtfsEntity,
      feedSource,
      setActiveEntity,
      showConfirmModal
    } = this.props
    const {id: patternId} = activePattern
    const {id: routeId} = activeEntity
    showConfirmModal({
      title: `Delete trip pattern?`,
      body: `Are you sure you want to delete this trip pattern? This will delete all trips associated with this pattern.`,
      onConfirm: () => {
        // Delete trip pattern. After deletion/refetch, set active entity
        deleteGtfsEntity(feedSource.id, 'trippattern', patternId, routeId)
          // $FlowFixMe action is wrapped in dispatch
          .then(
            () => setActiveEntity(feedSource.id, 'route', activeEntity, 'trippattern')
          )
      },
      confirmButtonStyle: 'danger',
      confirmButtonText: 'Delete pattern'
    })
  }

  _onClickNew = () => {
    const {activeEntity, feedSource, newGtfsEntity} = this.props
    const newPattern = {
      // FIXME: There is no table object in gtfs.yml for trippattern. Should there be?
      // ...generateNullProps('trippattern'),
      routeId: activeEntity.route_id,
      directionId: null,
      patternStops: [],
      name: 'New Pattern',
      // FIXME should we be using some other method to generate ID?
      patternId: generateUID(),
      shapeId: generateUID(),
      useFrequency: 0,
      shapePoints: [],
      id: ENTITY.NEW_ID
    }
    newGtfsEntity(feedSource.id, 'trippattern', newPattern, true)
  }

  /**
   * Reverse trip pattern by reversing both the order of the pattern stops and
   * the order of the shape points. NOTE: this does not change the travel times
   * for the pattern stops.
   */
  _onClickReversePattern = () => {
    const {
      activePattern,
      controlPoints,
      patternSegments,
      saveActiveGtfsEntity,
      showConfirmModal,
      updatePatternStops,
      updatePatternGeometry
    } = this.props
    showConfirmModal({
      title: `Reverse trip pattern?`,
      body: `Are you sure you want to reverse this trip pattern?`,
      onConfirm: () => {
        // Travel time will be offset by one stop (travel time for first stop
        // should be zero).
        let defaultTravelTime = 0
        const {patternStops} = activePattern
        // Store total distance from last pattern stop
        const lastStop = patternStops[patternStops.length - 1]
        const totalDistance = lastStop.shapeDistTraveled
        // Clone pattern stops and reverse them, updating shape dist traveled
        // and travel time for the new order.
        const clonedPatternStops = [...patternStops]
          .reverse()
          .map((ps, i) => {
            const patternStop = {
              ...ps,
              // $FlowFixMe
              shapeDistTraveled: totalDistance - ps.shapeDistTraveled,
              defaultTravelTime,
              stopSequence: i
            }
            // Update default travel time for next iteration.
            defaultTravelTime = ps.defaultTravelTime
            return patternStop
          })
        updatePatternGeometry({
          // Reverse control points
          controlPoints: clone(controlPoints).reverse(),
          // Reverse order of segments and each segment's coordinate list.
          patternSegments: clone(patternSegments)
            .map(seg => seg.reverse())
            .reverse()
        })
        updatePatternStops(activePattern, clonedPatternStops)
        saveActiveGtfsEntity('trippattern')
      }
    })
  }

  render () {
    const {activeEntity, activePatternId, activePatternTripCount} = this.props
    const {tripPatterns} = activeEntity
    const patternHasTrips = activePatternTripCount > 0
    const createPatternDisabled = tripPatterns && tripPatterns.findIndex(entityIsNew) !== -1
    return (
      <div className='trip-pattern-controls'>
        <ButtonGroup
          className='pull-right'>
          <OverlayTrigger
            placement='bottom'
            overlay={<Tooltip id='tooltip'>Reverse trip pattern</Tooltip>}>
            <Button
              bsSize='small'
              title={patternHasTrips
                ? 'Cannot reverse patterns that have trips'
                : 'Select pattern to reverse'}
              // Do not allow reversing trip pattern if it has trips
              disabled={!activePatternId || patternHasTrips}
              onClick={this._onClickReversePattern}>
              <Icon type='exchange' />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement='bottom'
            overlay={<Tooltip id='tooltip'>Duplicate trip pattern</Tooltip>}>
            <Button
              bsSize='small'
              data-test-id='duplicate-pattern-button'
              disabled={!activePatternId}
              onClick={this._onClickClonePattern}
            >
              <Icon type='clone' />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement='bottom'
            overlay={<Tooltip id='tooltip'>Delete trip pattern</Tooltip>}>
            <Button
              bsSize='small'
              data-test-id='delete-pattern-button'
              disabled={!activePatternId}
              onClick={this._onClickDeletePattern}
            >
              <Icon type='trash' />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
        <Button
          bsSize='small'
          data-test-id='new-pattern-button'
          disabled={createPatternDisabled}
          onClick={this._onClickNew}
        >
          <Icon type='plus' /> New pattern
        </Button>
      </div>
    )
  }
}
