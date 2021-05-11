// @flow

import Icon from '../../common/components/icon'
import memoize from 'lodash/memoize'
import moment from 'moment'
import {get} from 'object-path'
import React, {PureComponent} from 'react'
import {
  Badge,
  ButtonGroup,
  Col,
  ControlLabel,
  DropdownButton,
  Form,
  FormControl,
  FormGroup,
  Glyphicon,
  MenuItem,
  Row
} from 'react-bootstrap'

import * as projectsActions from '../actions/projects'
import * as visibilityFilterActions from '../actions/visibilityFilter'
import SelectableMenuItem from '../../common/components/MenuItem'
import OptionButton from '../../common/components/OptionButton'
import {getComponentMessages, isExtensionEnabled} from '../../common/util/config'
import {
  feedSortOptions,
  getFilteredFeeds,
  versionStatusFilters
} from '../util'
import {getVersionValidationSummaryByFilterStrategy} from '../util/version'

import type {ExtensionType} from '../../types'
import type {Props as ContainerProps} from '../containers/ProjectFeedListToolbar'
import type {
  FeedSourceTableFilterCountStrategies,
  FeedSourceTableSortStrategiesWithOrders,
  ManagerUserState,
  ProjectFilter
} from '../../types/reducers'

type Props = ContainerProps & {
  calculateFeedSourceTableComparisonColumn: typeof projectsActions.calculateFeedSourceTableComparisonColumn,
  downloadFeedForProject: typeof projectsActions.downloadFeedForProject,
  fetchFeedsForProject: typeof projectsActions.fetchFeedsForProject,
  filter: ProjectFilter,
  filterCounts: { [string]: number },
  possibleComparisons: Array<FeedSourceTableFilterCountStrategies>,
  projectEditDisabled: boolean,
  setFeedSort: typeof projectsActions.setFeedSort,
  setFeedSourceTableFilterCountStrategy: typeof projectsActions.setFeedSourceTableFilterCountStrategy,
  setVisibilityFilter: typeof visibilityFilterActions.setVisibilitySearchText,
  setVisibilitySearchText: typeof visibilityFilterActions.setVisibilitySearchText,
  sort: FeedSourceTableSortStrategiesWithOrders,
  thirdPartySync: typeof projectsActions.thirdPartySync,
  user: ManagerUserState,
}

const dateFormat = 'MM/DD/YYYY'

function formattedDate (val: any) {
  return val
    ? moment(val).format(dateFormat)
    : ''
}

function yn (val: any): 'Yes' | 'No' {
  return !val ? 'No' : 'Yes'
}

export default class ProjectFeedListToolbar extends PureComponent<Props> {
  messages = getComponentMessages('ProjectFeedListToolbar')

  _onDownloadMerged = () => this.props.downloadFeedForProject(this.props.project)

  _onSearchChange = (evt: SyntheticInputEvent<HTMLInputElement>) =>
    this.props.setVisibilitySearchText(evt.target.value)

  _onSelectFilter = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const {
      calculateFeedSourceTableComparisonColumn,
      project,
      setFeedSourceTableFilterCountStrategy
    } = this.props
    setFeedSourceTableFilterCountStrategy(evt.target.value)
    calculateFeedSourceTableComparisonColumn(project.id)
  }

  _onUpdateProject = () => this.props.fetchFeedsForProject(this.props.project)

  _onClickThirdPartySync = memoize((type: string) => (evt: SyntheticMouseEvent<HTMLInputElement>) => {
    const {project, thirdPartySync} = this.props
    thirdPartySync(project.id, type)
  })

  _onCsvDownload = () => {
    const {filter, project, sort} = this.props

    // get feed data
    const filteredFeedSources = getFilteredFeeds(
      project.feedSources || [],
      filter,
      project,
      sort
    )

    // initialize columns of CSV. They key is either a string to access a value
    // of the feed or a function to return data from either the feed or the
    // comparison validation summary
    const columns = [{
      label: 'Name',
      key: 'name'
    }, {
      label: 'Is Public',
      key: (feed, comparisonValidation) => yn(feed.isPublic)
    }, {
      label: 'Last Time Data Fetched from Feed URL',
      key: (feed, comparisonValidation) => formattedDate(feed.lastFetched)
    }, {
      label: 'Last Updated',
      key: (feed, comparisonValidation) => formattedDate(feed.lastUpdated)
    }, {
      label: 'Feed download URL',
      key: 'url'
    }, {
      label: 'Has a latest version?',
      key: (feed, comparisonValidation) => yn(feed.latestValidation)
    }, {
      label: 'Latest Version: Start Date',
      key: (feed, comparisonValidation) => formattedDate(
        get(feed, 'latestValidation.startDate')
      )
    }, {
      label: 'Latest Version: End Date',
      key: (feed, comparisonValidation) => formattedDate(
        get(feed, 'latestValidation.endDate')
      )
    }, {
      label: 'Latest Version: Number of Issues',
      key: 'latestValidation.errorCount'
    }, {
      label: 'Latest Version: Number of Routes',
      key: 'latestValidation.routeCount'
    }, {
      label: 'Latest Version: Number of Stops',
      key: 'latestValidation.stopCount'
    }, {
      label: 'Latest Version: Number of Trips',
      key: 'latestValidation.tripCount'
    }, {
      label: 'Latest Version: Number of Stop Times',
      key: 'latestValidation.stopTimesCount'
    }]

    // add comparison columns if needed
    if (filter.feedSourceTableComparisonColumn) {
      const labelPrefix = filter.feedSourceTableComparisonColumn === 'DEPLOYED'
        ? 'Deployed Version:'
        : 'Published Version:'

      columns.push({
        label: filter.feedSourceTableComparisonColumn === 'DEPLOYED'
          ? 'Has Deployed Version?'
          : 'Has Published Version?',
        key: (feed, comparisonValidation) => yn(comparisonValidation)
      })
      columns.push(...[{
        label: `${labelPrefix} Start Date`,
        key: (feed, comparisonValidation) => formattedDate(
          get(comparisonValidation, 'startDate')
        )
      }, {
        label: `${labelPrefix} End Date`,
        key: (feed, comparisonValidation) => formattedDate(
          get(comparisonValidation, 'endDate')
        )
      }, {
        label: `${labelPrefix} Number of Issues`,
        key: (feed, comparisonValidation) => get(comparisonValidation, 'errorCount')
      }, {
        label: `${labelPrefix} Number of Routes`,
        key: (feed, comparisonValidation) => get(comparisonValidation, 'routeCount')
      }, {
        label: `${labelPrefix} Number of Stops`,
        key: (feed, comparisonValidation) => get(comparisonValidation, 'stopCount')
      }, {
        label: `${labelPrefix} Number of Trips`,
        key: (feed, comparisonValidation) => get(comparisonValidation, 'tripCount')
      }, {
        label: `${labelPrefix} Number of Stop Times`,
        key: (feed, comparisonValidation) => get(comparisonValidation, 'stopTimesCount')
      }])
    }

    // initialize csv
    let csvContent = 'data:text/csv;charset=utf-8,'

    // write csv headers
    csvContent += columns.map(column => column.label).join(',') + '\n'

    // write rows
    filteredFeedSources.forEach(feed => {
      const comparisonValidationSummary = getVersionValidationSummaryByFilterStrategy(
        project,
        feed,
        filter.feedSourceTableComparisonColumn
      )
      csvContent += columns.map(column =>
        (
          typeof column.key === 'string'
            ? get(feed, column.key)
            : column.key(feed, comparisonValidationSummary)
        ) || ''
      ).join(',') + '\n'
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'feeds.csv')
    if (!document.body) {
      console.warn('document.body does not exist')
      return
    }
    document.body.appendChild(link) // Required for FF
    link.click()
  }

  _onSort = memoize((type: FeedSourceTableSortStrategiesWithOrders) => () => {
    this.props.setFeedSort(type)
  })

  /**
   * Renders a third party sync menu item if it is enabled.
   */
  _renderSyncMenuItem = (type: ExtensionType) => {
    const typeCaps = type.toUpperCase()
    return isExtensionEnabled(type) && <MenuItem
      disabled={this.props.projectEditDisabled}
      id={typeCaps}
      key={type}
      onClick={this._onClickThirdPartySync(typeCaps)}
    >
      <Glyphicon glyph='refresh' /> {this.messages(`sync.${type}`)}
    </MenuItem>
  }

  _renderSortOption = (option: FeedSourceTableSortStrategiesWithOrders) => {
    const {sort} = this.props
    return (
      <SelectableMenuItem
        key={`feed-sort-${option}`}
        onClick={this._onSort(option)}
        selected={sort === option}
      >
        {this.messages(`sort.${option.replace('-', '.')}`)}
      </SelectableMenuItem>
    )
  }

  /**
   * Render the sort menu with all the various options
   */
  _renderSortOptions () {
    const options = [
      <MenuItem header key='sort-header-note'>
        Note: sorting only available on latest version data
      </MenuItem>
    ]
    const sortOptions = [...new Set(
      Object.keys(feedSortOptions).map(key => key.split('-')[0])
    )]
    sortOptions.forEach((option, idx) => {
      options.push(
        <MenuItem header key={`feed-sort-${option}-header`}>
          {this.messages(`sort.${option}.title`)}
        </MenuItem>
      )
      // $FlowFixMe flow is not smart enough to recombine strings
      options.push(this._renderSortOption(`${option}-asc`))
      // $FlowFixMe flow is not smart enough to recombine strings
      options.push(this._renderSortOption(`${option}-desc`))
      if (idx < sortOptions.length - 1) {
        options.push(<MenuItem divider key={`feed-sort-${option}-divider`} />)
      }
    })
    return options
  }

  _renderFilterToolbarLabel = () => {
    const {filter, possibleComparisons} = this.props

    const style = { marginLeft: 5, marginRight: 5 }
    const strategySelect = possibleComparisons.length < 2
      ? <span style={style}>{this.messages('comparison.LATEST')}</span>
      : (
        /* eslint-disable jsx-a11y/no-onchange, because changing the comparison
         may not present negative consequences for keyboard or screen reader
         users */
        <select
          onChange={this._onSelectFilter}
          style={style}
          value={filter.feedSourceTableFilterCountStrategy}
        >
          {possibleComparisons.map(comparison => (
            <option key={comparison} value={comparison}>
              {this.messages(`comparison.${comparison}`)}
            </option>
          ))}
        </select>
      )

    return (
      <ControlLabel style={{ display: 'block' }}>
        Filter feed sources on
        {strategySelect}
        version
      </ControlLabel>
    )
  }

  render () {
    const {
      filter,
      filterCounts,
      onNewFeedSourceClick,
      projectEditDisabled,
      setVisibilityFilter
    } = this.props

    const activeFilter = filter.filter || 'all'
    const nonFilterColumnOffset = 25

    return (
      <Row>
        <Col xs={4} style={{ marginTop: nonFilterColumnOffset }}>
          <Form inline style={{ display: 'inline' }}>
            <FormGroup
              className='feed-source-toolbar-formgroup'
              controlId='formControlsSelect'
            >
              <FormControl
                placeholder={this.messages('feeds.search')}
                onChange={this._onSearchChange}
                value={filter.searchText || undefined}
              />
            </FormGroup>
          </Form>
          <DropdownButton
            id='project-feedsource-table-sort-button'
            style={{ marginLeft: 20 }}
            title='Sort By'
          >
            {this._renderSortOptions()}
          </DropdownButton>
        </Col>
        <Col xs={6}>
          <FormGroup id='feedFilterToolbarControl'>
            {this._renderFilterToolbarLabel()}
            <ButtonGroup>
              {Object.keys(versionStatusFilters).map(filterOption => (
                <OptionButton
                  active={activeFilter === filterOption}
                  className={activeFilter === filterOption ? 'active' : ''}
                  key={filterOption}
                  onClick={setVisibilityFilter}
                  value={filterOption}
                >
                  {this.messages(`filter.${filterOption}`)}{' '}
                  <Badge
                    style={{backgroundColor: '#babec0'}}>
                    {filterCounts[filterOption]}
                  </Badge>
                </OptionButton>
              ))}
            </ButtonGroup>
          </FormGroup>
        </Col>
        <Col xs={2} style={{ marginTop: nonFilterColumnOffset }}>
          <DropdownButton
            bsStyle='primary'
            data-test-id='project-header-action-dropdown-button'
            id='project-header-actions'
            style={{ marginLeft: 20 }}
            title='Actions'
          >
            {!projectEditDisabled &&
              <MenuItem
                data-test-id='project-header-create-new-feed-source-button'
                disabled={projectEditDisabled}
                key='create-feedsource-button'
                onClick={onNewFeedSourceClick}
              >
                <Glyphicon glyph='plus' /> {this.messages('feeds.new')}
              </MenuItem>
            }
            {this._renderSyncMenuItem('transitland')}
            {this._renderSyncMenuItem('transitfeeds')}
            {this._renderSyncMenuItem('mtc')}
            <MenuItem
              disabled={projectEditDisabled}
              key='update-feeds-button'
              onClick={this._onUpdateProject}
            >
              <Icon type='cloud-download' /> {this.messages('feeds.update')}
            </MenuItem>
            <MenuItem
              key='merge-feeds-button'
              onClick={this._onDownloadMerged}
            >
              <Glyphicon glyph='download' /> {this.messages('mergeFeeds')}
            </MenuItem>
            <MenuItem
              key='csv-download-button'
              onClick={this._onCsvDownload}
            >
              <Icon type='table' /> {this.messages('downloadCsv')}
            </MenuItem>
          </DropdownButton>
        </Col>
      </Row>
    )
  }
}
