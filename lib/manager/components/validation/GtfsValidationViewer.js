// @flow

import Icon from '../../../common/components/icon'
import moment from 'moment'
import React, {Component} from 'react'
import {
  Alert,
  Label as BsLabel,
  ListGroup,
  Table,
  ListGroupItem,
  Panel,
  Col,
  Row
} from 'react-bootstrap'

import Loading from '../../../common/components/Loading'
import OptionButton from '../../../common/components/OptionButton'
import {getComponentMessages} from '../../../common/util/config'
import toSentenceCase from '../../../common/util/to-sentence-case'
import {
  BLOCKING_ERROR_TYPES,
  getTableFatalExceptions,
  getValidationResultErrorCounts,
  isErrorBlocking,
  isErrorCountFetched,
  validationErrorIconLookup
} from '../../util/version'

import ValidationErrorItem from './ValidationErrorItem'

import type {Props as FeedVersionViewerProps} from '../version/FeedVersionViewer'
import type {ValidationResult} from '../../../types'

const DEFAULT_LIMIT = 10

export type Props = FeedVersionViewerProps & {
  validationResult: ValidationResult
}

type State = {
  active: ?string,
  limit: number,
  offset: number
}

export default class GtfsValidationViewer extends Component<Props, State> {
  messages = getComponentMessages('GtfsValidationViewer')

  state = {
    active: null,
    offset: 0,
    limit: DEFAULT_LIMIT
  }

  _onClickErrorType = (errorType: string) => {
    const {version: feedVersion, fetchValidationErrors} = this.props
    const {active, limit, offset} = this.state
    const {error_counts: errorCounts} = feedVersion.validationResult
    if (active === errorType) {
      // Close error type category
      this.setState({active: null})
    } else {
      if (!errorCounts) {
        console.warn('error_counts variable is undefined')
        return
      }
      const category = errorCounts.find(c => c.type === errorType)
      if (!category) {
        console.warn(`Error type=${errorType} not found`, feedVersion)
        return
      }
      if (!category.errors || category.errors.length === 0) {
        // Fetch errors and reset active error type, limit, and offset
        this.setState({active: errorType})
        fetchValidationErrors({feedVersion, errorType, offset, limit})
      } else {
        // Do not fetch errors if first batch has already been fetched.
        // reset active error type, limit, and offset
        this.setState({active: errorType, offset: 0})
      }
    }
  }

  _onClickLoadMoreErrors = (errorType: string) => {
    const {version: feedVersion, fetchValidationErrors} = this.props
    const {limit} = this.state
    const {error_counts: errorCounts} = feedVersion.validationResult
    if (!errorCounts) {
      console.warn('Error counts not found for validation result', feedVersion)
      return
    }
    const category = errorCounts.find(c => c.type === errorType)
    if (!category) {
      console.warn(`Error type=${errorType} not found`, feedVersion)
      return
    }
    // Update offset based on number of errors already fetched
    if (category.errors) {
      const offset = category.errors.length
      this.setState({offset})
      fetchValidationErrors({feedVersion, errorType, offset, limit})
    }
  }

  render () {
    const { validationResult, version } = this.props
    const tableFatalExceptions = getTableFatalExceptions(version)
    const {active} = this.state
    const dateFormat = 'MMM. DD, YYYY'
    const timeFormat = 'h:MMa'
    const hasValidation = isErrorCountFetched(validationResult)
    const validationErrors = getValidationResultErrorCounts(validationResult)

    let validationContent = null
    if (!hasValidation) { // Validation not retreived yet
      validationContent = (
        <ListGroup fill>
          <ListGroupItem className='validation-item'>
            Retrieving Validation...
          </ListGroupItem>
        </ListGroup>
      )
    } else if (validationErrors) {
      validationContent = validationErrors.map((category, index) => {
        const errorTypeIsActive = active === category.type
        let firstError
        let multiTyped = false
        if (category.errors) {
          firstError = category.errors[0]
          category.errors.forEach(e => {
            if (e.entity_type !== firstError.entity_type) multiTyped = true
          })
        }
        // Determine if this is a generic error type that can be applied to
        // multiple tables.
        const tableType = category.type.indexOf('TABLE') !== -1 ||
          BLOCKING_ERROR_TYPES.indexOf(category.type) !== -1
        // Check to see if this is a blocking issue (MTC-only) preventing
        // the version from being published.
        const isBlockingIssue = isErrorBlocking(category)
        const includeEntityType = tableType || multiTyped
        const errorClass = `gtfs-error-${category.priority}`
        const tip = this.messages(`tips.${category.type}`, false)
        return (
          <ListGroup key={index} fill>
            <ListGroupItem>
              <Row
                className='list-group-item-heading'
                // FIXME
                onClick={() => this._onClickErrorType(category.type)}
                style={{cursor: 'pointer'}}>
                <Col xs={12}>
                  <h4>
                    <span
                      className={`buffer-icon ${errorClass}`}
                      title={`${toSentenceCase(category.priority)} priority`}>
                      <Icon type={validationErrorIconLookup[category.priority]} />
                    </span>
                    {toSentenceCase(category.type.replace(/_/g, ' '))}
                    {' '}
                    <span className={errorClass}>
                      &mdash; {category.count}{' '}
                      case{category.count > 1 ? 's' : ''} found
                    </span>
                    {' '}
                    {isBlockingIssue &&
                      <BsLabel bsStyle='danger'>BLOCKING</BsLabel>
                    }
                    <span className={`pull-right`}>
                      <Icon type={errorTypeIsActive ? 'caret-up' : 'caret-down'} />
                    </span>
                  </h4>
                </Col>
              </Row>
            </ListGroupItem>
            {/* Render list of errors */}
            <Panel collapsible bsClass='' expanded={errorTypeIsActive}>
              <ListGroupItem style={{borderTop: '0px', paddingTop: '0px'}}>
                <ul className='list-unstyled error-details-list'>
                  <li>
                    {category.message}
                  </li>
                  <li>
                    { // This conditional is a bit of a hack to determine if
                      // there is actually a value defined for the hint. If not,
                      // do not show the hint.
                      !tip.startsWith('{') &&
                      <span>
                        <strong>Tip:</strong>{' '}
                        <span>{tip}</span>
                      </span>
                    }
                  </li>
                </ul>
              </ListGroupItem>
              <Table striped hover fill className='table-fixed'>
                <thead><tr>
                  <th>Line #</th>
                  {includeEntityType && <th>Entity type</th>}
                  <th>{firstError && !includeEntityType ? firstError.entity_type : 'Entity'} ID</th>
                  <th>Bad value</th>
                  <th>Action</th>
                </tr></thead>
                {category.errors
                  ? category.errors.map((error, index) => (
                    <ValidationErrorItem
                      {...this.props}
                      version={version}
                      multipleEntityTypes={includeEntityType}
                      error={error}
                      index={index}
                      key={index} />
                  ))
                  : <Loading />
                }
              </Table>
            </Panel>
            {errorTypeIsActive &&
              category.errors &&
              category.errors.length < category.count
              ? <ListGroupItem className='validation-item'>
                <OptionButton
                  value={category.type}
                  onClick={this._onClickLoadMoreErrors}>
                  Load more
                </OptionButton>
              </ListGroupItem>
              : errorTypeIsActive
                ? <ListGroupItem className='validation-item'>
                  <span className='text-muted'>No more errors of this type</span>
                </ListGroupItem>
                : null
            }
          </ListGroup>
        )
      })
    } else { // No errors found
      validationContent = (
        <ListGroup fill>
          <ListGroupItem className='validation-item'>
            No validation errors!
          </ListGroupItem>
        </ListGroup>
      )
    }

    return (
      <div>
        <h2 style={{marginTop: '0px'}}>
          {version.name}{' '}
          <small>
            {moment(version.updated).format(dateFormat + ', ' + timeFormat)}
          </small>
        </h2>
        {tableFatalExceptions.length > 0 &&
          <Alert bsStyle='danger'>
            <Icon type='exclamation-triangle' />{' '}
            <strong>Fatal exception:</strong>{' '}
            {tableFatalExceptions
              .map(e => `${e.tableName}: ${e.fatalException}`)
              .join(', ')
            }
          </Alert>
        }
        <Panel header={<h2>{this.messages('title')}</h2>}>
          {validationContent}
        </Panel>
      </div>
    )
  }
}
