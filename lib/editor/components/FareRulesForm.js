// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Checkbox, Button, FormGroup, Panel } from 'react-bootstrap'

import {updateActiveGtfsEntity} from '../actions/active'
import {getFareRuleFieldName} from '../util'
import FareRuleSelections from './FareRuleSelections'
import {generateNullProps, getTableById} from '../util/gtfs'

import type {FareRule, GtfsFare, ZoneOption, Zones} from '../../types'
import type {EditorTables} from '../../types/reducers'
import type {EditorValidationIssue} from '../util/validation'

type Props = {
  activeComponent: string,
  activeEntity: GtfsFare,
  entityEdited: boolean,
  tableData: EditorTables,
  updateActiveGtfsEntity: typeof updateActiveGtfsEntity,
  validationErrors: Array<EditorValidationIssue>,
  zoneOptions: Array<ZoneOption>,
  zones: Zones
}

type RuleType = {label: string, type: string}

const FARE_RULE_TYPES: Array<RuleType> = [
  {type: 'route_id', label: 'Route'},
  {type: 'origin_id', label: 'From/to'},
  {type: 'contains_id', label: 'Contains'}
]

let newId = -1

export default class FareRulesForm extends Component<Props> {
  _onClickAdd = () => {
    const {activeComponent, activeEntity, updateActiveGtfsEntity} = this.props
    const rules = [...activeEntity.fare_rules]
    // Add new fare rule to beginning of array
    rules.unshift({
      ...generateNullProps('fare_rules'),
      id: newId--,
      fare_id: activeEntity.fare_id
    })
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {fare_rules: rules}
    })
  }

  render () {
    const {activeEntity} = this.props
    const rules = activeEntity.fare_rules || []
    return (
      <div>
        <p>
          Specify which routes or zones <strong>{activeEntity.fare_id}</strong> fare applies to.
        </p>
        <span className='pull-right'>
          {rules.length} rules apply to this fare
        </span>
        <Button
          data-test-id='add-fare-rule-button'
          onClick={this._onClickAdd}
          style={{marginBottom: '15px'}}
        >
          <Icon type='plus' /> Add rule
        </Button>
        {rules.map((rule, index) => (
          <FareRuleItem
            rule={rule}
            key={rule.id}
            index={index}
            {...this.props} />
        ))}
      </div>
    )
  }
}

type RuleProps = Props & {index: number, rule: FareRule}

type State = {
  contains_id: boolean,
  destination_id: boolean,
  origin_id: boolean,
  route_id: boolean
}

const ruleToState = (rule: FareRule) => ({
  contains_id: Boolean(rule.contains_id),
  // Show both destination and origin selector if either field has a value.
  destination_id: Boolean(rule.destination_id || rule.origin_id),
  origin_id: Boolean(rule.destination_id || rule.origin_id),
  route_id: Boolean(rule.route_id)
})

class FareRuleItem extends Component<RuleProps, State> {
  componentWillMount () {
    this.setState(ruleToState(this.props.rule))
  }

  componentWillReceiveProps (nextProps: RuleProps) {
    if (!nextProps.entityEdited && this.props.entityEdited) {
      // Reset state if undo is pressed
      this.setState(ruleToState(nextProps.rule))
    }
  }

  _onChangeCheckbox = (newValue: boolean, type: RuleType) => {
    const {activeComponent, activeEntity, index, updateActiveGtfsEntity} = this.props
    const rules = [...activeEntity.fare_rules]
    if (type.type === 'origin_id') {
      rules[index].origin_id = null
      rules[index].destination_id = null
      this.setState({origin_id: newValue, destination_id: newValue})
    } else {
      rules[index][type.type] = null
      this.setState({[type.type]: newValue})
    }
    // Set values to null if checkbox is unchecked.
    if (newValue === false) {
      updateActiveGtfsEntity({
        entity: activeEntity,
        component: activeComponent,
        props: {fare_rules: rules}
      })
    }
  }

  _onClickRemoveRule = () => {
    const {activeComponent, activeEntity, index, updateActiveGtfsEntity} = this.props
    const rules = [...activeEntity.fare_rules]
    rules.splice(index, 1)
    updateActiveGtfsEntity({
      component: activeComponent,
      entity: activeEntity,
      props: {fare_rules: rules}
    })
  }

  render () {
    const {
      activeComponent,
      activeEntity,
      index,
      rule,
      tableData,
      updateActiveGtfsEntity,
      validationErrors,
      zoneOptions,
      zones
    } = this.props
    const routeEntity = rule.route_id
      ? getTableById(tableData, 'route').find(r => r.route_id === rule.route_id)
      : null
    const ruleNumber = activeEntity.fare_rules.length - index
    const ruleField = getFareRuleFieldName(activeEntity, index)
    const hasError = validationErrors.findIndex(e => e.field === ruleField) > -1
    const ruleHeader = rule.id < 0
      ? <em>New rule (unsaved)</em>
      : <strong>Rule {ruleNumber}</strong>
    return (
      <Panel
        bsStyle={hasError ? 'danger' : undefined}
        header={
          <h4>
            <Button
              bsStyle='danger'
              bsSize='xsmall'
              className='pull-right'
              style={{marginLeft: '5px'}}
              onClick={this._onClickRemoveRule}>
              <Icon type='times' />
            </Button>
            {ruleHeader}
          </h4>
        }
        key={`rule-${activeEntity.id}-${rule.id}`}>
        <FormGroup>
          {FARE_RULE_TYPES.map((type, i) => {
            const uniqueId = `${activeEntity.id}-${rule.id}`
            return (
              <FareRuleTypeCheckbox
                type={type}
                checked={this.state[type.type]}
                index={index}
                onChangeCheckbox={this._onChangeCheckbox}
                key={`${uniqueId}-${type.type}`} />
            )
          })}
        </FormGroup>
        <FareRuleSelections
          index={index}
          showRouteId={this.state.route_id}
          showContainsId={this.state.contains_id}
          showOriginId={this.state.origin_id}
          showDestinationId={this.state.destination_id}
          tableData={tableData}
          activeEntity={activeEntity}
          activeComponent={activeComponent}
          zones={zones}
          zoneOptions={zoneOptions}
          updateActiveGtfsEntity={updateActiveGtfsEntity}
          routeEntity={routeEntity} />
      </Panel>
    )
  }
}

type CheckboxProps = {
  checked: boolean,
  index: number,
  onChangeCheckbox: (boolean, RuleType) => void,
  type: RuleType
}

class FareRuleTypeCheckbox extends Component<CheckboxProps> {
  _onChangeCheckbox = () =>
    this.props.onChangeCheckbox(!this.props.checked, this.props.type)

  render () {
    const {checked, index, type} = this.props
    return (
      <Checkbox
        inline
        name={`fareRuleType-${index}-${type.type}`}
        checked={checked}
        onChange={this._onChangeCheckbox}>
        <small>{type.label}</small>
      </Checkbox>
    )
  }
}
