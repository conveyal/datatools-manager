// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Button, FormControl} from 'react-bootstrap'
import {Table, Column} from 'react-virtualized/dist/commonjs/Table'
import {AutoSizer} from 'react-virtualized/dist/commonjs/AutoSizer'

import * as activeActions from '../actions/active'
import * as editorActions from '../actions/editor'
import * as snapshotActions from '../actions/snapshots'
import {getConfigProperty} from '../../common/util/config'
import {componentToText, entityIsNew} from '../util/objects'
import EntityListButtons from './EntityListButtons'
import EntityListSecondaryActions from './EntityListSecondaryActions'

import type {Props as ContainerProps} from '../containers/ActiveEntityList'
import type {Entity, Feed} from '../../types'
import type {DataStateSort, EditorTables} from '../../types/reducers'
import type {ImmutableList} from '../selectors/index'

type Props = ContainerProps & {
  activeEntity: Entity,
  approveGtfsDisabled: boolean,
  cloneGtfsEntity: typeof editorActions.cloneGtfsEntity,
  createSnapshot: typeof snapshotActions.createSnapshot,
  deleteGtfsEntity: typeof activeActions.deleteGtfsEntity,
  enterTimetableEditor: typeof activeActions.enterTimetableEditor,
  entities: Array<Entity>,
  feedSource: Feed,
  hasRoutes: boolean,
  list: ImmutableList, // FIXME Immutable.List
  newGtfsEntity: typeof editorActions.newGtfsEntity,
  patchTable: typeof editorActions.patchTable,
  resetActiveGtfsEntity: typeof activeActions.resetActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  sort: DataStateSort,
  tableData: EditorTables,
  updateActiveGtfsEntity: typeof activeActions.updateActiveGtfsEntity,
  updateEntitySort: typeof editorActions.updateEntitySort
}

type State = {
  fromIndex?: ?number,
  toIndex?: ?number
}

export default class EntityList extends Component<Props, State> {
  state = {}

  componentWillReceiveProps (nextProps: Props) {
    if (nextProps.activeComponent !== this.props.activeComponent) {
      // Set the state's from and to indexes to undefined when the active table
      // (i.e., component) changes.
      this.setState({fromIndex: undefined, toIndex: undefined})
    }
  }

  _getRowStyle = ({index}: {index: number}) => {
    const {fromIndex, toIndex} = this.state
    const activeColor = '#F2F2F2'
    const rowStyle = {
      borderBottom: 'solid 1px #ddd',
      cursor: 'pointer',
      outline: 'none',
      backgroundColor: undefined
    }
    const isSelected = typeof fromIndex === 'number' &&
      typeof toIndex === 'number' &&
      index >= fromIndex &&
      index <= toIndex
    const row = this._getRow({index})
    if (row && (row.isActive || isSelected)) {
      // Set active color for selected rows
      rowStyle.backgroundColor = activeColor
    }
    return rowStyle
  }

  updateIndexes = (fromIndex: ?number, toIndex: ?number) =>
    this.setState({fromIndex, toIndex})

  _getRow = ({index}: {index: number}) => this.props.list.get(index)

  _onChangeSort = (evt: SyntheticInputEvent<HTMLInputElement>) =>
    this.props.updateEntitySort({key: evt.target.value})

  _onClickTimetableEditor = () => this.props.enterTimetableEditor()

  _onClickNew = () =>
    this.props.newGtfsEntity(this.props.feedSource.id, this.props.activeComponent)

  _onRowClick = ({event, index}: {event: SyntheticKeyboardEvent<HTMLInputElement>, index: number}) => {
    const {shiftKey} = event
    const {activeComponent, activeEntity, feedSource, list, setActiveEntity} = this.props
    let fromIndex, toIndex
    const row = this._getRow({index})
    // handle selection of multiple items (for multiple delete, merge, etc.)
    if (shiftKey && activeEntity && !row.isActive) {
      const selectedIndex = list.findIndex(e => e.id === activeEntity.id)
      fromIndex = selectedIndex > index ? index : selectedIndex
      toIndex = selectedIndex < index ? index : selectedIndex
      setActiveEntity(feedSource.id, activeComponent)
    } else if (row.isActive) {
      setActiveEntity(feedSource.id, activeComponent)
    } else {
      setActiveEntity(feedSource.id, activeComponent, row)
    }
    this.setState({fromIndex, toIndex})
  }

  render () {
    const {
      width,
      activeEntity,
      activeComponent,
      hasRoutes,
      feedSource,
      sort,
      list
    } = this.props
    const createDisabled = list.findIndex(entityIsNew) !== -1
    const sidePadding = '5px'
    const panelWidth = `${width}px`
    const panelStyle = {
      width: panelWidth,
      height: '100%',
      position: 'absolute',
      left: '0px',
      zIndex: 1,
      backgroundColor: 'white',
      paddingRight: '0px',
      paddingLeft: sidePadding
    }
    const HEADER_HEIGHT = 80
    const headerStyle = {
      paddingRight: sidePadding,
      marginBottom: '5px',
      height: `${HEADER_HEIGHT}px`,
      paddingTop: sidePadding
    }
    let activeIndex
    if (activeEntity) {
      activeIndex = list.findIndex(e => e.id === activeEntity.id)
    }
    const entityList = list.size
      ? <AutoSizer disableWidth>
        {({height}: {height: number}) => (
          <Table
            width={width - 5}
            // some magical number for the height that seems to work
            height={height - HEADER_HEIGHT - 45}
            key={`${feedSource.id}-${activeComponent}-table`}
            disableHeader
            headerHeight={20}
            rowHeight={25}
            style={{outline: 'none'}}
            className='EntityList'
            scrollToIndex={activeIndex}
            sortBy={sort.key}
            sortDirection={sort.direction}
            rowClassName='noselect'
            rowStyle={this._getRowStyle}
            rowCount={list.size}
            onRowClick={this._onRowClick}
            rowGetter={this._getRow}>
            <Column
              label='Name'
              dataKey='name'
              className='small entity-list-row'
              style={{outline: 'none'}}
              width={width - 5} />
            {/* Add hidden columns to allow for sorting of list */}
            {list.size && Object.keys(list.get(0)).map(key => {
              return (
                <Column
                  key={key}
                  label={key}
                  dataKey={key}
                  style={{display: 'none'}}
                  width={0} />
              )
            })}
          </Table>
        )}
      </AutoSizer>
      : activeComponent === 'stop'
        ? <div
          className='lead text-center'
          data-test-id='create-stop-instructions'
          style={{marginTop: '10px', marginRight: '5px', marginLeft: '5px'}}
        >
          <small>Right-click a location on map to create a new stop</small>
        </div>
        : <div style={{marginTop: '20px'}} className='text-center'>
          <Button
            bsSize='small'
            data-test-id={`create-first-${activeComponent}-button`}
            disabled={createDisabled}
            onClick={this._onClickNew}>
            <Icon type='plus' />{' '}
            Create first {componentToText(activeComponent)}
          </Button>
        </div>
    return (
      <div className='entity-list' style={panelStyle}>
        <div style={headerStyle}>
          {/* Entity list sort key select */}
          {getConfigProperty('application.dev') && <FormControl
            onChange={this._onChangeSort}
            value={sort.key}
            componentClass='select'>
            {list.size && Object.keys(list.get(0)).map(key => (
              <option value={key} key={key}>{key}</option>
            ))}
          </FormControl>}
          <EntityListButtons
            fromIndex={this.state.fromIndex}
            toIndex={this.state.toIndex}
            list={list}
            updateIndexes={this.updateIndexes}
            {...this.props} />
          {activeComponent === 'calendar' || activeComponent === 'scheduleexception'
            ? <Button
              style={{marginTop: '10px'}}
              block
              disabled={!hasRoutes}
              onClick={this._onClickTimetableEditor}>
              <Icon type='calendar' /> Edit schedules
            </Button>
            : null
          }
          {/* Table view button */}
        </div>
        <EntityListSecondaryActions {...this.props} />
        {entityList}
      </div>
    )
  }
}
