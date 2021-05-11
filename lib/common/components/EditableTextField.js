// @flow

import Icon from './icon'
import React, {Component} from 'react'
import { FormControl, InputGroup, FormGroup, Button } from 'react-bootstrap'
import {Link} from 'react-router-dom'

type Props = {
  disabled?: ?boolean,
  hideEditButton?: boolean,
  inline?: boolean,
  isEditing?: boolean,
  link?: string,
  maxLength?: number,
  min?: number,
  onChange: string => void,
  placeholder?: string,
  rejectEmptyValue?: boolean,
  step?: number,
  style: {[string]: number | string},
  tabIndex?: number,
  type: string,
  value: string
}

type State = {
  initialValue: string,
  isEditing: boolean,
  value: string
}

export default class EditableTextField extends Component<Props, State> {
  input = {}

  static defaultProps = {
    rejectEmptyValue: false,
    style: {},
    type: 'text'
  }

  componentWillMount () {
    this.setState({
      isEditing: this.props.isEditing || false,
      initialValue: this.props.value,
      value: this.props.value
    })
  }

  componentWillReceiveProps (nextProps: Props) {
    const {initialValue, isEditing, value} = this.state
    const {value: nextValue} = nextProps
    const valueChanged = this.props.value !== nextValue
    if (value !== nextValue && valueChanged && !isEditing) {
      // Update value if externally changed, but only if the field is not being
      // actively edited. This update accounts for cases where the value this
      // field represents has been updated (perhaps due to a request to the
      // server), but if the user is already editing the field, we don't want to
      // interrupt that input.
      this.setState({ value: nextValue })
    }
    if (initialValue !== nextValue) {
      // Update initial value if externally changed.
      // TODO: investigate whether this conditional case fully accounts for the
      // above conditional.
      this.setState({ initialValue: nextValue })
    }
  }

  edit = () => this.setState({isEditing: true})

  _save = (evt?: SyntheticEvent<HTMLInputElement>) => {
    if (evt) evt.preventDefault()
    const {onChange, rejectEmptyValue} = this.props
    const {initialValue, value} = this.state
    // Do not allow save if there is no input value.
    if (rejectEmptyValue && !value) return window.alert('Must provide a valid input.')
    // If there was no change in the value, cancel editing.
    if (value === initialValue) return this.cancel()
    // Otherwise, call onChange function from props and store value in state.
    onChange && onChange(value)
    this.setState({
      isEditing: false,
      value
    })
  }

  cancel () {
    const {rejectEmptyValue} = this.props
    const {initialValue} = this.state
    // Do not allow cancel if there is no input value
    if (rejectEmptyValue && !initialValue) return window.alert('Must provide a valid input.')
    else this.setState({isEditing: false, value: initialValue})
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<HTMLInputElement>) => {
    switch (e.keyCode) {
      case 9: // [Enter]
      case 13: // [Tab]
        e.preventDefault()
        if (this.state.isEditing) {
          this._save(e)
        }
        break
      case 27: // [Esc]
        e.preventDefault()
        return this.cancel()
      default:
        break
    }
  }

  _onInputChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({value: e.target.value})
  }

  // select entire text string on input focus
  _onInputFocus = (e: SyntheticInputEvent<HTMLInputElement>) => e.target.select()

  render () {
    const {
      disabled,
      hideEditButton,
      inline,
      link,
      maxLength,
      min,
      placeholder,
      step,
      style,
      tabIndex,
      type
    } = this.props
    const {
      isEditing,
      value
    } = this.state
    // trim length of display text to fit content
    const displayValue = typeof maxLength === 'number' && value && value.length > maxLength
      ? `${value.substr(0, maxLength)}...`
      : value || '(none)'
    if (inline) {
      style.display = 'inline-block'
    }
    return (
      <div
        style={style}>
        {isEditing
          ? <form
            inline={inline}>
            <FormGroup data-test-id='editable-text-field-edit-container'>
              <InputGroup>
                <FormControl
                  /* eslint-disable-next-line jsx-a11y/no-autofocus */
                  autoFocus
                  type={type.toLowerCase()}
                  min={min}
                  step={step}
                  onChange={this._onInputChange}
                  placeholder={placeholder}
                  onKeyDown={this.handleKeyDown}
                  onFocus={this._onInputFocus}
                  value={value} />
                <InputGroup.Button>
                  <Button
                    onClick={this._save}>
                    <Icon type='check' />
                  </Button>
                </InputGroup.Button>
              </InputGroup>
            </FormGroup>
          </form>
          : <span>
            <span title={value}>
              {link
                ? <Link to={link}>{displayValue}</Link>
                : displayValue
              }
            </span>
            {hideEditButton
              ? null
              : <Button
                bsStyle='link'
                data-test-id='editable-text-field-edit-button'
                disabled={disabled}
                onClick={this.edit}
                tabIndex={tabIndex}>
                <Icon type='pencil' />
              </Button>
            }
          </span>
        }
      </div>
    )
  }
}
