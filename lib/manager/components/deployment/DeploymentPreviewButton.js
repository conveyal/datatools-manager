// @flow

import Icon from '../../common/components/icon'
import React, {Component} from 'react'
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap'

import type {Deployment, Project} from '../../../types'

type Props = {
  deployment: Deployment,
  project: Project
}

export default class DeploymentPreviewButton extends Component<Props> {
  render () {
    const { deployment, project, ...buttonProps } = this.props
    const { id, deployedTo, projectBounds } = deployment
    if (!deployedTo) {
      // Deployment has not been deployed to a server, do not render button.
      return null
    }
    if (!project.otpServers) {
      console.warn(`No otp servers defined for project`)
      return null
    }
    const server = project.otpServers.find(server => server.id === deployedTo)

    let href = server && server.publicUrl
    if (!href || href.length === 0) {
      console.warn(`No public URL set for deployment id=${id}`)
      return null
    }
    if (!projectBounds) {
      console.warn(`Project bounds for deployment id=${id} are invalid! Cannot construct preview URL.`)
    } else {
      // Only add bounds target if bounds are available.
      const {north, south, east, west} = projectBounds
      const lat = (north + south) / 2
      const lon = (east + west) / 2

      // figure out the zoom. assume that otp.js will open in a window of the same size (e.g. a new tab)
      const width = window.innerWidth
      const height = window.innerHeight

      // what fraction of the world is this from north to south?
      // note that we are storing the denominator only, to avoid roundoff errors
      const boundsHeightMerc = 180 / (north - south)

      // longitude is generally more complicated, because the length depends on the latitude
      // however, because we're using a Mercator projection, the map doesn't understand this either,
      // and maps 360 degrees of longitude to an invariant width
      // This is why Greenland appears larger than Africa, but it does make the math easy.
      const boundsWidthMerc = 360 / (east - west)

      // figure out the zoom level
      // level 0 is the entireer world in a single 256x256 tile, next level
      // is entire world in 256 * 2^1, then 256 * 2^2, and so on
      let z = 23

      while (true) {
        const worldSize = 256 * Math.pow(2, z)
        // again, store the denominator/reciprocal
        const windowWidthMerc = worldSize / width
        const windowHeightMerc = worldSize / height
        // if it fits. We use < not > because we have stored the reciprocals.
        if ((windowWidthMerc < boundsWidthMerc && windowHeightMerc < boundsHeightMerc) || z === 0) {
          break
        }
        z--
      }
      href += `#start/${lat}/${lon}/${z}/${deployment.routerId || 'default'}`
    }
    return (
      <OverlayTrigger
        placement='top'
        overlay={
          <Tooltip id='hide-tooltip'>
            Preview in trip planner
          </Tooltip>
        }>
        <Button
          {...buttonProps}
          target='_blank'
          bsStyle='success'
          href={href}>
          <Icon type='window-restore' /> Preview
        </Button>
      </OverlayTrigger>
    )
  }
}
