// @flow

import Icon from '../../../common/components/icon'
import React, {Component} from 'react'
import { Button, OverlayTrigger, Tooltip, ButtonGroup } from 'react-bootstrap'

import * as activeActions from '../../actions/active'
import * as stopStrategiesActions from '../../actions/map/stopStrategies'
import * as tripPatternActions from '../../actions/tripPattern'
import AddPatternStopDropdown from './AddPatternStopDropdown'

import type {Feed, GtfsStop, Pattern, PatternStop, Style} from '../../../types'

type Props = {
  activePattern: Pattern,
  addStopToPattern: typeof stopStrategiesActions.addStopToPattern,
  feedSource: Feed,
  index: number,
  patternEdited: boolean,
  patternStop: PatternStop,
  removeStopFromPattern: typeof stopStrategiesActions.removeStopFromPattern,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  setActiveStop: typeof tripPatternActions.setActiveStop,
  size: string,
  stop: GtfsStop,
  style?: Style,
  updatePatternStops: typeof tripPatternActions.updatePatternStops
}

export default class PatternStopButtons extends Component<Props> {
  static defaultProps = {
    size: 'small'
  }

  _onAddToEnd = () => {
    const {activePattern, addStopToPattern, stop} = this.props
    addStopToPattern(activePattern, stop)
  }

  _onClickEdit = () => {
    const {feedSource, setActiveEntity, stop} = this.props
    setActiveEntity(feedSource.id, 'stop', stop)
  }

  _onClickRemove = () => {
    const {activePattern, index, removeStopFromPattern, stop} = this.props
    if (
      window.confirm(
        `Are you sure you would like to remove ${stop.stop_name} (${stop.stop_id}) as pattern stop #${index + 1}?`
      )
    ) {
      removeStopFromPattern(activePattern, stop, index)
    }
  }

  _onClickSave = () => this.props.saveActiveGtfsEntity('trippattern')

  _onSelectStop = (key: number) => {
    const {activePattern, addStopToPattern, stop} = this.props
    addStopToPattern(activePattern, stop, key)
  }

  render () {
    const {
      activePattern,
      addStopToPattern,
      index,
      patternEdited,
      patternStop,
      size,
      stop,
      style
    } = this.props
    return (
      <ButtonGroup
        className='pull-right'
        style={{
          display: 'inline-block',
          ...style
        }}>
        <Button
          bsSize={size}
          bsStyle='primary'
          disabled={!patternEdited}
          onClick={this._onClickSave}>
          <Icon type='floppy-o' />
        </Button>
        <OverlayTrigger
          overlay={<Tooltip id='edit-stop-tooltip'>Edit stop</Tooltip>}
        >
          <Button
            bsSize={size}
            onClick={this._onClickEdit}>
            <Icon type='pencil' />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          overlay={
            <Tooltip id='remove-stop-tooltip'>Remove stop from pattern</Tooltip>
          }
        >
          <Button
            bsSize={size}
            bsStyle='danger'
            onClick={this._onClickRemove}>
            <Icon type='trash' />
          </Button>
        </OverlayTrigger>
        <AddPatternStopDropdown
          activePattern={activePattern}
          addStopToPattern={addStopToPattern}
          index={index}
          patternStop={patternStop}
          size={size}
          stop={stop}
        />
      </ButtonGroup>
    )
  }
}
