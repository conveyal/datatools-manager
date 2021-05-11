// @flow

import moment from 'moment'
import React, {Component} from 'react'
import {
  Alert,
  Button,
  ButtonToolbar,
  Col,
  Glyphicon,
  Panel,
  Row,
  Table
} from 'react-bootstrap'
import {browserHistory, Link} from 'react-router'

import * as gtfsPlusActions from '../actions/gtfsplus'

import {getGtfsPlusSpec} from '../../common/util/config'
import type {Props as ContainerProps} from '../containers/ActiveGtfsPlusVersionSummary'
import type {GtfsPlusValidationIssue} from '../../types'
import type {GtfsPlusReducerState, ManagerUserState} from '../../types/reducers'

type Props = ContainerProps & {
  deleteGtfsPlusFeed: typeof gtfsPlusActions.deleteGtfsPlusFeed,
  downloadGtfsPlusFeed: typeof gtfsPlusActions.downloadGtfsPlusFeed,
  gtfsplus: GtfsPlusReducerState,
  issuesForTable: any,
  publishGtfsPlusFeed: typeof gtfsPlusActions.publishGtfsPlusFeed,
  user: ManagerUserState
}

type State = {
  expanded: boolean
}

export default class GtfsPlusVersionSummary extends Component<Props, State> {
  state = { expanded: false }

  componentDidMount () {
    this.props.downloadGtfsPlusFeed(this.props.version.id)
  }

  isTableIncluded (tableId: string) {
    const {tableData} = this.props.gtfsplus
    if (!tableData) return null
    return tableId in tableData ? 'Yes' : 'No'
  }

  tableRecordCount (tableId: string): ?string {
    const {tableData} = this.props.gtfsplus
    if (!tableData) return null
    if (!(tableId in tableData)) return 'N/A'
    return tableData[tableId].length.toLocaleString()
  }

  validationIssueCount (tableId: string): ?string {
    const {issuesForTable} = this.props
    if (!issuesForTable) return null
    if (!(tableId in issuesForTable)) return 'None'
    return issuesForTable[tableId].length.toLocaleString()
  }

  _getTableLevelIssues = (tableId: string): ?Array<GtfsPlusValidationIssue> => {
    const {issuesForTable} = this.props
    if (!issuesForTable) return null
    if (!(tableId in issuesForTable)) return null
    // Table level issues are identified by not having -1 for row index.
    const tableLevelIssues = issuesForTable[tableId].filter(issue => issue.rowIndex === -1)
    return tableLevelIssues.length > 0 ? tableLevelIssues : null
  }

  feedStatus () {
    const {timestamp} = this.props.gtfsplus
    if (!timestamp) return null
    if (!this._gtfsPlusIsEdited()) return <i>GTFS+ data for this feed version has not been edited.</i>
    const timestampMoment = moment(timestamp)
    const formatted = timestampMoment.format('MMM. DD, YYYY, h:MMa')
    const fromNow = timestampMoment.fromNow()
    return <b>GTFS+ data updated <span title={formatted}>{fromNow}.</span></b>
  }

  _gtfsPlusIsEdited = () => (this.props.gtfsplus.timestamp !== this.props.version.fileTimestamp)

  _onClickEdit = () => {
    const {version} = this.props
    push(`/gtfsplus/${version.feedSource.id}/${version.id}`)
  }

  _onClickDelete = () => {
    if (window.confirm('Are you sure you want to delete the GTFS+ edits for this feed version? Note: this will not delete the feed version itself.')) {
      this.props.deleteGtfsPlusFeed(this.props.version.id)
    }
  }

  _onClickPublish = () => {
    this.props.publishGtfsPlusFeed(this.props.version)
    this.setState({ expanded: false })
  }

  _toggleExpanded = () => {
    const {downloadGtfsPlusFeed, version} = this.props
    const {expanded} = this.state
    if (!expanded) downloadGtfsPlusFeed(version.id)
    this.setState({ expanded: !expanded })
  }

  render () {
    const {
      gtfsplus,
      user,
      version,
      versions
    } = this.props
    const { feedSource } = version
    const editingIsDisabled = !user.permissions ||
      !user.permissions.hasFeedPermission(
        feedSource.organizationId,
        feedSource.projectId,
        feedSource.id,
        'edit-gtfs'
      )
    const publishingIsDisabled = !user.permissions ||
      !user.permissions.hasFeedPermission(
        feedSource.organizationId,
        feedSource.projectId,
        feedSource.id,
        'approve-gtfs'
      )
    const header = (
      <h3>
        <Glyphicon glyph='check' /> GTFS+ for this Version
      </h3>
    )

    const derivedVersions = versions.filter(v => v.originNamespace === version.namespace)
    return (
      <Panel header={header}>
        <Row>
          <Col xs={6}>
            <Alert>
              {this.feedStatus()}
              {derivedVersions.length > 0
                ? <div>
                  Versions created from this version of GTFS+:
                  <ul>
                    {derivedVersions.map(v => {
                      const url = `/feed/${v.feedSource.id}/version/${v.version}`
                      return (
                        <li key={v.id}>
                          <Link to={url}>
                            {v.name} (version {v.version})
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                : this._gtfsPlusIsEdited() && gtfsplus.validation && gtfsplus.validation.issues.length === 0
                  ? <div><strong>Note:</strong> Edits must be published as a new feed version.</div>
                  : null

              }
            </Alert>
          </Col>
          <Col xs={6} style={{ textAlign: 'right' }}>
            <ButtonToolbar className='pull-right'>
              {this._gtfsPlusIsEdited()
                ? <Button
                  onClick={this._onClickDelete}>
                  <Glyphicon glyph='remove' /> Clear edits
                </Button>
                : null
              }
              <Button
                disabled={editingIsDisabled}
                bsStyle='primary'
                onClick={this._onClickEdit}>
                <Glyphicon glyph='edit' /> Edit GTFS+
              </Button>
              {this._gtfsPlusIsEdited()
                ? <Button
                  disabled={publishingIsDisabled}
                  bsStyle='primary'
                  onClick={this._onClickPublish}>
                  <Glyphicon glyph='upload' /> Create a New Version
                </Button>
                : null
              }
            </ButtonToolbar>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Panel>
              <Table striped fill>
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Included?</th>
                    <th>Records</th>
                    <th>Validation Issues</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {getGtfsPlusSpec().map((table, index) => {
                    const issueCount = this.validationIssueCount(table.id)
                    const tableLevelIssues = this._getTableLevelIssues(table.id)
                    return (
                      <tr
                        rowSpan={tableLevelIssues ? 2 : 1}
                        key={index}
                        className={tableLevelIssues
                          ? 'danger'
                          : +issueCount > 0 && 'warning'
                        }
                        style={{ color: this.isTableIncluded(table.id) === 'Yes' ? 'black' : 'lightGray' }}>
                        <td>
                          {table.name}
                          {tableLevelIssues
                            ? <small>
                              <br />
                              {tableLevelIssues.length} critical table issue(s):
                              <ul>
                                {tableLevelIssues.map((issue, i) =>
                                  <li key={i}>{issue.fieldName}: {issue.description}</li>)}
                              </ul>
                            </small>
                            : null
                          }
                        </td>
                        <td>{this.isTableIncluded(table.id)}</td>
                        <td>{this.tableRecordCount(table.id)}</td>
                        <td>{issueCount}</td>
                        <td />
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </Panel>
          </Col>
        </Row>
      </Panel>
    )
  }
}
