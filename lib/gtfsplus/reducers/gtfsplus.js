// @flow

import update from 'immutability-helper'

import {constructNewGtfsPlusRow} from '../util'

import type {Action} from '../../types/actions'
import type {GtfsPlusReducerState} from '../../types/reducers'

export const defaultState = {
  activeTableId: 'realtime_routes',
  currentPage: 1,
  feedVersionId: null,
  gtfsEntityLookup: {},
  pageCount: 0,
  recordsPerPage: 25,
  tableData: null,
  timestamp: null,
  validation: null,
  visibility: 'all'
}

/* eslint-disable complexity */
const gtfsplus = (
  state: GtfsPlusReducerState = defaultState,
  action: Action
): GtfsPlusReducerState => {
  switch (action.type) {
    case 'SET_ACTIVE_FEEDVERSION':
      return defaultState
    case 'CLEAR_GTFSPLUS_CONTENT':
      return defaultState
    case 'SET_CURRENT_GTFSPLUS_PAGE':
      return update(state, {
        currentPage: {$set: action.payload.newPage}
      })
    case 'SET_ACTIVE_GTFSPLUS_TABLE':
      const tableRows = (state.tableData && state.tableData[action.payload.activeTableId]) || []
      return update(state, {
        activeTableId: {$set: action.payload.activeTableId},
        currentPage: {$set: 1},
        pageCount: {$set: Math.ceil(tableRows.length / state.recordsPerPage)}
      })
    case 'SET_GTFSPLUS_VISIBILITY':
      return update(state, {
        visibility: {$set: action.payload.visibility},
        currentPage: {$set: 1}
      })
    case 'RECEIVE_GTFSPLUS_CONTENT':
      const {feedVersionId, fileContent, filenames, timestamp} = action.payload
      const newTableData = {}
      for (let i = 0; i < filenames.length; i++) {
        const filename = filenames[i]
        // split file into lines
        const lines = fileContent[i].split(/\r\n|\r|\n/g)
        if (lines.length < 2) {
          console.warn(`${filename} file contains fewer than two lines. Data may be parsed incorrectly.`, fileContent[i])
          continue
        }
        const fields = lines[0].split(',')
        const COLUMN_REGEX = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
        const tableName = filename.split('.')[0]
        newTableData[tableName] = lines.slice(1)
        // Do not include blank lines (e.g., at the end of the file).
          .filter(line => line)
          .map((line, rowIndex) => {
            const values = line.split(COLUMN_REGEX)
            // add origRowIndex for referencing validation issues and rowIndex
            // for use with adding/deleting rows
            const rowData = { origRowIndex: rowIndex, rowIndex }
            for (let f = 0; f < fields.length; f++) {
              rowData[fields[f]] = values[f]
            }
            return rowData
          })
      }
      return update(state, {
        feedVersionId: {$set: feedVersionId},
        timestamp: {$set: timestamp},
        tableData: {$set: newTableData},
        pageCount: {$set: Math.ceil(newTableData.length / state.recordsPerPage)}
      })
    case 'ADD_GTFSPLUS_ROW':
      const newRow = constructNewGtfsPlusRow(action.payload.tableId)
      const tableExists = state.tableData && action.payload.tableId in state.tableData
      // add rowIndex for use with tracking row for deletion/updating values
      newRow.rowIndex = state.tableData && tableExists
        ? state.tableData[state.activeTableId].length
        : 0
      // create this table if it doesn't already exist
      if (!tableExists) {
        return update(state,
          {tableData:
            {$merge: {[action.payload.tableId]: [newRow]}}
          }
        )
      }
      // $FlowFixMe - tableData will be set at this point
      const pageCountPostAdd = Math.ceil((state.tableData[state.activeTableId].length + 1) / state.recordsPerPage)
      // Anytime a user adds a new row, the expected behavior would be to see that row,
      // so we set the current page to page count if it is less than the new count
      const currentPagePostAdd = pageCountPostAdd > state.currentPage
        ? pageCountPostAdd
        : state.currentPage
      // otherwise, add it to the exising table
      return update(state, {
        tableData: {
          [action.payload.tableId]: {
            $push: [newRow]
          }
        },
        pageCount: {$set: pageCountPostAdd},
        currentPage: {$set: currentPagePostAdd}
      })
    case 'UPDATE_GTFSPLUS_FIELD':
      return update(state, {
        tableData: {
          [action.payload.tableId]: {
            [action.payload.rowIndex]: {
              [action.payload.fieldName]: {
                $set: action.payload.newValue
              }
            }
          }
        }
      })
    case 'DELETE_GTFSPLUS_ROW':
      const {rowIndex, tableId} = action.payload
      if (!state.tableData) {
        console.warn('no tableData, cannot delete gtfs plus row')
        return state
      }
      const deleteTable = state.tableData[tableId]
      // update rowIndex for rows after deleted row (to account for index offset)
      const recordsAfterDeletedRow = deleteTable.slice(rowIndex + 1)
      recordsAfterDeletedRow.map(r => {
        r.rowIndex = r.rowIndex - 1
      })
      const newTable = [
        ...deleteTable.slice(0, rowIndex),
        ...recordsAfterDeletedRow
      ]
      const pageCountPostDelete = Math.ceil(newTable.length / state.recordsPerPage)
      const currentPagePostDelete = state.currentPage > pageCountPostDelete
        ? pageCountPostDelete
        : state.currentPage
      return update(state, {
        tableData: {
          [tableId]: {
            $set: newTable
          }
        },
        pageCount: {$set: pageCountPostDelete},
        currentPage: {$set: currentPagePostDelete}
      })
    case 'RECEIVE_GTFS_PLUS_ENTITIES':
      const newLookupEntries = {}
      if (!action.payload.feed) {
        console.warn('No feed property found in GTFS entity response payload.')
        return state
      }
      if (action.payload.feed.stops) {
        for (const entity of action.payload.feed.stops) {
          const key = `stop_${entity.stop_id}`
          newLookupEntries[key] = entity
        }
      }
      if (action.payload.feed.routes) {
        for (const entity of action.payload.feed.routes) {
          const key = `route_${entity.route_id}`
          newLookupEntries[key] = entity
        }
      }
      return update(state, { gtfsEntityLookup: { $merge: newLookupEntries } })
    case 'RECEIVE_GTFSPLUS_VALIDATION':
      return update(state, { validation: { $set: action.payload } })

    default:
      return state
  }
}

export default gtfsplus
