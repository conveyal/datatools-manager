// @flow

import React, { Component, PureComponent } from 'react'
import {
  Alert,
  Button,
  Col,
  ListGroup,
  ListGroupItem,
  Pagination,
  Row
} from 'react-bootstrap'
import Select from 'react-select'

import Loading from '../../../../common/components/Loading'
import ActiveDateTimeFilter from '../containers/ActiveDateTimeFilter'
import * as routesActions from '../../../../gtfs/actions/routes'
import * as patternsActions from '../../../../gtfs/actions/patterns'
import TripsPerHourChart from './TripsPerHourChart'

import type {Props as ContainerProps} from '../containers/Routes'
import type {RouteRowData} from '../../../selectors'
import type {FetchStatus} from '../../../../types'
import type {AllRoutesSubState, RouteListItem} from '../../../../types/reducers'

type Props = ContainerProps & {
  allRoutes: AllRoutesSubState,
  fetchRouteDetails: typeof routesActions.fetchRouteDetails,
  fetchRoutes: typeof routesActions.fetchRoutes,
  fetchStatus: FetchStatus,
  namespace: string,
  numRoutes: number,
  patternRouteFilterChange: typeof patternsActions.patternRouteFilterChange,
  routeData: Array<RouteRowData>,
  routeOffset: number,
  routeOffsetChange: typeof routesActions.routeOffsetChange
}

const PAGE_SIZE = 10

export default class RouteLayout extends Component<Props> {
  componentWillMount () {
    const {fetchRouteDetails, fetchRoutes, fetchStatus, version} = this.props
    const {namespace} = version
    if (!fetchStatus.fetched) {
      fetchRoutes(namespace)
      fetchRouteDetails(namespace)
    }
  }

  _onDateTimeFilterChange = () => {
    const {fetchRouteDetails, version} = this.props
    fetchRouteDetails(version.namespace)
  }

  _onPaginationSelect = (value: number) => {
    const {routeOffsetChange, version} = this.props
    routeOffsetChange({
      namespace: version.namespace,
      offset: (value - 1) * PAGE_SIZE
    })
  }

  _onSelectRoute = (route: RouteListItem & {index: number}) => {
    const {routeOffsetChange, version} = this.props
    routeOffsetChange({
      namespace: version.namespace,
      offset: route.index
    })
  }

  render () {
    const {
      allRoutes,
      fetchStatus: {
        error,
        fetching,
        fetched
      },
      namespace,
      numRoutes,
      patternRouteFilterChange,
      routeData,
      routeOffset,
      selectTab,
      version
    } = this.props

    const maxTripsPerHourAllRoutes = fetched ? routeData.reduce(
      (accumulator, currentRoute) => {
        return Math.max(accumulator, ...currentRoute.tripsPerHour)
      },
      0
    ) : 0
    // If route offset is out of sync with page size, add an extra page (e.g.,
    // if offset = 5, make active page 2, so that previous page is clickable in
    // order to see items 1 - 4).
    const extraPage = +(routeOffset % PAGE_SIZE > 0)
    const activePage = Math.floor(routeOffset / PAGE_SIZE) + 1 + extraPage

    return (
      <div>
        {allRoutes !== null && allRoutes.data !== null && <Row>
          <Col xs={12} md={6}>
            <label htmlFor='route_name'>Route:</label>
            <Select
              id='route_name'
              options={allRoutes.data.map((r, index) => ({...r, index}))}
              labelKey={'route_name'}
              valueKey={'route_id'}
              placeholder={'Jump to a Route'}
              // value={routeFilter}
              onChange={this._onSelectRoute} />
          </Col>
        </Row>}
        <ActiveDateTimeFilter
          hideDateTimeField
          onChange={this._onDateTimeFilterChange}
          version={version} />

        {fetching &&
          <Loading />
        }

        {error &&
          <Alert bsStyle='danger'>
            An error occurred while trying to fetch the data
          </Alert>
        }

        {fetched &&
          <Row style={{marginTop: 20}}>
            <Col xs={12}>
              <ListGroup className='route-list'>
                {routeData.map((route, index) => (
                  <RouteRow
                    key={index}
                    {...route}
                    index={index}
                    maxTripsPerHourAllRoutes={maxTripsPerHourAllRoutes}
                    namespace={namespace}
                    patternRouteFilterChange={patternRouteFilterChange}
                    selectTab={selectTab} />
                ))}
              </ListGroup>
              <Pagination
                activePage={activePage}
                bsSize='large'
                ellipsis
                first
                items={Math.ceil(numRoutes / PAGE_SIZE)}
                last
                next
                onSelect={this._onPaginationSelect}
                prev />
            </Col>
          </Row>
        }
      </div>
    )
  }
}

class RouteRow extends PureComponent {
  props: RouteRowData & {
    index: number,
    maxTripsPerHourAllRoutes: number,
    namespace: string,
    patternRouteFilterChange: typeof patternsActions.patternRouteFilterChange,
    selectTab: string => void
  }

  _changePatternRouteFilter (tabToSelect: string) {
    const {namespace, patternRouteFilterChange, selectTab} = this.props
    patternRouteFilterChange(namespace, this.props.routeId)
    selectTab(tabToSelect)
  }

  _onStopsClick = () => {
    this._changePatternRouteFilter('stops')
  }

  _onTripsClick = () => {
    this._changePatternRouteFilter('timetables')
  }

  _onPatternsClick = () => {
    this._changePatternRouteFilter('patterns')
  }

  render () {
    const {
      index,
      maxTripsPerHourAllRoutes,
      numPatterns,
      numStops,
      numTrips,
      routeName,
      tripsPerHour
    } = this.props

    const rowStyle = index % 2 === 0 ? {} : {backgroundColor: '#f7f7f7'}

    return (
      <ListGroupItem style={rowStyle}>
        <Row>
          <Col xs={12}>
            <Button
              bsStyle='link'
              style={{padding: 0, marginBottom: '10px', color: 'black'}}
              onClick={this._onPatternsClick}><h5>{routeName}</h5></Button>
          </Col>
          <Col xs={12} md={6}>
            <TripsPerHourChart
              maxTripsPerHour={maxTripsPerHourAllRoutes}
              tripsPerHour={tripsPerHour} />
          </Col>
          <Col xs={12} md={2} style={{textAlign: 'center'}}>
            <Button onClick={this._onStopsClick}>
              <h5>{numStops} Stops</h5>
            </Button>
          </Col>
          <Col xs={12} md={2} style={{textAlign: 'center'}}>
            <Button onClick={this._onTripsClick}>
              <h5>{numTrips} Trips</h5>
            </Button>
          </Col>
          <Col xs={12} md={2} style={{textAlign: 'center'}}>
            <Button onClick={this._onPatternsClick}>
              <h5>{numPatterns} Patterns</h5>
            </Button>
          </Col>
        </Row>
      </ListGroupItem>
    )
  }
}
