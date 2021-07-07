// @flow

import clone from 'lodash/cloneDeep'
import moment from 'moment'
import validator from 'validator'

import {getTableById} from './gtfs'

import type {Entity, GtfsSpecField, ScheduleException} from '../../types'
import type {EditorTables} from '../../types/reducers'

export type EditorValidationIssue = {
  field: string,
  invalid: boolean,
  reason: string
}

export function doesNotExist (value: any): boolean {
  return value === '' || value === null || typeof value === 'undefined'
}

/**
 * Validate if a value is ok.
 *
 * Returns false if the value is ok.
 * Returns an EditorValidationIssue object if the value is not ok.
 */
export function validate (
  field: GtfsSpecField,
  value: any,
  entities: ?Array<Entity>,
  entity: ?Entity,
  tableData: EditorTables
): EditorValidationIssue | false {
  const {inputType, required, name} = field
  const valueDoesNotExist = doesNotExist(value)
  const isRequiredButEmpty = required && valueDoesNotExist
  const isOptionalAndEmpty = !required && valueDoesNotExist
  const agencies = getTableById(tableData, 'agency')
  let locationType: ?number = null

  // entity.locationtype is a string.  Convert to number for conditinals later on.
  if (entity && entity.location_type !== null) {
    locationType = parseInt(entity.location_type, 10)
  }

  // setting as a variable here because of eslint bug
  type CheckPositiveOutput = {
    num?: number,
    result: false | EditorValidationIssue
  }

  /**
   * Construct an EditorValidationIssue for the field name and reason (defaults to
   * empty field message).
   */
  function validationIssue (reason: string, field = name) {
    return {field, invalid: true, reason}
  }

  /**
   * Construct an EditorValidationIssue for this field, used if it is required
   * and has an empty value.
   */
  function emptyFieldValidationIssue (field = name) {
    return validationIssue('Required field must not be empty', field)
  }

  /**
   * Checks whether value is a positive number
   */
  function checkPositiveNumber (): CheckPositiveOutput {
    if (isRequiredButEmpty) {
      return {
        result: emptyFieldValidationIssue()
      }
    } else if (isOptionalAndEmpty) {
      return {
        result: false
      }
    }
    const num = parseFloat(value)

    // make sure value is parseable to a number
    if (isNaN(num)) {
      return {
        result: validationIssue('Field must be a valid number')
      }
    }

    // make sure value is positive
    if (num < 0) {
      return {
        result: validationIssue('Field must be a positive number')
      }
    }

    return {
      num,
      result: false
    }
  }

  switch (inputType) {
    case 'GTFS_ID':
      // Indices contains list of all indexes of occurrences of the ID value.
      const indices = []
      const idList = entities ? entities.map(e => {
        // $FlowFixMe too many unions for flow to handle
        return name in e ? e[name] : null
      }) : []
      let idx = idList.indexOf(value)
      while (idx !== -1) {
        indices.push(idx)
        idx = idList.indexOf(value, idx + 1)
      }
      const isNotUnique = !!(
        entities &&
        entity &&
        value &&
        (indices.length > 1 ||
          (indices.length > 0 && entities[indices[0]].id !== entity.id))
      )
      if (
        name === 'agency_id' &&
        idList.length > 1 &&
        valueDoesNotExist
      ) {
        return validationIssue('Identifier is required if more than one agency exists')
      }
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else if (isNotUnique) {
        return validationIssue('Identifier must be unique')
      } else {
        return false
      }
    case 'TEXT':
      if (name === 'stop_name' && locationType !== null && (typeof locationType === 'number' && locationType <= 2)) {
        return validationIssue('Stop name is required for stop, station, and entrance location types.')
      }
      if (name === 'route_short_name' && !value && entity && entity.route_long_name) {
        return false
      } else if (
        name === 'route_long_name' &&
        !value &&
        entity &&
        entity.route_short_name
      ) {
        return false
      } else {
        if (isRequiredButEmpty) {
          return emptyFieldValidationIssue()
        } else {
          return false
        }
      }
    case 'GTFS_TRIP':
    case 'GTFS_SHAPE':
    case 'GTFS_BLOCK':
    case 'GTFS_FARE':
    case 'GTFS_SERVICE':
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else {
        return false
      }
    case 'URL':
      const isNotUrl = value && !validator.isURL(value)
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else if (isNotUrl) {
        return validationIssue('Field must contain valid URL.')
      } else {
        return false
      }
    case 'EMAIL':
      const isNotEmail = value && !validator.isEmail(value)
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else if (isNotEmail) {
        return validationIssue('Field must contain valid email address.')
      } else {
        return false
      }
    case 'GTFS_ZONE':
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else {
        return false
      }
    case 'TIMEZONE':
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else {
        return false
      }
    case 'LANGUAGE':
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else {
        return false
      }
    case 'LATITUDE':
      const isNotLat = value > 90 || value < -90
      if (isNotLat) {
        return validationIssue('Field must be valid latitude.')
      }
      if (isOptionalAndEmpty && locationType !== null && (typeof locationType === 'number' && locationType <= 2)) {
        return validationIssue('Latitude and Longitude are required for your current location type')
      }
      return false
    case 'LONGITUDE':
      const isNotLng = value > 180 || value < -180
      if (isNotLng) {
        return validationIssue('Field must be valid longitude.')
      }
      if (isOptionalAndEmpty && typeof locationType === 'number' && locationType <= 2) {
        return validationIssue('Latitude and Longitude are required for your current location type')
      }
      return false
    case 'TIME':
    case 'NUMBER':
      const isNotANumber = isNaN(value)
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      } else if (isNotANumber) {
        return validationIssue('Field must be valid number')
      } else {
        return false
      }
    case 'DAY_OF_WEEK_BOOLEAN':
      let hasService = false
      const DAYS_OF_WEEK: Array<string> = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ]
      for (var i = 0; i < DAYS_OF_WEEK.length; i++) {
        if (entity && entity[DAYS_OF_WEEK[i]]) {
          hasService = true
        }
      }
      if (!hasService && name === 'monday') {
        // only add validation issue for one day of week (monday)
        return validationIssue('Calendar must have service for at least one day')
      }
      return false
    case 'DROPDOWN':
      if (
        isRequiredButEmpty &&
        field.options &&
        field.options.findIndex(o => o.value === '') === -1
      ) {
        return emptyFieldValidationIssue()
      } else {
        return false
      }
    case 'GTFS_AGENCY':
      if (
        name === 'agency_id' &&
        agencies.length > 1
      ) {
        if (valueDoesNotExist) {
          return validationIssue('Field must be populated for feeds with more than one agency.')
        }
      }
      return false
    case 'EXCEPTION_DATE': // a date cannot be selected more than once (for all exceptions)
      const dateMap = {}
      // Clone exceptions to avoid mutating table in store.
      const scheduleExceptions: Array<ScheduleException> = clone(getTableById(tableData, 'scheduleexception'))
      if (entity) {
        const entityId = entity.id
        const exceptionIndex = scheduleExceptions.findIndex(se => se.id === entityId)
        if (exceptionIndex !== -1) {
          scheduleExceptions.splice(exceptionIndex, 1)
        }
        const castedScheduleException: ScheduleException = ((entity: any): ScheduleException)
        scheduleExceptions.push(castedScheduleException)
      }

      for (let i = 0; i < scheduleExceptions.length; i++) {
        if (scheduleExceptions[i].dates) {
          scheduleExceptions[i].dates.map(d => {
            if (typeof dateMap[d] === 'undefined') {
              dateMap[d] = []
            }
            dateMap[d].push(scheduleExceptions[i].id)
          })
        }
      }
      if (!value || value.length === 0) {
        return emptyFieldValidationIssue('dates')
      }
      // check if date already exists in this or other exceptions
      for (let i = 0; i < value.length; i++) {
        const dateItemName = `dates-${i}`
        if (dateMap[value[i]] && dateMap[value[i]].length > 1) {
          // eslint-disable-next-line standard/computed-property-even-spacing
          const reason = `Date (${value[
            i
          ]}) cannot appear more than once for all exceptions`
          return validationIssue(reason, dateItemName)
        } else if (!moment(value[i], 'YYYYMMDD', true).isValid()) {
          return emptyFieldValidationIssue(dateItemName)
        }
      }
      return false
    case 'POSITIVE_INT':
      const positiveNumberCheck = checkPositiveNumber()
      if (positiveNumberCheck.result !== false) return positiveNumberCheck.result
      if (isOptionalAndEmpty) return false

      // check for floating value or decimal point
      if (
        typeof positiveNumberCheck.num === 'number' &&
        (
          positiveNumberCheck.num % 1 > 0 ||
          (
            value.indexOf &&
            value.indexOf('.') > -1
          )
        )
      ) {
        return validationIssue('Field must be a positive integer')
      }
      return false
    case 'POSITIVE_NUM':
      return checkPositiveNumber().result
    case 'GTFS_ROUTE':
    case 'GTFS_STOP':
    case 'DATE':
    case 'COLOR':
    default:
      if (isRequiredButEmpty) {
        return emptyFieldValidationIssue()
      }
      return false
  }
}
