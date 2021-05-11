// @flow

import Icon from '../../common/components/icon'
import moment from 'moment'
import React, {Component} from 'react'
import { Panel, Row, Col, ButtonGroup, Button, Label as BsLabel } from 'react-bootstrap'

import * as alertActions from '../actions/alerts'
import { checkEntitiesForFeeds } from '../../common/util/permissions'

import type {Alert, Feed} from '../../types'

type Props = {
  alert: Alert,
  deleteAlert: typeof alertActions.deleteAlert,
  editAlert: typeof alertActions.editAlert,
  editableFeeds: Array<Feed>,
  publishableFeeds: Array<Feed>
}

export default class AlertPreview extends Component<Props> {
  _onDeleteClick = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    // Delete alert if confirmed by user.
    if (window.confirm('Are you sure you want to delete this alert?')) {
      this.props.deleteAlert(this.props.alert)
    }
  }

  _onEditClick = () => this.props.editAlert(this.props.alert)

  render () {
    const {
      alert,
      publishableFeeds,
      editableFeeds
    } = this.props
    const canPublish = checkEntitiesForFeeds(alert.affectedEntities, publishableFeeds)
    const canEdit = checkEntitiesForFeeds(alert.affectedEntities, editableFeeds)
    // Only approved publishers can edit published alerts.
    const editingIsDisabled = alert.published && !canPublish
      ? true
      : !canEdit

    // if user has edit rights and alert is unpublished, user can delete alert, else check if they have publish rights
    const deleteIsDisabled = !editingIsDisabled && !alert.published ? false : !canPublish
    const deleteButtonMessage = alert.published && deleteIsDisabled ? 'Cannot delete because alert is published'
      : !canEdit ? 'Cannot alter alerts for other agencies' : 'Delete alert'

    const editButtonMessage = alert.published && deleteIsDisabled ? 'Cannot edit because alert is published'
      : !canEdit ? 'Cannot alter alerts for other agencies' : 'Edit alert'
    const publishedLabel = alert.published
      ? <BsLabel title='Published' bsStyle='success'><Icon type='check' /></BsLabel>
      : <BsLabel title='Draft' bsStyle='warning'><Icon type='pencil' /></BsLabel>
    const entitiesLabel = alert.affectedEntities.length
      ? <BsLabel
        title={`${alert.affectedEntities.length} affected service(s)`}
        bsStyle='danger'>
        <Icon type='exclamation-triangle' />
        {alert.affectedEntities.length}
      </BsLabel>
      : <BsLabel>General alert</BsLabel>
    const header = (
      <Row style={{cursor: 'pointer'}}>
        <Col xs={8}>
          <p style={{margin: 0}}><strong>{alert.title}</strong></p>
          <p style={{margin: 0}}>ID: #{alert.id} {publishedLabel} {entitiesLabel}</p>
        </Col>
        <Col xs={4}>
          <ButtonGroup className='pull-right'>
            <Button
              title={editButtonMessage}
              disabled={editingIsDisabled}
              onClick={this._onEditClick}>
              <Icon type='pencil' />
            </Button>
            <Button
              title={deleteButtonMessage}
              disabled={deleteIsDisabled}
              onClick={this._onDeleteClick}>
              <Icon type='remove' />
            </Button>
          </ButtonGroup>
        </Col>
      </Row>
    )
    return (
      <Panel collapsible header={header}>
        <p>
          <i>
            {moment(alert.start).format('MMM Do YYYY, h:mm:ssa')}
            {' '}
            to
            {' '}
            {moment(alert.end).format('MMM Do YYYY, h:mm:ssa')}
          </i>
          {' '}
          <span className='pull-right'>
            {publishedLabel} {alert.published ? 'Published' : 'Draft'}
          </span>
        </p>
        <p style={{whiteSpace: 'pre-wrap'}}>{alert.description}</p>
        <p>URL: <a href={alert.url} target='_blank'>{alert.url}</a></p>
        <p>
          <span className='pull-right'>{entitiesLabel} affected service(s)</span>
        </p>
      </Panel>
    )
  }
}
