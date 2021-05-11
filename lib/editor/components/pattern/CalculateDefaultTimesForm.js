// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import {
  Button,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  InputGroup,
  Well
} from 'react-bootstrap'

import * as activeActions from '../../actions/active'
import * as tripPatternActions from '../../actions/tripPattern'
import MinuteSecondInput from '../MinuteSecondInput'
import NormalizeStopTimesTip from './NormalizeStopTimesTip'
import {getDistanceScaleFactor, straightLineDistancesBetweenStopAnchors} from '../../util/map'

import type {ControlPoint, Pattern} from '../../../types'

type Props = {
  activePattern: Pattern,
  controlPoints: Array<ControlPoint>,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  updatePatternStops: typeof tripPatternActions.updatePatternStops
}

type State = {
  dwellTime: number,
  speed: number
}

const DEFAULT_SPEED = 20 // km/hr

export default class CalculateDefaultTimesForm extends Component<Props, State> {
  state = {
    speed: DEFAULT_SPEED,
    dwellTime: 0
  }

  _calculateDefaultTimes = () => {
    const {activePattern, controlPoints, saveActiveGtfsEntity, updatePatternStops} = this.props
    const {dwellTime, speed} = this.state
    const patternStops = [...activePattern.patternStops]
    const convertedSpeed = speed * 1000 / 60 / 60 // km/hr -> m/s
    const straightLineDistances = straightLineDistancesBetweenStopAnchors(controlPoints)
    // Get the distance scale factor (pattern length / total shape dist traveled).
    const distScaleFactor = activePattern.shape
      ? getDistanceScaleFactor(activePattern.shapePoints)
      : 1
    for (var i = 0; i < patternStops.length; i++) {
      let interStopDistance = 0
      patternStops[i].defaultDwellTime = dwellTime
      // Default travel time set to zero unless it is updated with a valid value
      // below.
      patternStops[i].defaultTravelTime = 0
      if (i > 0) {
        // Only update travel time for stops after the first stop because the
        // time to travel to the first stop (from the first stop) should be zero.
        if (activePattern.shape) {
          // If there is a pattern shape, use the shape distance traveled values
          // if they are valid values.
          const begin = patternStops[i - 1].shapeDistTraveled
          const end = patternStops[i].shapeDistTraveled
          if (typeof begin === 'number' && typeof end === 'number' && end >= begin) {
            interStopDistance = end - begin
          } else interStopDistance = straightLineDistances[i - 1]
        } else {
          // Otherwise, use straight line distances between stops (there are
          // only n - 1 distances between n stops, hence the i - 1 for the index).
          interStopDistance = straightLineDistances[i - 1]
        }
        if (interStopDistance <= 0) {
          // Never permit the calculation of negative stop distance values (if that
          // were somehow to occur).
          console.warn(
            `Inter stop distance (betwen pattern stops ${i - 1} and ${i}) is
            negative or zero (${interStopDistance} meters). Defaulting travel time to zero.`,
            patternStops[i - 1], patternStops[i])
        } else {
          const interStopDistanceInMeters = interStopDistance * distScaleFactor
          patternStops[i].defaultTravelTime = Math.floor(interStopDistanceInMeters / convertedSpeed)
        }
      }
    }
    updatePatternStops(activePattern, patternStops)
    saveActiveGtfsEntity('trippattern')
  }

  _onDwellTimeChange = (value: number) => this.setState({dwellTime: value})

  _onSpeedChange = (evt: SyntheticInputEvent<HTMLInputElement>) =>
    this.setState({speed: +evt.target.value})

  render () {
    return (
      <Form>
        <FormGroup className={`col-xs-4`} bsSize='small'>
          <ControlLabel>
            <small>
              Dwell time
            </small>
          </ControlLabel>
          <MinuteSecondInput
            seconds={this.state.dwellTime}
            onChange={this._onDwellTimeChange} />
        </FormGroup>
        {'  '}
        <InputGroup
          style={{paddingTop: '25px'}}
          className={`col-xs-8`}
          bsSize='small'>
          <FormControl
            type='number'
            min={1}
            placeholder={`${DEFAULT_SPEED} (km/hr)`}
            onChange={this._onSpeedChange} />
          <InputGroup.Button>
            <Button
              onClick={this._calculateDefaultTimes}
              bsStyle='default'>
              <Icon type='calculator' /> Calc. times
            </Button>
          </InputGroup.Button>
        </InputGroup>
        <br />
        <Well style={{padding: '8px'}}>
          <NormalizeStopTimesTip />
        </Well>
      </Form>
    )
  }
}
