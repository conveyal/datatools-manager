import React from 'react'

export default class Icon extends React.PureComponent {
  render () {
    const {className = '', type, ...props} = this.props
    return <i
      className={`fa fa-${type} fa-fw ${className}`}
      {...props}
    />
  }
}
