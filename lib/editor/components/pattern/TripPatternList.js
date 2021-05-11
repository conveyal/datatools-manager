// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import { Collapse, Table } from 'react-bootstrap'

import * as activeActions from '../../actions/active'
import * as editorActions from '../../actions/editor'
import * as mapActions from '../../actions/map'
import * as stopStrategiesActions from '../../actions/map/stopStrategies'
import * as tripPatternActions from '../../actions/tripPattern'
import Loading from '../../../common/components/Loading'
import * as statusActions from '../../../manager/actions/status'
import TripPatternViewer from './TripPatternViewer'
import TripPatternListControls from './TripPatternListControls'

import type {Props as ContainerProps} from '../../containers/ActiveTripPatternList'
import type {
  ControlPoint,
  Coordinates,
  GtfsStop,
  Pattern,
  GtfsRoute,
  Feed
} from '../../../types'
import type {
  EditorStatus,
  EditSettingsUndoState,
  MapState
} from '../../../types/reducers'

export type Props = ContainerProps & {
  activeEntity: GtfsRoute,
  activePattern: Pattern,
  activePatternId: number,
  activePatternTripCount: number,
  addStopToPattern: typeof stopStrategiesActions.addStopToPattern,
  cloneGtfsEntity: typeof editorActions.cloneGtfsEntity,
  controlPoints: Array<ControlPoint>,
  deleteAllTripsForPattern: typeof tripPatternActions.deleteAllTripsForPattern,
  deleteGtfsEntity: typeof activeActions.deleteGtfsEntity,
  editSettings: EditSettingsUndoState,
  feedSource: Feed,
  mapState: MapState,
  newGtfsEntity: typeof editorActions.newGtfsEntity,
  normalizeStopTimes: typeof tripPatternActions.normalizeStopTimes,
  patternEdited: boolean,
  patternSegment: number,
  patternSegments: Array<Coordinates>,
  patternStop: {id: ?any, index: ?number},
  removeStopFromPattern: typeof stopStrategiesActions.removeStopFromPattern,
  resetActiveGtfsEntity: typeof activeActions.resetActiveGtfsEntity,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  setActivePatternSegment: typeof tripPatternActions.setActivePatternSegment,
  setActiveStop: typeof tripPatternActions.setActiveStop,
  setErrorMessage: typeof statusActions.setErrorMessage,
  status: EditorStatus,
  stops: Array<GtfsStop>,
  togglePatternEditing: typeof tripPatternActions.togglePatternEditing,
  undoActiveTripPatternEdits: typeof tripPatternActions.undoActiveTripPatternEdits,
  updateActiveGtfsEntity: typeof activeActions.updateActiveGtfsEntity,
  updateEditSetting: typeof activeActions.updateEditSetting,
  updateMapSetting: typeof mapActions.updateMapSetting,
  updatePatternGeometry: typeof mapActions.updatePatternGeometry,
  updatePatternStops: typeof tripPatternActions.updatePatternStops
}

export default class TripPatternList extends Component<Props> {
  render () {
    const { activeEntity, activePatternId } = this.props
    if (!activeEntity.tripPatterns) {
      return <Loading />
    }
    const sidePadding = '5px'
    const panelWidth = '300px'
    const panelStyle = {
      width: panelWidth,
      height: '85%',
      position: 'absolute',
      left: '0px',
      // overflowY: 'scroll',
      zIndex: 99,
      paddingRight: '0px',
      paddingLeft: sidePadding
    }
    return (
      <div style={panelStyle}>
        <TripPatternListControls {...this.props} />
        <div className='trip-pattern-list'>
          <Table hover>
            <tbody>
              {activeEntity.tripPatterns
                ? activeEntity.tripPatterns.map((pattern) => (
                  <PatternRow
                    pattern={pattern}
                    key={pattern.id}
                    active={!!(activePatternId && pattern.id === activePatternId)}
                    route={activeEntity}
                    {...this.props} />
                ))
                : <tr><td><Icon className='fa-spin' type='refresh' /></td></tr>
              }
            </tbody>
          </Table>
        </div>
      </div>
    )
  }
}

type RowProps = {
  active: boolean,
  pattern: Pattern,
  route: GtfsRoute
} & Props

class PatternRow extends Component<RowProps> {
  _onKeyDown = (e: SyntheticKeyboardEvent<HTMLInputElement>) => {
    if (document.activeElement === e.target && e.which === 13) {
      this._selectRow()
    }
  }

  _selectRow = () => {
    const {active, feedSource, pattern, route, setActiveEntity} = this.props
    if (active) {
      setActiveEntity(
        feedSource.id,
        'route',
        route,
        'trippattern'
      )
    } else {
      setActiveEntity(
        feedSource.id,
        'route',
        route,
        'trippattern',
        pattern
      )
    }
  }

  render () {
    const {active, pattern} = this.props
    const rowStyle = {
      paddingTop: 5,
      paddingBottom: 5
    }
    const activeColor = '#fff'
    const activeRowStyle = {
      backgroundColor: activeColor,
      paddingTop: 5,
      paddingBottom: 5
    }
    let patternName = '[Unnamed]'
    if (pattern.name) {
      patternName = `${`${pattern.name.length > 29
        ? pattern.name.substr(0, 29) + '...'
        : pattern.name}`} ${pattern.patternStops
        ? `(${pattern.patternStops.length} stops)`
        : ''}`
    }
    return (
      <tr style={rowStyle}>
        <td style={active ? activeRowStyle : rowStyle}>
          <div
            className='small'
            data-test-id={`pattern-title-${pattern.name}`}
            onClick={this._selectRow}
            onKeyDown={this._onKeyDown}
            role='button'
            tabIndex={0}
            title={pattern.name}
          >
            <Icon type={active ? 'caret-down' : 'caret-right'} />
            {' '}{patternName}
          </div>
          <Collapse
            in={active}
            style={{borderRight: '1px solid #ddd'}}>
            {active && pattern
              ? <TripPatternViewer {...this.props} />
              : <div />
            }
          </Collapse>
        </td>
      </tr>
    )
  }
}
