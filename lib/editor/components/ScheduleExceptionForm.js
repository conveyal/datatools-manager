// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {
  Button,
  Form,
  FormControl,
  FormGroup,
  ControlLabel
} from 'react-bootstrap'
import Select from 'react-select'

import {updateActiveGtfsEntity} from '../actions/active'
import toSentenceCase from '../../common/util/to-sentence-case'
import ExceptionDate from './ExceptionDate'
import {EXCEPTION_EXEMPLARS} from '../util'
import {getTableById} from '../util/gtfs'

import type {ServiceCalendar, ScheduleException} from '../../types'
import type {EditorTables} from '../../types/reducers'
import type {EditorValidationIssue} from '../util/validation'

type Props = {
  activeComponent: string,
  activeEntity: ScheduleException,
  tableData: EditorTables,
  updateActiveGtfsEntity: typeof updateActiveGtfsEntity,
  validationErrors: Array<EditorValidationIssue>
}

type SelectOption = {
  value: ServiceCalendar
}

export default class ScheduleExceptionForm extends Component<Props> {
  _onAddDate = () => {
    const {activeComponent, activeEntity, updateActiveGtfsEntity} = this.props
    const dates = [...activeEntity.dates]
    dates.push(0)
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {dates}
    })
  }

  _filterByList = (calendars: Array<ServiceCalendar>, list: ?Array<string>) => calendars
    .filter(cal => !list || list.indexOf(cal.service_id) === -1)

  _mapInput = (input: ?Array<SelectOption>): ?Array<ServiceCalendar> =>
    input && input.length ? input.map(i => i.value) : null

  _onCalendarChange = (input: ?Array<SelectOption>, id: string) => {
    const {activeComponent, activeEntity, updateActiveGtfsEntity} = this.props
    const value = this._mapInput(input)
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {[id]: value}
    })
  }

  _onExemplarChange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const {activeComponent, activeEntity, updateActiveGtfsEntity} = this.props
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {
        exemplar: +evt.target.value,
        custom_schedule: null,
        removed_service: null,
        added_service: null
      }
    })
  }

  _onNameChange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const {activeComponent, activeEntity, updateActiveGtfsEntity} = this.props
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {name: evt.target.value}
    })
  }

  _checkValidation = (id: string) => this.props.validationErrors
    .find(e => e.field === id)
    ? 'error'
    : undefined

  render () {
    const {activeEntity, tableData} = this.props
    if (!activeEntity) return null
    const calendars = (getTableById(tableData, 'calendar'): Array<ServiceCalendar>)
    const {
      exemplar,
      name,
      custom_schedule: customSchedule,
      added_service: addedService,
      removed_service: removedService,
      dates
    } = activeEntity
    const hasExemplar = typeof exemplar === 'number'
    return (
      <div>
        <Form>
          <FormGroup
            className={`col-xs-12`}
            controlId={`name`}
            data-test-id='exception-name-input-container'
            validationState={this._checkValidation('name')}
          >
            <ControlLabel>
              <small>Exception name*</small>
            </ControlLabel>
            <FormControl
              value={name}
              placeholder='Thanksgiving Day'
              onChange={this._onNameChange} />
          </FormGroup>
          <FormGroup
            className={`col-xs-12`}
            controlId={`schedule`}
            data-test-id='exception-type-input-container'
            validationState={this._checkValidation('exemplar')}
          >
            <ControlLabel>
              <small>Run the following schedule:</small>
            </ControlLabel>
            <FormControl
              componentClass='select'
              value={hasExemplar ? exemplar : ''}
              onChange={this._onExemplarChange}>
              <option value='' disabled>
                -- Select exception type --
              </option>
              {Object.keys(EXCEPTION_EXEMPLARS)
                .map(exemplar => {
                  const value = EXCEPTION_EXEMPLARS[exemplar]
                  return (
                    <option
                      value={value}
                      key={value}>
                      {value === EXCEPTION_EXEMPLARS.SWAP
                        ? 'Swap, add, or remove'
                        : toSentenceCase(exemplar)}
                    </option>
                  )
                })
              }
            </FormControl>
          </FormGroup>
          {exemplar === EXCEPTION_EXEMPLARS.CUSTOM
            ? <ExceptionCalendarSelector
              label={'Select calendar to run*'}
              id={`custom_schedule`}
              value={customSchedule}
              onChange={this._onCalendarChange}
              calendars={calendars} />
            : null
          }
          {exemplar === EXCEPTION_EXEMPLARS.SWAP
            ? (
              <div>
                <ExceptionCalendarSelector
                  label={'Select calendars to add (optional):'}
                  id={`added_service`}
                  value={addedService}
                  onChange={this._onCalendarChange}
                  calendars={this._filterByList(calendars, removedService)} />
                <ExceptionCalendarSelector
                  label={'Select calendars to remove (optional):'}
                  id={`removed_service`}
                  value={removedService}
                  onChange={this._onCalendarChange}
                  calendars={this._filterByList(calendars, addedService)} />
              </div>
            )
            : null
          }
          <FormGroup
            className={`col-xs-12`}
            controlId={`exception-dates`}
            data-test-id='exception-dates-container'
            validationState={this._checkValidation('dates')}
          >
            <ControlLabel>
              <small>On these dates*</small>
            </ControlLabel>
            {dates && dates.length
              ? dates.map((date, index) => (
                <ExceptionDate
                  index={index}
                  key={index}
                  date={date}
                  // Exception dates expects a boolean
                  isNotValid={Boolean(this._checkValidation(`dates-${index}`))}
                  {...this.props}
                />
              ))
              : <div>No dates specified</div>
            }
          </FormGroup>
          <div className={`col-xs-12`}>
            <Button
              data-test-id='exception-add-date-button'
              onClick={this._onAddDate}
            >
              <Icon type='plus' /> Add date
            </Button>
          </div>
        </Form>
      </div>
    )
  }
}

type SelectorProps = {
  calendars: Array<ServiceCalendar>,
  id: string,
  label: string,
  onChange: (any, string) => void,
  value: ?Array<any>
}

class ExceptionCalendarSelector extends Component<SelectorProps> {
  _onChange = (input: ?Array<SelectOption>) => {
    const {id, onChange} = this.props
    onChange && onChange(input, id)
  }

  _calendarToOption = calendar => ({
    value: calendar.service_id,
    label: this._getCalendarName(calendar),
    calendar
  })

  _getCalendarName = calendar => {
    let name = '[unnamed]'
    if (calendar) {
      name = calendar.description ? calendar.description : ''
      name += calendar.id ? ` (${calendar.id})` : ''
    }
    return name
  }

  render () {
    const {id, label, calendars, value} = this.props
    return (
      <FormGroup controlId={id} className={`col-xs-12`}>
        <ControlLabel><small>{label}</small></ControlLabel>
        <Select
          placeholder='Select calendar...'
          clearable
          multi
          value={value}
          onChange={this._onChange}
          options={calendars.map(this._calendarToOption)} />
      </FormGroup>
    )
  }
}
