// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import { Button } from 'react-bootstrap'

import * as activeActions from '../../actions/active'
import * as mapActions from '../../actions/map'
import * as stopStrategiesActions from '../../actions/map/stopStrategies'
import * as tripPatternActions from '../../actions/tripPattern'
import AddPatternStopDropdown from './AddPatternStopDropdown'
import NormalizeStopTimesModal from './NormalizeStopTimesModal'
import PatternStopContainer from './PatternStopContainer'
import VirtualizedEntitySelect from '../VirtualizedEntitySelect'
import {getEntityBounds, getEntityName} from '../../util/gtfs'

import type {Pattern, GtfsStop, Feed, ControlPoint, Coordinates} from '../../../types'
import type {EditorStatus, EditSettingsUndoState, MapState} from '../../../types/reducers'

type Props = {
  activePattern: Pattern,
  addStopToPattern: typeof stopStrategiesActions.addStopToPattern,
  controlPoints: Array<ControlPoint>,
  editSettings: EditSettingsUndoState,
  feedSource: Feed,
  mapState: MapState,
  normalizeStopTimes: typeof tripPatternActions.normalizeStopTimes,
  patternEdited: boolean,
  patternSegments: Array<Coordinates>,
  patternStop: {id: ?any, index: ?number},
  removeStopFromPattern: typeof stopStrategiesActions.removeStopFromPattern,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  setActiveStop: typeof tripPatternActions.setActiveStop,
  status: EditorStatus,
  stops: Array<GtfsStop>,
  updateActiveGtfsEntity: typeof activeActions.updateActiveGtfsEntity,
  updateEditSetting: typeof activeActions.updateEditSetting,
  updateMapSetting: typeof mapActions.updateMapSetting,
  updatePatternGeometry: typeof mapActions.updatePatternGeometry,
  updatePatternStops: typeof tripPatternActions.updatePatternStops
}

type State = {
  patternStopCandidate: ?GtfsStop,
  showNormalizeStopTimesModal: boolean
 }

export default class PatternStopsPanel extends Component<Props, State> {
  state = {
    showNormalizeStopTimesModal: false,
    patternStopCandidate: null
  }

  _toggleAddStopsMode = () => {
    const {editSettings, updateEditSetting} = this.props
    // Clear stop candidate (if defined).
    this.setState({patternStopCandidate: null})
    updateEditSetting({
      setting: 'addStops',
      value: !editSettings.present.addStops
    })
  }

  _clickNormalizeStopTimes = () =>
    this.setState({showNormalizeStopTimesModal: true})

  _onCloseModal = () => this.setState({showNormalizeStopTimesModal: false})

  _selectStop = (input: any) => {
    if (!input) {
      // Clear stop candidate if input is cleared.
      this.setState({patternStopCandidate: null})
      return
    }
    const stop: GtfsStop = input.entity
    // Zoom to stop candidate
    this.props.updateMapSetting({bounds: getEntityBounds(stop), target: +stop.id})
    this.setState({patternStopCandidate: stop})
  }

  render () {
    const {
      addStopToPattern,
      activePattern,
      editSettings,
      mapState,
      patternStop,
      feedSource,
      patternEdited,
      controlPoints,
      patternSegments,
      updatePatternGeometry,
      removeStopFromPattern,
      saveActiveGtfsEntity,
      setActiveEntity,
      setActiveStop,
      status,
      stops,
      updateActiveGtfsEntity,
      updatePatternStops
    } = this.props
    const {addStops} = editSettings.present
    const {patternStopCandidate} = this.state
    const patternHasStops = activePattern.patternStops &&
      activePattern.patternStops.length > 0
    return (
      <div>
        <NormalizeStopTimesModal
          activePattern={activePattern}
          normalizeStopTimes={this.props.normalizeStopTimes}
          onClose={this._onCloseModal}
          show={this.state.showNormalizeStopTimesModal}
          stops={stops}
        />
        <h4 className='line'>
          Stops
          {' '}
          ({activePattern.patternStops ? activePattern.patternStops.length : 0})
        </h4>
        <div style={{width: '100%'}}>
          <Button
            onClick={this._clickNormalizeStopTimes}
            style={{marginBottom: '5px'}}
            className='pull-right'
            block
            bsSize='small'>
            <Icon type='clock-o' />{' '}
            Normalize stop times
          </Button>
          <Button
            onClick={this._toggleAddStopsMode}
            className='pull-right'
            bsSize='small'>
            {addStops
              ? <span><Icon type='times' /> Cancel</span>
              : <span><Icon type='plus' /> Add stop</span>
            }
          </Button>
          <small className='pull-right' style={{margin: '5px'}}>
            {addStops && mapState.zoom && mapState.zoom <= 14
              ? 'Zoom to view stops'
              : `Add stops via map`
            }
          </small>
        </div>
        {/* List of pattern stops */}
        <div id='pattern-stop-list-header'>
          <div className='pull-left' style={{width: '50%'}}>
            <p className='small' style={{marginBottom: '0px'}}>
              <strong>Stop sequence</strong>
            </p>
          </div>
          <div className='pull-right' style={{width: '50%'}}>
            <p style={{marginBottom: '0px'}} className='small text-right'>
              <strong>Travel time</strong>
            </p>
          </div>
          <div className='clearfix' />
        </div>
        {patternHasStops
          ? <PatternStopContainer
            stops={stops}
            activePattern={activePattern}
            patternStop={patternStop}
            controlPoints={controlPoints}
            patternSegments={patternSegments}
            updatePatternStops={updatePatternStops}
            updatePatternGeometry={updatePatternGeometry}
            status={status}
            updateActiveGtfsEntity={updateActiveGtfsEntity}
            saveActiveGtfsEntity={saveActiveGtfsEntity}
            addStopToPattern={addStopToPattern}
            removeStopFromPattern={removeStopFromPattern}
            setActiveEntity={setActiveEntity}
            feedSource={feedSource}
            patternEdited={patternEdited}
            setActiveStop={setActiveStop} />
          : <small className='text-warning'>
            <Icon type='exclamation-triangle' />{' '}
            This pattern has no stops.
          </small>
        }
        {/* Add stop selector */}
        <div style={{marginTop: '10px'}}>
          {addStops
            ? <div className='pattern-stop-card'>
              <VirtualizedEntitySelect
                component={'stop'}
                entities={stops}
                onChange={this._selectStop} />
              {patternStopCandidate
                ? <div style={{
                  textAlign: 'center',
                  marginTop: '5px'
                }}>
                  <p>{getEntityName(patternStopCandidate)}</p>
                  <AddPatternStopDropdown
                    activePattern={activePattern}
                    block
                    addStopToPattern={addStopToPattern}
                    label='Add stop to end'
                    stop={patternStopCandidate}
                    style={{marginBotton: '10px'}}
                  />
                </div>
                : null
              }
              <div style={{marginTop: '5px'}}>
                <Button
                  bsSize='small'
                  bsStyle='default'
                  block
                  onClick={this._toggleAddStopsMode}>
                  <Icon type='times' /> Cancel
                </Button>
              </div>
            </div>
            : <Button
              block
              bsSize='small'
              data-test-id='add-stop-by-name-button'
              onClick={this._toggleAddStopsMode}
            >
              <Icon type='plus' /> Add stop by name
            </Button>
          }
        </div>
      </div>
    )
  }
}
