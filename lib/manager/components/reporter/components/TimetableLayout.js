// @flow

import Icon from '../../../../common/components/icon'
import React, { Component } from 'react'
import { Alert, Checkbox, Col, Row } from 'react-bootstrap'
import Select from 'react-select'
import BootstrapTable from 'react-bootstrap-table-next'

import Loading from '../../../../common/components/Loading'
import ActiveDateTimeFilter from '../containers/ActiveDateTimeFilter'
import * as routesActions from '../../../../gtfs/actions/routes'
import * as timetablesActions from '../../../../gtfs/actions/timetables'

import type {Props as ContainerProps} from '../containers/Timetables'
import type {
  AllRoutesSubState,
  PatternsState,
  RouteListItem,
  TimetablesState,
  ValidationPattern
} from '../../../../types/reducers'

type Props = ContainerProps & {
  fetchRoutes: typeof routesActions.fetchRoutes,
  fetchTimetablesWithFilters: typeof timetablesActions.fetchTimetablesWithFilters,
  filter: {
    patternFilter: ?string,
    routeFilter: ?string,
    showArrivals: boolean,
    timepointFilter: boolean
  },
  patterns: PatternsState,
  routes: AllRoutesSubState,
  timetableDateTimeFilterChange: typeof timetablesActions.timetableDateTimeFilterChange,
  timetablePatternFilterChange: typeof timetablesActions.timetablePatternFilterChange,
  timetableRouteFilterChange: typeof timetablesActions.timetableRouteFilterChange,
  timetableShowArrivalToggle: typeof timetablesActions.timetableShowArrivalToggle,
  timetableTableData: {
    columns: Array<any>,
    rows: Array<any>
  },
  timetableTimepointToggle: typeof timetablesActions.timetableTimepointToggle,
  timetables: TimetablesState
}

export default class TimetableLayout extends Component<Props> {
  componentWillMount () {
    const {
      fetchRoutes,
      fetchTimetablesWithFilters,
      patterns,
      routes,
      timetables,
      version
    } = this.props
    const {namespace} = version
    if (!routes.fetchStatus.fetched) {
      fetchRoutes(namespace)
    } else if (
      routes.fetchStatus.fetched &&
      patterns.fetchStatus.fetched &&
      !timetables.fetchStatus.fetched
    ) {
      fetchTimetablesWithFilters(namespace)
    }
  }

  _onPatternFilterChange = (pattern: ?ValidationPattern) => {
    const {timetablePatternFilterChange, version} = this.props
    timetablePatternFilterChange(version.namespace, pattern && pattern.pattern_id)
  }

  _onRouteFilterChange = (route: ?RouteListItem) => {
    const {timetableRouteFilterChange, version} = this.props
    timetableRouteFilterChange(version.namespace, route && route.route_id)
  }

  _onShowArrivalsToggle = () => {
    const {timetableShowArrivalToggle, version} = this.props
    timetableShowArrivalToggle(version.namespace)
  }

  _onTimetableDateTimeFilterChange = () => {
    const {timetableDateTimeFilterChange, version} = this.props
    timetableDateTimeFilterChange(version.namespace)
  }

  _onTimepointFilterToggle = () => {
    const {timetableTimepointToggle, version} = this.props
    timetableTimepointToggle(version.namespace)
  }

  render () {
    const {
      filter,
      patterns,
      routes,
      tableOptions,
      timetableTableData,
      timetables,
      version
    } = this.props
    const {
      patternFilter,
      routeFilter,
      showArrivals,
      timepointFilter
    } = filter

    const allFiltersSelected = routeFilter && patternFilter
    return (
      <div>
        <Row style={{ marginBottom: '20px' }}>
          <Col xs={12} md={6}>
            <label htmlFor='route_name'>Route:</label>
            <Select
              options={routes.data || []}
              labelKey={'route_name'}
              valueKey={'route_id'}
              placeholder={'Select a Route'}
              value={routeFilter}
              onChange={this._onRouteFilterChange} />
          </Col>
          {routeFilter &&
            <Col xs={12} md={6}>
              <label htmlFor='pattern'>Pattern:</label>
              <Select
                options={patterns.data.patterns}
                labelKey={'name'}
                valueKey={'pattern_id'}
                placeholder={'Select a Pattern'}
                value={patternFilter}
                onChange={this._onPatternFilterChange} />
            </Col>
          }
        </Row>
        <ActiveDateTimeFilter
          onChange={this._onTimetableDateTimeFilterChange}
          version={version} />
        <Row style={{ margin: '20px 0' }}>
          <Col xs={12} md={6}>
            <Checkbox
              checked={timepointFilter}
              onChange={this._onTimepointFilterToggle}>
              Only show stops with times
            </Checkbox>
          </Col>
          <Col xs={12} md={6}>
            <Checkbox
              checked={!showArrivals}
              onChange={this._onShowArrivalsToggle}>
              Compressed view (hide dwell times)
            </Checkbox>
          </Col>
          <ul style={{fontSize: 'x-small', marginLeft: '15px'}} className='list-unstyled'>
            <li><span style={{minWidth: '40px', color: 'green'}}>HH:MM:SS</span> Travel time to stop <strong>faster</strong> than usual</li>
            <li><span style={{minWidth: '40px', color: 'red'}}>HH:MM:SS</span> Travel time to stop <strong>slower</strong> than usual</li>
            <li><span style={{color: 'red'}}><Icon type='caret-up' /></span> Headway (time since previous vehicle) <strong>increased</strong> over usual</li>
            <li><span style={{color: 'green'}}><Icon type='caret-down' /></span> Headway (time since previous vehicle) <strong>decreased</strong> over usual</li>
          </ul>
        </Row>
        {timetables.fetchStatus.fetching &&
          <Loading />
        }
        {timetables.fetchStatus.error &&
          <Alert bsStyle='danger'>
            An error occurred while trying to fetch the data
          </Alert>
        }
        {!allFiltersSelected &&
          <Alert>
            Select a route and a pattern
          </Alert>
        }
        {allFiltersSelected && timetables.fetchStatus.fetched && timetableTableData.rows.length > 0 &&
          <BootstrapTable
            {...tableOptions}
            headerStyle={{fontSize: 'small', textWrap: 'normal', wordWrap: 'break-word', whiteSpace: 'no-wrap'}}
            bodyStyle={{fontSize: 'small'}}
            columns={timetableTableData.columns}
            data={timetableTableData.rows} />
        }
        {allFiltersSelected && timetables.fetchStatus.fetched && timetableTableData.rows.length === 0 &&
          <Alert bsStyle='warning'>
            No trips were found for the selected route, pattern, date, from time and to time.
          </Alert>
        }
      </div>
    )
  }
}
