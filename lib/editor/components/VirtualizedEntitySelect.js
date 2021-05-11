// @flow

import React, {Component} from 'react'
import Select from 'react-select'

import {getEntityName} from '../util/gtfs'

import type {Entity, Style} from '../../types'

export type EntityOption = {
  entity: Entity,
  label: string,
  value: string
}

type Props = {
  clearable?: boolean,
  component: string,
  entities: Array<any>,
  entityKey: string,
  onChange: any => void,
  optionRenderer?: Function,
  style?: Style,
  value?: any
}

type State = {
  options: Array<any>,
  value: any
}

export default class VirtualizedEntitySelect extends Component<Props, State> {
  static defaultProps = {
    clearable: true,
    entityKey: 'id'
  }

  componentWillMount () {
    this.setState({
      value: this.props.value,
      options: []
    })
  }

  /**
   * This component can hold a large number of options, so its
   * shouldComponentUpdate method checks only for changes in state (i.e., the
   * selected value) and a change in length of its entities.
   */
  // shouldComponentUpdate (nextProps, nextState) {
  //   if (nextState.value !== this.state.value || this.state.options.length !== nextState.options.length) {
  //     return true
  //   }
  //   const nextEntities = nextProps.entities || []
  //   const currentEntities = this.props.entities || []
  //   if (nextEntities.length !== currentEntities.length) {
  //     console.log('entities length changed', nextEntities, currentEntities)
  //     return true
  //   }
  //   return false
  // }

  componentWillReceiveProps (nextProps: Props) {
    if (this.state.value !== nextProps.value && typeof this.props.value !== 'undefined') {
      this.setState({value: nextProps.value})
    }
  }

  _onChange = (value: any) => {
    const {onChange} = this.props
    this.setState({value})
    onChange && onChange(value)
  }

  _entityToOption = (entity: any) => {
    const {entityKey} = this.props
    return {
      value: entity[entityKey],
      label: getEntityName(entity) || '[Unnamed]',
      entity
    }
  }

  render () {
    const {
      clearable,
      component,
      entities,
      optionRenderer,
      style
    } = this.props
    const {value} = this.state
    let disabled = false
    let placeholder = `Select ${component}...`
    let options = []
    if (entities.length > 30000) {
      console.warn(`Entity list too large (count=${entities.length}). Disabling entity selector.`)
      disabled = true
      placeholder = 'Selector disabled. List is too large.'
    } else {
      options = entities
        .filter(e => {
          if (e.id < 0) {
            console.warn(`Entity has a negative id, which indicates an unsaved entity that should not be selectable. Filtering out of selector.`, e)
            return false
          } else return e
        })
        .map(this._entityToOption)
    }
    return (
      <Select
        placeholder={placeholder}
        options={options}
        searchable
        disabled={disabled}
        clearable={clearable}
        onChange={this._onChange}
        value={value}
        style={style}
        optionRenderer={optionRenderer} />
    )
  }
}
