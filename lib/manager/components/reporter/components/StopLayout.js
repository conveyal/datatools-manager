// @flow

import React, { Component } from 'react'
import { Row, Col, Alert } from 'react-bootstrap'
import Select from 'react-select'
import BootstrapTable from 'react-bootstrap-table-next'

import Loading from '../../../../common/components/Loading'
import ActiveDateTimeFilter from '../containers/ActiveDateTimeFilter'
import * as filterActions from '../../../../gtfs/actions/filter'
import * as routesActions from '../../../../gtfs/actions/routes'
import * as patternsActions from '../../../../gtfs/actions/patterns'

import type {Props as ContainerProps} from '../containers/Stops'
import type {
  AllRoutesSubState,
  RouteListItem,
  ValidationPattern,
  ValidationStop
} from '../../../../types/reducers'

type Props = ContainerProps & {
  fetchRoutes: typeof routesActions.fetchRoutes,
  patternDateTimeFilterChange: typeof patternsActions.patternDateTimeFilterChange,
  patternFilter: ?string,
  patternRouteFilterChange: typeof patternsActions.patternRouteFilterChange,
  patterns: Array<ValidationPattern>,
  routeFilter: ?string,
  routes: AllRoutesSubState,
  stops: Array<ValidationStop>,
  updatePatternFilter: typeof filterActions.updatePatternFilter
}

export default class StopLayout extends Component<Props> {
  componentWillMount () {
    const {fetchRoutes, routes, version} = this.props
    if (!routes.fetchStatus.fetched) {
      fetchRoutes(version.namespace)
    }
  }

  _onDateTimeFilterChange = () => {
    const {fetchRoutes, version} = this.props
    fetchRoutes(version.namespace)
  }

  _onPatternFilterChange = (pattern: ?ValidationPattern) => {
    this.props.updatePatternFilter(pattern && pattern.pattern_id)
  }

  _onRouteFilterChange = (route: ?RouteListItem) => {
    const {patternRouteFilterChange, version} = this.props
    patternRouteFilterChange(version.namespace, route && route.route_id)
  }

  render () {
    const {
      patternFilter,
      patterns,
      routeFilter,
      routes,
      stops,
      tableOptions,
      version
    } = this.props
    const columns = []
    // <TableHeaderColumn dataSort dataField='stop_id' isKey width='100px'>ID</TableHeaderColumn>
    // <TableHeaderColumn dataSort dataField='stop_name' width='50%'>Name</TableHeaderColumn>
    // <TableHeaderColumn dataSort dataField='stop_code'>Stop Code</TableHeaderColumn>
    // <TableHeaderColumn dataSort dataField='zone_id'>Zone ID</TableHeaderColumn>
    return (
      <div>
        <Row style={{ marginBottom: '20px' }}>
          <Col xs={12} md={6}>
            <label htmlFor='route_name'>Route:</label>
            <Select
              options={routes.data}
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
                options={patterns}
                labelKey={'name'}
                valueKey={'pattern_id'}
                placeholder={'Select a Pattern'}
                value={patternFilter}
                onChange={this._onPatternFilterChange} />
            </Col>
          }
        </Row>
        <ActiveDateTimeFilter
          hideDateTimeField
          onChange={this._onDateTimeFilterChange}
          version={version}
        />
        {routes.fetchStatus.fetching &&
          <Loading />
        }
        {routes.fetchStatus.error &&
          <Alert bsStyle='danger'>
            An error occurred while trying to fetch the data
          </Alert>
        }
        {routes.fetchStatus.fetched &&
          <Row style={{marginTop: 20}}>
            <Col xs={12}>
              <BootstrapTable
                // FIXME!!!
                columns={columns}
                data={stops}
                {...tableOptions} />
            </Col>
          </Row>
        }
      </div>
    )
  }
}
