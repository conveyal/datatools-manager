// @flow

import Icon from '../../../common/components/icon'
import moment from 'moment'
import React, {Component} from 'react'
import {Button} from 'react-bootstrap'
import { push } from 'connected-react-router'

import {isEditingDisabled} from '../../util'

import type {Props as GtfsValidationViewerProps} from './GtfsValidationViewer'
import type {FeedVersion, ValidationError} from '../../../types'

type Props = GtfsValidationViewerProps & {
  error: ValidationError,
  index: number,
  multipleEntityTypes: boolean,
  version: FeedVersion
}

type State = {
  expanded: boolean
}

export default class ValidationErrorItem extends Component<Props, State> {
  state = {expanded: false}

  _onClickFetch = () => {
    const {expanded} = this.state
    const {error, gtfs, version: feedVersion, fetchGTFSEntities} = this.props
    const {entity_id: id, entity_type: type} = error
    const entity = gtfs.validation.data[`${type}:${id}`]
    if (!expanded) {
      if (!entity) {
        // fetch GTFS entity
        const {entity_id: id, entity_type: type} = error
        if (id) {
          fetchGTFSEntities({type, id, namespace: feedVersion.namespace})
        } else {
          // FIXME: fetch by line number
          fetchGTFSEntities({type, id, namespace: feedVersion.namespace})
        }
      }
    }
    this.setState({expanded: !expanded})
  }

  _renderEntityDetails = (entity: any, type: string, sequence: ?number) => {
    if (entity) {
      if (type === 'StopTime') {
        const items = []
        items.push(<tr key='zero'><td colSpan='4'>...</td></tr>)
        items.push(entity.stop_times
          .map((stopTime, index) => {
            // FIXME: Check that this renders ok.
            if (typeof sequence !== 'number') return null
            if (stopTime.stop_sequence < sequence - 1 || stopTime.stop_sequence > sequence + 1) return null
            return <tr key={index} className={stopTime.stop_sequence === sequence ? 'danger' : ''}><td colSpan='4'>
              {Object.keys(stopTime).map(stKey => {
                let value = stopTime[stKey]
                if (stKey.endsWith('_time')) {
                  const time = moment().startOf('day').seconds(stopTime[stKey])
                  value = time && time.isValid() ? time.format('HH:mm:ss') : value
                }
                return <div key={stKey}><strong>{stKey}</strong>: {value}</div>
              })}
            </td></tr>
          })
        )
        items.push(<tr key='last'><td colSpan='4'>...</td></tr>)
        return items
      }
      return (
        <tr><td colSpan='4'>
          {Object.keys(entity).map(key => {
            // Do not attempt to render objects as React children
            if (typeof entity[key] === 'object') return null
            return <div key={key}><strong>{key}</strong>: {entity[key]}</div>
          })}
        </td></tr>
      )
    } else {
      return null
    }
  }

  // FIXME: Add link to GTFS Editor with entity_id
  _onEditClick = () => {
    const {error, version} = this.props
    // Line numbers in validation errors also refer to unique ID field of each
    // table of entities
    const {line_number: id, entity_type: type} = error
    const component = type && type.toLowerCase()
    if (component) {
      push(`/feed/${version.feedSource.id}/edit/${component}/${id}`)
    } else {
      console.warn(`Error does not have type. Cannot link to editor.`, error)
    }
  }

  _formatValue = (value: any) => {
    return value === null
      ? <span className='text-light'>N/A</span>
      : value
  }

  render () {
    const {error, feedSource, gtfs, index, multipleEntityTypes, project, user} = this.props
    const {expanded} = this.state
    const {
      entity_id: gtfsId,
      entity_sequence: sequence,
      entity_type: type,
      line_number: lineNumber,
      bad_value: badValue
    } = error
    const entity = gtfs.validation.data[`${type}:${gtfsId}`]
    const noFeedInEditor = feedSource.editorNamespace === null
    const editableTypes = ['stop', 'route']
    const noEntityId = !gtfsId
    const idString = typeof sequence === 'number'
      ? `${gtfsId}:${sequence}`
      : gtfsId
    const component = type && type.toLowerCase()
    const typeIsNotEditable = typeof type === 'undefined' ||
      editableTypes.indexOf(component) === -1 ||
      noEntityId
    const editingIsDisabled = isEditingDisabled(user, feedSource, project) ||
      typeIsNotEditable ||
      noFeedInEditor
    return <tbody>
      {index % 2 === 0 ? <tr className='hidden' /> : null}
      <tr>
        <td>{this._formatValue(lineNumber)}</td>
        {multipleEntityTypes && <td>{this._formatValue(type)}</td>}
        <td>{this._formatValue(idString)}</td>
        <td>{this._formatValue(badValue)}</td>
        <td>
          <Button
            disabled={editingIsDisabled}
            style={{margin: 0, padding: 0}}
            title={noFeedInEditor
              ? 'Import feed into editor to fix issue'
              : typeIsNotEditable
                ? 'Error type is not linked to editor'
                : 'Fix in editor'}
            onClick={this._onEditClick}
            bsStyle='link'
          >
            <Icon type='wrench' />
          </Button>
          <Button
            onClick={this._onClickFetch}
            disabled={noEntityId}
            title={noEntityId ? `There is no entity to view` : `View ${type} details`}
            style={{margin: 0, padding: 0}}
            bsStyle='link'
          >
            <Icon type='info' />
          </Button>
        </td>
      </tr>
      {expanded ? this._renderEntityDetails(entity, type, sequence) : null}
    </tbody>
  }
}
