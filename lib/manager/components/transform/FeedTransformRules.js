// @flow

import Icon from '@conveyal/woonerf/components/icon'
import React, {Component} from 'react'
import {
  Button,
  ButtonToolbar,
  DropdownButton,
  ListGroupItem,
  MenuItem
} from 'react-bootstrap'
import Select from 'react-select'

import {RETRIEVAL_METHODS} from '../../../common/constants'
import {retrievalMethodString} from '../../../common/util/util'
import {getTransformationName} from '../../util/transform'
import VersionRetrievalBadge from '../version/VersionRetrievalBadge'
import type {
  Feed,
  FeedTransformRules as FeedTransformRulesType,
  ReactSelectOption
} from '../../../types'

import FeedTransformation from './FeedTransformation'

function newFeedTransformation (type: string = 'ReplaceFileFromVersionTransformation', props: any = {}) {
  return {
    '@type': type,
    ...props
  }
}

const feedTransformationTypes = [
  'ReplaceFileFromVersionTransformation',
  'ReplaceFileFromStringTransformation',
  'NormalizeFieldTransformation'
]

type TransformRulesProps = {
  feedSource: Feed,
  index: number,
  onChange: (any, number) => void,
  onDelete: (number) => void,
  ruleSet: FeedTransformRulesType
}
/**
 * Component that shows a single set of transform rules, which correspond to a
 * specific set of retrieval methods. This can contain contain multiple
 * transformations that will apply in sequence to an incoming GTFS file.
 */
export default class FeedTransformRules extends Component<TransformRulesProps> {
  _addTransformation = (type: string) => {
    const {index, onChange, ruleSet} = this.props
    const transformations = [...ruleSet.transformations]
    transformations.push(newFeedTransformation(type))
    onChange({...ruleSet, transformations}, index)
  }

  _removeRuleSet = () => {
    const {index, onDelete} = this.props
    const deleteConfirmed = window.confirm(
      `Are you sure you would like to delete Transformation ${index + 1}?`
    )
    if (deleteConfirmed) onDelete(index)
  }

  _onChangeTransformation = (changes: any, transformationIndex: number) => {
    const {index, onChange, ruleSet} = this.props
    const transformations = [...ruleSet.transformations]
    transformations[transformationIndex] = {...transformations[transformationIndex], ...changes}
    onChange({...ruleSet, transformations}, index)
  }

  _onChangeRetrievalMethods = (options: Array<ReactSelectOption>) => {
    const {index, onChange, ruleSet} = this.props
    const retrievalMethods = options.map(o => o.value)
    onChange({...ruleSet, retrievalMethods}, index)
  }

  _onToggleEnabled = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const {index, onChange, ruleSet} = this.props
    onChange({...ruleSet, active: !ruleSet.active}, index)
  }

  _removeTransformation = (transformationIndex: number) => {
    const {index, onChange, ruleSet} = this.props
    const transformations = [...ruleSet.transformations]
    transformations.splice(transformationIndex, 1)
    onChange({...ruleSet, transformations}, index)
  }

  _retrievalMethodToOption = (method: mixed) => {
    // Annoying check because our version of flow appears to treat Object.values
    // as Array<mixed>: https://github.com/facebook/flow/issues/2221#issuecomment-238749128
    if (typeof method === 'string') {
      return {
        value: method,
        label: retrievalMethodString(method)
      }
    }
    return null
  }

  render () {
    const {feedSource, ruleSet, index} = this.props
    // Retrieval options exclude the ambiguous VERSION_CLONE method.
    const retrievalOptions = Object.values(RETRIEVAL_METHODS)
      .filter(m => m !== RETRIEVAL_METHODS.VERSION_CLONE)
      .map(m => this._retrievalMethodToOption(m))
    const methodBadges = ruleSet.retrievalMethods.map(method =>
      <VersionRetrievalBadge key={method} retrievalMethod={method} />)
    return (
      <ListGroupItem className={ruleSet.active ? '' : 'disabled'}>
        <h4>
          <ButtonToolbar className='pull-right'>
            <Button
              bsSize='xsmall'
              onClick={this._onToggleEnabled}>
              {ruleSet.active
                ? <span><Icon type='pause' /> Pause</span>
                : <span><Icon type='play' /> Resume</span>
              }
            </Button>
            <Button
              bsSize='xsmall'
              onClick={this._removeRuleSet}>
              <Icon type='trash' /> Delete
            </Button>
          </ButtonToolbar>
          <Icon type='wrench' /> Transformation {index + 1}{' '}
          {!ruleSet.active ? '(Paused) ' : ''}
          <small>{methodBadges}</small>
        </h4>
        <small>
          Apply this transformation to GTFS feeds created through the following methods.
        </small>
        <Select
          style={{margin: '5px 0px 10px 0px'}}
          clearable={false}
          multi
          placeholder='Select GTFS retrieval methods'
          options={retrievalOptions}
          value={ruleSet.retrievalMethods.map(this._retrievalMethodToOption)}
          onChange={this._onChangeRetrievalMethods} />
        {ruleSet.transformations.length > 0
          ? ruleSet.transformations.map((t, i) => {
            return (
              <FeedTransformation
                key={i}
                feedSource={feedSource}
                onChange={this._onChangeTransformation}
                onRemove={this._removeTransformation}
                ruleSet={ruleSet}
                transformation={t}
                index={i} />
            )
          })
          : <div className='lead'>No transformation steps defined.</div>
        }
        <ButtonToolbar>
          <DropdownButton
            title='Add step to transformation'
            id='add-transformation-dropdown'
            onSelect={this._addTransformation}>
            {feedTransformationTypes.map(t =>
              <MenuItem key={t} eventKey={t}>{getTransformationName(t)}</MenuItem>)
            }
          </DropdownButton>
        </ButtonToolbar>
      </ListGroupItem>
    )
  }
}
