import { AxisBottom, AxisLeft } from "@visx/axis"
import { Group } from "@visx/group"
import { LegendOrdinal } from "@visx/legend"
import type { CityTemperature } from "@visx/mock-data/lib/mocks/cityTemperature"
import cityTemperature from "@visx/mock-data/lib/mocks/cityTemperature"
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale"
import { BarStackHorizontal } from "@visx/shape"
import { timeFormat, timeParse } from "@visx/vendor/d3-time-format"
import React from "react"

type CityName = `Austin` | `New York` | `San Francisco`

export type BarStackHorizontalProps = {
	width: number
	height: number
	margin?: { top: number; right: number; bottom: number; left: number }
	events?: boolean
}

const purple1 = `#6c5efb`
const purple2 = `#c998ff`
export const purple3 = `#a44afe`
export const background = `#eaedff`
const defaultMargin = { top: 40, left: 50, right: 40, bottom: 100 }

const data = cityTemperature.slice(0, 12)
const keys = Object.keys(data[0]).filter((d) => d !== `date`) as CityName[]

const temperatureTotals = data.reduce((allTotals, currentDate) => {
	const totalTemperature = keys.reduce((dailyTotal, k) => {
		dailyTotal += Number(currentDate[k])
		return dailyTotal
	}, 0)
	allTotals.push(totalTemperature)
	return allTotals
}, [] as number[])

const parseDate = timeParse(`%Y-%m-%d`)
const format = timeFormat(`%b %d`)
const formatDate = (date: string) => format(parseDate(date) as Date)

// accessors
const getDate = (d: CityTemperature) => d.date

// scales
const temperatureScale = scaleLinear<number>({
	domain: [0, Math.max(...temperatureTotals)],
	nice: true,
})
const dateScale = scaleBand<string>({
	domain: data.map(getDate),
	padding: 0.2,
})
const colorScale = scaleOrdinal<CityName, string>({
	domain: keys,
	range: [purple1, purple2, purple3],
})

export default function BarChart({
	width,
	height,
	margin = defaultMargin,
}: BarStackHorizontalProps): JSX.Element | null {
	// bounds
	const xMax = width - margin.left - margin.right
	const yMax = height - margin.top - margin.bottom
	console.log(data)

	temperatureScale.rangeRound([0, xMax])
	dateScale.rangeRound([yMax, 0])

	return width < 10 ? null : (
		<div>
			<svg width={width} height={height}>
				<title>Horizontal Stacked Bar Chart</title>
				<rect width={width} height={height} fill={background} rx={14} />
				<Group top={margin.top} left={margin.left}>
					<BarStackHorizontal<CityTemperature, CityName>
						data={data}
						keys={keys}
						height={yMax}
						y={getDate}
						xScale={temperatureScale}
						yScale={dateScale}
						color={colorScale}
					>
						{(barStacks) =>
							barStacks.map((barStack) =>
								barStack.bars.map((bar) => (
									<rect
										key={`barstack-horizontal-${barStack.index}-${bar.index}`}
										x={bar.x}
										y={bar.y}
										width={bar.width}
										height={bar.height}
										fill={bar.color}
									/>
								)),
							)
						}
					</BarStackHorizontal>
					<AxisLeft
						hideAxisLine
						hideTicks
						scale={dateScale}
						tickFormat={formatDate}
						stroke={purple3}
						tickStroke={purple3}
						tickLabelProps={{
							fill: purple3,
							fontSize: 11,
							textAnchor: `end`,
							dy: `0.33em`,
						}}
					/>
					<AxisBottom
						top={yMax}
						scale={temperatureScale}
						stroke={purple3}
						tickStroke={purple3}
						tickLabelProps={{
							fill: purple3,
							fontSize: 11,
							textAnchor: `middle`,
						}}
					/>
				</Group>
			</svg>
			<div
				style={{
					position: `absolute`,
					top: margin.top / 2 - 10,
					width: `100%`,
					display: `flex`,
					justifyContent: `center`,
					fontSize: `14px`,
				}}
			>
				<LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0" />
			</div>
		</div>
	)
}
