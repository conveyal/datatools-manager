// @flow

import Icon from '../../../../common/components/icon'
import React, { Component } from 'react'
import { Alert, Col, ControlLabel, FormControl, Row } from 'react-bootstrap'
import moment from 'moment'
import DateTimeField from 'react-datetime'

import * as filterActions from '../../../../gtfs/actions/filter'

import type {Props as ContainerProps} from '../containers/ActiveDateTimeFilter'
import type {DateTimeFilter as DateTimeFilterState} from '../../../../types/reducers'

type Props = ContainerProps & {
  dateTime: DateTimeFilterState,
  updateDateTimeFilter: typeof filterActions.updateDateTimeFilter
}

const timeOptions = [
  {
    label: 'All day (12am - 4am next day)',
    from: 0,
    to: 60 * 60 * 28
  },
  {
    label: 'Morning peak (6am - 9am)',
    from: 60 * 60 * 6,
    to: 60 * 60 * 9
  },
  {
    label: 'Midday peak (11am - 2pm)',
    from: 60 * 60 * 11,
    to: 60 * 60 * 14
  },
  {
    label: 'Afternoon peak (4pm - 7pm)',
    from: 60 * 60 * 16,
    to: 60 * 60 * 19
  },
  {
    label: 'Evening service (7pm - 10pm)',
    from: 60 * 60 * 19,
    to: 60 * 60 * 22
  },
  {
    label: '24 hours (12am - 11:59pm)',
    from: 0,
    to: (60 * 60 * 24) - 1 // 86399
  }
]

export default class DateTimeFilter extends Component<Props> {
  _onChangeDateTime = (millis: number) => {
    const date = moment(+millis).format('YYYYMMDD')
    this.props.updateDateTimeFilter({date})
    this.props.onChange && this.props.onChange({date})
  }

  _onChangeTimeRange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const fromTo = evt.target.value.split('-')
    const from = +fromTo[0]
    const to = +fromTo[1]
    this.props.updateDateTimeFilter({from, to})
    this.props.onChange && this.props.onChange({from, to})
  }

  render () {
    const {dateTime, hideDateTimeField, version} = this.props
    const dateTimeProps = {
      dateTime: dateTime.date ? +moment(dateTime.date, 'YYYY-MM-DD') : +moment(),
      defaultText: !dateTime.date ? 'Please select a date' : undefined,
      mode: 'date',
      onChange: this._onChangeDateTime
    }
    const validDate =
      version &&
      moment(dateTime.date).isBetween(
        version.validationSummary.startDate,
        version.validationSummary.endDate,
        // Set units undefined
        undefined,
        // [] indicates that check is inclusive of dates
        '[]'
      )
    return (
      <div>
        <Row>
          <Col xs={12} md={4} style={{paddingTop: '10px'}}>
            <ControlLabel>Date:</ControlLabel>
            <DateTimeField
              {...dateTimeProps} />
          </Col>
          {!hideDateTimeField &&
            <Col xs={12} md={4} style={{paddingTop: '10px'}}>
              <ControlLabel>Time span:</ControlLabel>
              <FormControl
                componentClass='select'
                placeholder='Select time range'
                value={`${dateTime.from}-${dateTime.to}`}
                onChange={this._onChangeTimeRange}>
                {timeOptions.map((t, i) => {
                  return <option key={i} value={`${t.from}-${t.to}`}>{t.label}</option>
                })}
              </FormControl>
            </Col>
          }
        </Row>
        {!validDate
          ? <Row>
            <Col xs={12} style={{paddingTop: '10px'}}>
              <Alert bsStyle='danger'>
                <Icon type='exclamation-triangle' />
                <span><strong>Warning!</strong> Chosen date is outside of valid date range for feed version.</span>
              </Alert>
            </Col>
          </Row>
          : null
        }
      </div>
    )
  }
}
