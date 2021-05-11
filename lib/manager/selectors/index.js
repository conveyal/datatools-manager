// @flow
import Icon from '../../common/components/icon'
import React from 'react'
import {createSelector} from 'reselect'

import {getConfigProperty} from '../../common/util/config'
import {humanizeSeconds, secondsAfterMidnightToHHMM} from '../../common/util/gtfs'
import {STOP_NAME_SPLIT_REGEX, getEntityName} from '../../editor/util/gtfs'

import type {Project} from '../../types'
import type {
  AppState,
  RouteDetail,
  TimetableStop,
  ValidationStop,
  ValidationTrip
} from '../../types/reducers'

type Column = {
  children: any,
  colSpan?: string,
  dataField?: string,
  isKey?: boolean,
  row: string,
  rowSpan?: string,
  stopId?: string,
  width: string
}

export type RouteRowData = {
  numPatterns: number,
  numStops: number,
  numTrips: number,
  routeId: string,
  routeName: string,
  tripsPerHour: Array<number>
}

export type PatternRowData = {
  numStops: number,
  numTrips: number,
  patternId: string,
  patternName: string,
  tripsPerHour: Array<number>
}

export const getActiveProjectId = (state: AppState) => state.projects.active
  ? state.projects.active.id
  : getConfigProperty('application.active_project')
export const getProjects = (state: AppState) => state.projects.all

export const getActiveProject: AppState => ?Project = createSelector(
  [getActiveProjectId, getProjects],
  (activeProjectId, projects) => {
    return projects.find(p => p.id === activeProjectId) || projects[0]
  }
)

export const getFilteredStops: AppState => Array<ValidationStop> = createSelector(
  [ state => state.gtfs.patterns, state => state.gtfs.filter.patternFilter ],
  (patterns, patternFilter) => {
    const stopsInFilteredPattern = {}
    if (patternFilter) {
      patterns.data.patterns.forEach(pattern => {
        if (pattern.pattern_id === patternFilter) {
          pattern.stops.forEach(stop => {
            stopsInFilteredPattern[stop.stop_id] = true
          })
        }
      })
    }
    return patterns.data.stops.filter(
      stop => !patternFilter || stopsInFilteredPattern[stop.stop_id]
    )
  }
)

export const getPatternData: AppState => Array<PatternRowData> = createSelector(
  [state => state.gtfs.patterns.data.patterns],
  patterns => {
    return patterns.map(pattern => {
      return {
        numStops: pattern.stops.length,
        numTrips: pattern.trips.length,
        patternId: pattern.pattern_id,
        patternName: pattern.name,
        tripsPerHour: calculateTripsPerHour(pattern.trips)
      }
    })
  }
)

// $FlowFixMe There is some flow error related to createSelector and callable signature here.
export const getRouteData: AppState => Array<RouteRowData> = createSelector(
  [state => state.gtfs.routes.routeDetails.data],
  data => {
    if (!data) return []
    return data.routes.map(route => {
      return {
        numPatterns: countPatterns(route),
        numStops: route.stops.length,
        numTrips: route.trips.length,
        routeId: route.route_id,
        // cast to make flow happy
        routeName: getEntityName((route: any)),
        tripsPerHour: calculateTripsPerHour(route.trips)
      }
    })
  }
)

/**
 * Count patterns for a route (based on trips contained therein).
 */
function countPatterns (route: RouteDetail): number {
  const patternLookup = {}
  route.trips.forEach(trip => { patternLookup[trip.pattern_id] = true })
  return Object.keys(patternLookup).length
}

/**
 * Calculate trips per hour for an array of trips.
 */
function calculateTripsPerHour (trips: Array<ValidationTrip>): Array<number> {
  // Create array for 28 hours, which accounts for midnight to 4am the next day
  // in order to show trips per hour for trips that start after the service day
  // ends.
  const tripsPerHour = Array(28).fill(0)
  trips.forEach(trip => {
    const startTimes = []
    if (trip.frequencies.length > 0) {
      // Compile start times if the trip is frequency based.
      trip.frequencies.forEach(frequency => {
        let startTime = frequency.start_time
        // Add start times for all trips in frequency period.
        while (startTime < frequency.end_time) {
          startTimes.push(startTime)
          startTime += frequency.headway_secs
        }
      })
    } else {
      // Otherwise, just use the single start time based on first stop time.
      startTimes.push(trip.stop_times[0].arrival_time)
    }
    startTimes.forEach(startTime => {
      tripsPerHour[Math.floor(startTime / 3600)]++
    })
  })
  return tripsPerHour
}

const CELL_FORMAT = {
  FASTER: {
    // green: for travel times that are less than average (i.e., quicker)
    color: '102',
    text: 'faster than usual',
    icon: <Icon type='caret-down' />
  },
  SLOWER: {
    // red: for travel times that are longer than average (i.e., slower)
    color: '0',
    text: 'slower than usual',
    icon: <Icon type='caret-up' />
  },
  EQUAL: {
    // blue: blue should never actually appear because the light should be zero
    // in this case (black)
    color: '200',
    text: 'usual',
    icon: null
  }
}

/**
 * Create a list of columns and rows to render a bootstrap table
 * This function is dependent on the data in the gtfs.timetables reducers and
 * also gtfs.filter
 * if the showArrivals filter is set to true, we need to create an extra header row that
 * will display the arrival and departure columns beneath each stop
 * if the titimepointFilter is set to true, we only show stops that have at
 * least one stop time that has a non-blank value
 */
export const getTimetableData: AppState => {
  columns: Array<Column>,
  rows: Array<any>
} = createSelector(
  [
    (state: AppState) => state.gtfs.timetables,
    (state: AppState) => state.gtfs.filter.showArrivals,
    (state: AppState) => state.gtfs.filter.timepointFilter
  ],
  (timetables, showArrivals, timepointFilter) => {
    if (!timetables.data || !timetables.data.feed) return {columns: [], rows: []}

    // assume 1st pattern is the only one we're interested in
    const pattern = timetables.data.feed.patterns[0]

    // there could be no patterns found or no trips associate with that pattern
    // if eiter happens, return blank
    if (!pattern || pattern.trips.length === 0) return {columns: [], rows: []}

    // create stop lookup because the stops come back out-of-order
    const stopLookup: { [string]: TimetableStop } = {}
    pattern.stops.forEach(stop => {
      stopLookup[stop.stop_id] = stop
    })
    // create lookup for stop columns to check if at least one trip has times for
    // the stop.
    const columnHasStopTimeWithTime: { [string]: boolean } = {}

    // make rest of the row headers by making stop names as headers
    // assume that the first trip is representative of stops in timetable
    const firstTrip = pattern.trips[0]
    const STOP_COL_WIDTH = showArrivals ? 170 : 85
    // Store inter-stop travel times and headways in formatExtraData to use
    // with conditional formatting.
    const formatExtraData = []
    let previousStartTime
    // Add row data
    const rows = pattern.trips.map((trip, tripIndex) => {
      const row = {
        tripId: trip.trip_id,
        tripHeadsign: trip.trip_headsign,
        tripShortName: trip.trip_short_name
      }
      let previousIndexWithTimes = 0
      for (let index = 0; index < trip.stop_times.length; index++) {
        const stopTime = trip.stop_times[index]
        // Add empty array for tracking headway and travel time diffs.
        if (tripIndex === 0) formatExtraData.push([])
        const {arrival_time: arrivalTime, departure_time: departureTime} = stopTime
        if (
          isNumber(arrivalTime) ||
          isNumber(departureTime)
        ) {
          // Keep track of whether column has times (for any trip).
          columnHasStopTimeWithTime[`${index}`] = true
          if (index > 0) {
            // Record occurences of travel times for conditional formatting
            // TODO: Determine if this causes issues when departure_time is missing.
            const diff = +departureTime - row[`${previousIndexWithTimes}-departure`]
            const entry = formatExtraData[index].find(e => e.diff === diff)
            if (!entry) formatExtraData[index].push({diff, count: 1})
            else entry.count++
            previousIndexWithTimes = index
          }
        } else {
          // If missing times, add a blank entry for travel time.
          const entry = formatExtraData[index].find(e => e.diff === null)
          if (!entry) formatExtraData[index].push({diff: null, count: 1})
          else entry.count++
        }
        row[`${index}-arrival`] = arrivalTime
        row[`${index}-departure`] = departureTime
        // Store the dwell time to render in uncompressed view
        const dwellTime = +departureTime - +arrivalTime
        row[`${index}-dwell`] = dwellTime === 0
          ? '--'
          : `${Math.floor((dwellTime) / 60 * 100) / 100} min.`
      }

      return row
    })

    // Sort rows based off of the first non-blank stop time that each row shares
    rows
      .sort((a, b) => {
        for (let i = 0; i < firstTrip.stop_times.length; i++) {
          const arrivalKey = `${i}-arrival`
          if (isNumber(a[arrivalKey]) && isNumber(b[arrivalKey])) {
            return a[arrivalKey] - b[arrivalKey]
          }
          const departKey = `${i}-departure`
          if (isNumber(a[departKey]) && isNumber(b[departKey])) {
            return a[departKey] - b[departKey]
          }
        }
        return 0
      })
      // Record headways for conditional formatting
      .forEach(row => {
        // For first departure time, record times between trips.
        const diff = row[`${0}-departure`] - previousStartTime
        // console.log(stopTime, departureTime, previousStartTime)
        const entry = formatExtraData[0].find(e => e.diff === diff)
        if (!entry) formatExtraData[0].push({diff, count: 1})
        else entry.count++
        previousStartTime = row[`${0}-departure`]
      })
    // Add hidden column headers with trip info (TODO: show these in tooltip?).
    const columns: Array<Column> = [
      {
        dataField: 'tripId',
        isKey: true,
        children: 'Trip ID',
        rowSpan: showArrivals ? '2' : '1',
        row: '0',
        hidden: true,
        width: '150'
      },
      {
        dataField: 'tripHeadsign',
        children: 'Trip Headsign',
        hidden: true,
        rowSpan: showArrivals ? '2' : '1',
        row: '0',
        width: '150'
      },
      {
        dataField: 'tripShortName',
        children: 'Trip Short Name',
        hidden: true,
        rowSpan: showArrivals ? '2' : '1',
        row: '0',
        width: '150'
      }
    ]
    // Add columns for stop times. Each cell will get a conditional formatting
    // function that depends on the column index, so it must be constructed in
    // this iterator.
    firstTrip.stop_times.forEach((stopTime, i) => {
      const { stop_id: stopId } = stopTime
      const stop = stopLookup[stopId]
      if (!stop) console.warn(`Stop with stop_id=${stopId} not found in lookup`)
      const stopName = stop ? stop.stop_name : stopId
      const stopNameParts = stopName.split(STOP_NAME_SPLIT_REGEX)
      // NOTE: stopSpan surrounded by JSX to ensure that react-bootstrap-table
      // uses headerText prop in the title attribute (i.e., so that it shows the
      // full stop name intact).
      const stopSpan = stopNameParts.length === 3
        ? <span>{stopNameParts[0]}<br />{stopNameParts[2]}</span>
        : <span>{stopName}</span>
      // Data format provides conditional formatting to table cell text color.
      // Slower travel times render in red text, quicker in green.
      const dataFormat = (cell, row, extraData, rowIndex) => {
        // Find last column with valid departure time to get travel time.
        let lastStopTimeWithTimes = i - 1
        for (let j = lastStopTimeWithTimes; j >= 0; j--) {
          if (isNumber(row[`${j}-departure`])) {
            lastStopTimeWithTimes = j
            break
          }
        }
        const isFirstColumn = i === 0 && rowIndex > 0
        const diff = isFirstColumn
          // For cells in the first column, formatting depends on headway /
          // previous row.
          ? row[`${i}-departure`] - rows[rowIndex - 1][`${i}-departure`]
          // For other cells, formatting depends on travel time from last
          // stoptime with times.
          : row[`${i}-departure`] - row[`${lastStopTimeWithTimes}-departure`]
        // Sort data by count.
        const columnData = extraData[`${i}`].sort((a, b) => a.count - b.count)
        const frequencyIndex = columnData.findIndex(e => e.diff === diff)
        const mostFrequentTravelTime = columnData[columnData.length - 1].diff
        // Sort data by travel time.
        columnData.sort((a, b) => a.diff - b.diff)
        const mostFrequentIndex = columnData.findIndex(e => e.diff === mostFrequentTravelTime)
        const travelTimeIndex = columnData.findIndex(e => e.diff === diff)
        const count = travelTimeIndex !== -1 ? columnData[travelTimeIndex].count : rows.length
        // If the cell matches the most frequent travel time (or the occurrence
        // for travel times across the day is equal), make color black.
        // Otherwise, scale lightness by relative frequency.
        const occurrenceIsEqual = columnData.every(e => e.diff === columnData[0].diff)
        const lightPercent = occurrenceIsEqual || frequencyIndex === columnData.length - 1
          ? 0
          : ((rows.length - count) / rows.length) * 40
        const format = travelTimeIndex < mostFrequentIndex
          ? CELL_FORMAT.FASTER
          : travelTimeIndex > mostFrequentIndex
            ? CELL_FORMAT.SLOWER
            : CELL_FORMAT.EQUAL
        const textStyle = {color: `hsl(${format.color}, 100%, ${lightPercent.toString()}%)`}
        const diffFromUsual = humanizeSeconds(Math.abs(mostFrequentTravelTime - diff))
        return (
          <span
            title={travelTimeIndex !== mostFrequentIndex
              ? `${i === 0 ? 'Headway' : 'Travel time'} (${humanizeSeconds(diff)}) is ${diffFromUsual} ${format.text}.`
              : undefined
            }
            style={!isFirstColumn ? textStyle : undefined}>
            {secondsAfterMidnightToHHMM(cell)}
            {isFirstColumn && <span style={textStyle}>{format.icon}</span>}
          </span>
        )
      }
      // add header columns depending on whether arrivals need to be shown
      columns.push({
        colSpan: showArrivals ? '2' : '1',
        csvHeader: stopName,
        dataField: showArrivals ? undefined : `${i}-departure`,
        children: stopSpan,
        dataFormat,
        formatExtraData,
        headerText: stopName,
        hidden: timepointFilter ? !columnHasStopTimeWithTime[`${i}`] : undefined,
        row: '0',
        stopId,
        width: `${STOP_COL_WIDTH}`
      })
      if (showArrivals) {
        columns.push({
          csvHeader: `Arrive`,
          dataField: `${i}-arrival`,
          dataFormat,
          formatExtraData,
          hidden: timepointFilter ? !columnHasStopTimeWithTime[`${i}`] : undefined,
          children: 'Arrive',
          row: '1',
          stopId,
          width: `${STOP_COL_WIDTH / 2}`
        })
        columns.push({
          csvHeader: `Dwell`,
          dataField: `${i}-dwell`,
          children: 'Dwell',
          hidden: timepointFilter ? !columnHasStopTimeWithTime[`${i}`] : undefined,
          row: '1',
          stopId,
          width: `${STOP_COL_WIDTH / 2}`
        })
      }
    })

    return {columns, rows}
  }
)

function isNumber (n) {
  return typeof n === 'number'
}
