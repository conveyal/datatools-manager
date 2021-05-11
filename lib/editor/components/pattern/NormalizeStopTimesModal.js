// @flow

import Icon from '../../../common/components/icon'
import React, { Component } from 'react'
import { Alert, Button, ControlLabel, FormControl, Modal } from 'react-bootstrap'

import * as tripPatternActions from '../../actions/tripPattern'
import type { GtfsStop, Pattern } from '../../../types'

type Props = {
  activePattern: Pattern,
  normalizeStopTimes: typeof tripPatternActions.normalizeStopTimes,
  onClose: any,
  show: boolean,
  stops: Array<GtfsStop>
}

type State = { patternStopIndex: number, show: boolean }

export default class NormalizeStopTimesModal extends Component<Props, State> {
  state = {
    patternStopIndex: 0, // default to zeroth pattern stop
    show: false
  }

  _onClickNormalize = () => {
    const { activePattern, normalizeStopTimes } = this.props
    normalizeStopTimes(activePattern.id, this.state.patternStopIndex)
  }

  _onChangeStop = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({patternStopIndex: +evt.target.value})
  }

  _onClose = () => {
    this.setState({ show: false })
    this.props.onClose()
  }

  render () {
    const { Body, Footer, Header, Title } = Modal
    const { activePattern, stops } = this.props
    return (
      <Modal show={this.props.show || this.state.show} onHide={this._onClose}>
        <Header>
          <Title>Normalize stop times?</Title>
        </Header>
        <Body>
          <p>
            Normalizing stop times will overwrite the arrival and departure
            times for <strong>all trips</strong> on this pattern to conform
            to the default travel and dwell times defined for the pattern stops.
          </p>
          <ControlLabel>Select beginning pattern stop:</ControlLabel>
          <FormControl
            value={this.state.patternStopIndex}
            componentClass='select'
            onChange={this._onChangeStop}>
            {activePattern.patternStops.map((patternStop, index) => {
              const stop = stops.find(s => s.stop_id === patternStop.stopId)
              if (!stop) return null
              return (
                <option
                  value={index}
                  key={index}>
                  {index + 1} - {stop.stop_name}
                </option>
              )
            }
            )}
          </FormControl>
          <br />
          <Alert bsStyle='warning'>
            {this.state.patternStopIndex === 0
              // TODO: figure out how yml messages with html tags can be rendered
              // correctly.
              ? <span>
                Stop times for <strong>all pattern stops</strong> will be
                normalized.
              </span>
              : <span>
                Stop times for <strong>stop {this.state.patternStopIndex + 1}{' '}
                through final stop</strong> will be normalized (any stop times
                prior will be unmodified).
              </span>
            }
          </Alert>
          <Alert bsStyle='info'>
            <h5><Icon type='info-circle' /> Usage notes</h5>
            <small>
              This feature is useful when the travel times for one or more
              pattern stops change. Take for example a pattern
              that has been re-routed along to travel a longer distance, has had a
              stop added (or removed), or has had a layover introduced mid-trip.
              Once you have adjusted the travel times to account for these changes,
              you can normalize the stop times to bring them into alignment with the
              updated travel times reflected in the pattern stops.
              <hr />
              <strong>Note:</strong> this does not account for any variation
              in travel time between stops for trips throughout the day (e.g.,
              due to slower travel speeds during the AM peak). It overwrites ALL
              stop times for trips on this pattern with the pattern stop values.
            </small>
          </Alert>
        </Body>
        <Footer>
          <Button
            bsStyle='primary'
            onClick={this._onClickNormalize}
          >
            Normalize stop times
          </Button>
          <Button
            onClick={this._onClose}>
            Close
          </Button>
        </Footer>
      </Modal>
    )
  }
}
