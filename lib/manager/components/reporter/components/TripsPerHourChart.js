// @flow

import Icon from '../../../../common/components/icon'
import React from 'react'
import {Alert} from 'react-bootstrap'

type Props ={
  maxTripsPerHour: number,
  tripsPerHour: Array<number>
}

export default function (props: Props) {
  const {
    maxTripsPerHour,
    tripsPerHour
  } = props

  // if no trips, return some text that says no trips
  if (Math.max.apply(Math, tripsPerHour) === 0) {
    return (
      <Alert bsStyle='warning'>
        <Icon type='exclamation-circle' /> No trips found on this date
      </Alert>
    )
  }

  const graphHeight = 50
  const spacing = 12
  const leftMargin = 50
  const bottomMargin = 20
  const svgWidth = leftMargin + (tripsPerHour.length * spacing)
  const svgHeight = graphHeight + bottomMargin
  let yAxisMax = Math.ceil(maxTripsPerHour / 10) * 10
  const yAxisPeriod = yAxisMax / 2
  const yAxisLabels = []
  for (let i = yAxisPeriod; i <= yAxisMax; i += yAxisPeriod) {
    yAxisLabels.push(i)
  }
  yAxisMax *= 1.2

  return (
    <div>
      <div
        style={{
          width: '100%',
          height: `${svgHeight}px`,
          overflowX: 'hidden',
          overflowY: 'hidden',
          border: '#ddd'
        }}>
        <svg style={{width: svgWidth, height: `${svgHeight}px`}}>
          <g>
            <text
              fill='gray'
              transform='rotate(270,0,0)'
              x={-55}
              y={10}>
              trips / hr
            </text>
          </g>
          {yAxisLabels.map((label, index) => {
            const y = graphHeight - ((label / yAxisMax) * graphHeight)
            return (
              <g key={index}>
                <line
                  x1={50} y1={y}
                  x2={svgWidth} y2={y}
                  stroke='gray'
                  strokeWidth={1} />
                <text x={30} y={y + 5} fill='gray'>
                  {label}
                </text>
              </g>
            )
          })}
          {tripsPerHour.map((numTrips, hour) => {
            const title = `${hour}:00 - ${numTrips} trips`
            const x = leftMargin + (spacing / 2) + (hour * spacing)

            // generate the bar for this date
            return (
              <g key={hour}>
                <title>{title}</title>
                <line
                  x1={x} y1={graphHeight - ((numTrips / yAxisMax) * graphHeight)}
                  x2={x} y2={graphHeight}
                  title={title}
                  stroke={'#8da0cb'}
                  strokeWidth={10} />
                {/* label x-axis with dates every 14 days */}
                {hour % 6 === 0
                  ? <g>
                    <line x1={x} y1={graphHeight} x2={x} y2={graphHeight + 12} stroke='black' />
                    <text x={x + 4} y={graphHeight + 13} fill='black'>
                      {`${hour}:00`}
                    </text>
                  </g>
                  : null
                }
              </g>
            )
          })}
          {/* Add baseline to chart */}
          <line
            x1={50}
            y1={graphHeight}
            x2={svgWidth}
            y2={graphHeight}
            stroke='black'
            strokeWidth={2} />
        </svg>
      </div>
    </div>
  )
}
