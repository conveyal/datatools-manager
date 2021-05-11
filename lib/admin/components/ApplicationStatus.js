// @flow

import Icon from '../../common/components/icon'
import moment from 'moment'
import React, {Component} from 'react'
import {connect} from 'react-redux'
import {Button} from 'react-bootstrap'
import BootstrapTable from 'react-bootstrap-table-next'

import * as adminActions from '../actions/admin'
import {formatTimestamp} from '../../common/util/date-time'

import type {ServerJob} from '../../types'
import type {AppState} from '../../types/reducers'

const TIME_FORMAT = 'h:mm:ss a'

type Props = {
  fetchApplicationStatus: typeof adminActions.fetchApplicationStatus,
  jobs: Array<ServerJob>,
  requests: Array<any>
}

/**
 * Component that shows the currently active server jobs running for the
 * application, the latest HTTP requests made for each user, and a link to Auth0
 * logs.
 */
class ApplicationStatusView extends Component<Props, {refreshTime: ?Date}> {
  state = {
    refreshTime: null
  }

  componentWillMount () {
    this._refreshJobs()
  }

  _formatUser = (val: ?string) => {
    return val || '(unauthenticated)'
  }

  _refreshJobs = () => {
    this.setState({refreshTime: new Date()})
    this.props.fetchApplicationStatus()
  }

  render () {
    const {jobs, requests} = this.props
    const defaultTableOptions = {
      hover: true,
      pagination: true,
      options: {
        noDataText: undefined,
        paginationShowsTotal: true,
        sizePerPageList: [10, 20, 50, 100]
      },
      striped: true
    }
    const jobTableOptions = {...defaultTableOptions}
    jobTableOptions.options.noDataText = 'No active jobs in progress.'
    const jobColumns = [
      {children: 'ID', dataField: 'jobId', isKey: true, hidden: true},
      {children: 'Name', dataField: 'name'},
      {children: 'User', dataField: 'email', width: '120px'},
      {children: 'Status', dataField: 'message'},
      {children: '%', dataField: 'percentComplete', width: '60px'}
    ]
    const requestColumns = [
      {children: 'ID', dataField: 'id', isKey: true, hidden: true},
      {children: 'Path', dataField: 'path'},
      {children: 'User', dataField: 'user', width: '180px', dataFormat: this._formatUser},
      {children: 'Time', dataField: 'time', width: '140px', dataFormat: formatTimestamp}
    ]
    return (
      <div>
        <h3>
          Active Server Jobs
          <Button
            className='pull-right'
            onClick={this._refreshJobs}>
            <Icon type='refresh' /> Refresh
          </Button>
          <br />
          <small>last updated at {moment(this.state.refreshTime).format(TIME_FORMAT)}</small>
        </h3>
        <BootstrapTable
          {...jobTableOptions}
          headerStyle={{
            fontSize: 'small',
            textWrap: 'normal',
            wordWrap: 'break-word',
            whiteSpace: 'no-wrap'
          }}
          bodyStyle={{fontSize: 'small'}}
          columns={jobColumns}
          data={jobs.map(j => ({...j.status, ...j}))} />
        <h3>
          Last API requests by User
          <br />
          <small>last updated at {moment(this.state.refreshTime).format(TIME_FORMAT)}</small>
        </h3>
        <BootstrapTable
          {...defaultTableOptions}
          headerStyle={{fontSize: 'small', textWrap: 'normal', wordWrap: 'break-word', whiteSpace: 'no-wrap'}}
          bodyStyle={{fontSize: 'small'}}
          data={requests}>
          {requestColumns.map((col, index) => {
            return <TableHeaderColumn {...col} key={index} />
          })}
        </BootstrapTable>
        <h3>User Authentication Logs</h3>
        <Button
          bsStyle='danger'
          bsSize='large'
          block
          href='https://manage.auth0.com/#/logs'>
          <Icon type='star' /> View user logs on Auth0.com
        </Button>
      </div>
    )
  }
}

const mapStateToProps = (state: AppState, ownProps: {}) => {
  return {
    jobs: state.status.applicationJobs,
    requests: state.status.applicationRequests
  }
}

const { fetchApplicationStatus } = adminActions

const mapDispatchToProps = {
  fetchApplicationStatus
}

const ApplicationStatus = connect(
  mapStateToProps,
  mapDispatchToProps
)(ApplicationStatusView)

export default ApplicationStatus
