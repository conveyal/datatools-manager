// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Form } from 'react-bootstrap'

import * as activeActions from '../actions/active'
import * as editorActions from '../actions/editor'
import * as mapActions from '../actions/map'
import ActiveTripPatternList from '../containers/ActiveTripPatternList'
import EditorInput from './EditorInput'
import FareRulesForm from './FareRulesForm'
import EntityDetailsHeader from './EntityDetailsHeader'
import ScheduleExceptionForm from './ScheduleExceptionForm'
import { getZones, getEditorTable, canApproveGtfs } from '../util'
import { getTableById } from '../util/gtfs'

import type {Entity, Feed, GtfsSpecField, GtfsStop, Pattern, Project} from '../../types'
import type {EditorTables, ManagerUserState, MapState} from '../../types/reducers'
import type {EditorValidationIssue} from '../util/validation'

type Props = {
  activeComponent: string,
  activeEntity: Entity,
  activeEntityId: number,
  activePattern: Pattern,
  activePatternStops: Array<GtfsStop>,
  deleteEntity: typeof activeActions.deleteGtfsEntity,
  entities: Array<Entity>,
  entityEdited: boolean,
  feedSource: Feed,
  hasRoutes: boolean,
  mapState: MapState,
  newGtfsEntity: typeof editorActions.newGtfsEntity,
  offset: number,
  project: Project,
  resetActiveGtfsEntity: typeof activeActions.resetActiveGtfsEntity,
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  showConfirmModal: any,
  subComponent: string,
  subEntity: number,
  tableData: EditorTables,
  updateActiveGtfsEntity: typeof activeActions.updateActiveGtfsEntity,
  updateMapSetting: typeof mapActions.updateMapSetting,
  uploadBrandingAsset: typeof editorActions.uploadBrandingAsset,
  user: ManagerUserState,
  validationErrors: Array<EditorValidationIssue>,
  width: number
}

type State = {
  editFareRules: boolean
}

export default class EntityDetails extends Component<Props, State> {
  state = {
    editFareRules: false
  }

  _hasValidationIssue = (field: GtfsSpecField) =>
    this.props.validationErrors.find(e => e.field === field.name) !== undefined

  _toggleFareRules = (editFareRules: boolean) => this.setState({ editFareRules })

  render () {
    const {
      activeComponent,
      project,
      feedSource,
      user,
      activeEntity,
      width,
      offset,
      tableData,
      subComponent,
      showConfirmModal,
      validationErrors
    } = this.props
    const approveGtfsDisabled = !canApproveGtfs(project, feedSource, user)
    const panelStyle = {
      width: `${width}px`,
      height: '100%',
      position: 'absolute',
      overflowX: 'visible',
      top: '0px',
      left: offset || '0px',
      zIndex: 2,
      backgroundColor: '#F2F2F2',
      paddingRight: '5px',
      paddingLeft: '5px',
      borderRight: '1px solid #ddd'
    }
    if (!activeEntity) {
      return (
        <div style={panelStyle}>
          <div className='entity-details-loading' style={{height: '100%'}}>
            <h1
              className='text-center'
              style={{marginTop: '150px'}}>
              <Icon className='fa-5x fa-spin' type='refresh' />
            </h1>
          </div>
        </div>
      )
    }
    const stop = ((activeEntity: any): GtfsStop)
    const {zones, zoneOptions} = getZones(getTableById(tableData, 'stop'), stop)
    const currentTable = getEditorTable(activeComponent)
    if (!currentTable) {
      throw new Error(`No table found in GTFS spec for activeComponent: ${activeComponent}`)
    }
    // Render the default form if not viewing trip patterns, schedule exceptions,
    // or fare rules.
    const renderDefault = subComponent !== 'trippattern' &&
      !this.state.editFareRules &&
      activeComponent !== 'scheduleexception'
    return (
      <div style={panelStyle}>
        <div className='entity-details'>
          <EntityDetailsHeader
            validationErrors={validationErrors}
            editFareRules={this.state.editFareRules}
            toggleEditFareRules={this._toggleFareRules}
            {...this.props} />
          {/* Entity Details Body */}
          <div className='entity-details-body'>
            {/* Render relevant form based on entity type */}
            {subComponent === 'trippattern'
              ? <ActiveTripPatternList
                showConfirmModal={showConfirmModal} />
              : this.state.editFareRules && activeEntity
                // $FlowFixMe
                ? <FareRulesForm
                  zones={zones}
                  zoneOptions={zoneOptions}
                  {...this.props} />
                : activeComponent === 'scheduleexception'
                  // $FlowFixMe
                  ? <ScheduleExceptionForm {...this.props} />
                  : <div>
                    <Form>
                      {/* Editor Inputs */}
                      {renderDefault && currentTable.fields
                        .map((field, i) => (
                          <div
                            key={`${activeComponent}-${activeEntity.id || ''}-${i}`}
                            data-test-id={`${activeComponent}-${field.name}-input-container`}>
                            <EditorInput
                              field={field}
                              currentValue={activeEntity[field.name]}
                              approveGtfsDisabled={approveGtfsDisabled}
                              zoneOptions={zoneOptions}
                              isNotValid={this._hasValidationIssue(field)}
                              {...this.props} />
                          </div>
                        ))
                      }
                    </Form>
                  </div>
            }
          </div>
        </div>
      </div>
    )
  }
}
