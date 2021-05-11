// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import { Button } from 'react-bootstrap'
import {browserHistory} from 'react-router'
import { LinkContainer } from 'react-router-bootstrap'
import Select from 'react-select'

import {getAbbreviatedProjectName} from '../../common/util/util'

import type {Project, ReactSelectOption} from '../../types'
import type {ManagerUserState} from '../../types/reducers'

type Props = {
  activeProject: Project,
  user: ManagerUserState,
  visibleProjects: Array<Project>
}

export default class HomeProjectDropdown extends Component<Props> {
  handleChange = (option: ReactSelectOption) => {
    browserHistory.push(`/home/${option ? option.value : ''}`)
  }

  _optionRenderer = (option: ReactSelectOption) => {
    return (
      <span title={option.label}>
        <Icon type='folder-o' /> {option.label}
      </span>
    )
  }

  render () {
    const {
      activeProject,
      user,
      visibleProjects
    } = this.props
    const isAdmin = user.permissions && user.permissions.isApplicationAdmin()
    const {profile} = user
    if (!profile) return null
    const abbreviatedProjectName = getAbbreviatedProjectName(activeProject)
    const options = visibleProjects.map(
      project => ({value: project.id, label: project.name || '[No name]'})
    )
    return (
      <div style={{marginBottom: '20px'}}>
        {
          isAdmin && (
            <LinkContainer to='/project/new'>
              <Button bsStyle='link' style={{paddingLeft: 0}}>
                <Icon type='plus' /> New project
              </Button>
            </LinkContainer>
          )
        }
        <div style={{display: 'flex'}}>
          <div style={{paddingRight: '10px', width: '70%'}}>
            <Select
              onChange={this.handleChange}
              optionRenderer={this._optionRenderer}
              options={options}
              placeholder='Select project...'
              value={options.find(o =>
                activeProject && o.value === activeProject.id
              )}
              valueRenderer={this._optionRenderer}
            />
          </div>
          <LinkContainer
            to={activeProject ? `/project/${activeProject.id}` : ''}
          >
            <Button
              disabled={!activeProject}
              style={{width: '30%'}}
              title={activeProject ? `View ${activeProject.name}` : ''}
              bsStyle='primary'
            >
              {activeProject
                ? `View ${abbreviatedProjectName}`
                : 'Select project'
              }
            </Button>
          </LinkContainer>
        </div>
      </div>
    )
  }
}
