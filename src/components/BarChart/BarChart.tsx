import { AxisBottom, AxisLeft } from "@visx/axis"
import { Group } from "@visx/group"
import { scaleBand, scaleLinear } from "@visx/scale"
import { BarStackHorizontal } from "@visx/shape"
import { Text } from "@visx/text"
import type { ScaleBand, ScaleLinear } from "d3-scale"
import React from "react"

interface DataObject {
	[key: string]: number[]
}

const TEST_DATA: DataObject = {
	Joe: [13, 12, 1, 0, 0, 0],
	Ralph: [19, 1, 0, 32, 0, 1],
	Sally: [0, 2, 21, 1, 0, 1],
	Martha: [0, 10, 1, 11, 2, 1],
	Martinez: [11, 1, 1, 90, 1, 1],
	Gretchen: [20, 0, 1, 1, 2, 1],
}

const keys = [`value1`, `value2`, `value3`, `value4`, `value5`, `value6`]

const colors = [`#f52c2c`, `#f52c68`, `#f52ca5`, `#d42cf5`, `#8a2cf5`, `#2c2cf5`]

interface BarChartProps {
	width: number
	height: number
	data?: DataObject // Optional data prop
}

interface ChartData {
	key: string
	[key: string]: number | string
}

const BarChart: React.FC<BarChartProps> = ({ width, height, data = TEST_DATA }) => {
	const margin = { top: 40, right: 30, bottom: 50, left: 100 }
	const xMax = width - margin.left - margin.right
	const yMax = height - margin.top - margin.bottom

	const chartData: ChartData[] = Object.entries(data).map(([key, values]) => ({
		key,
		...Object.fromEntries(values.map((v, i) => [keys[i], v])),
	}))

	const yScale: ScaleBand<string> = scaleBand({
		domain: chartData.map((d) => d.key),
		padding: 0.2,
	}).rangeRound([0, yMax])

	const xScale: ScaleLinear<number, number> = scaleLinear<number>({
		domain: [0, Math.max(...Object.values(data).map((arr) => arr.reduce((a, b) => a + b, 0)))],
		nice: true,
	}).range([0, xMax])

	return (
		<svg width={width} height={height}>
			<title>Horizontal Stacked Bar Chart</title> {/* Accessible title */}
			<Group left={margin.left} top={margin.top}>
				<BarStackHorizontal<ChartData, string>
					data={chartData}
					keys={keys}
					y={(d) => d.key}
					xScale={xScale}
					yScale={yScale}
					color={(key) => colors[keys.indexOf(key)]}
				>
					{(barStacks) =>
						barStacks.map((barStack) =>
							barStack.bars.map((bar) => (
								<Group key={`bar-stack-${barStack.index}-${bar.index}`}>
									<rect
										x={bar.x}
										y={bar.y}
										width={bar.width}
										height={bar.height}
										fill={bar.color}
									/>
									<Text
										x={bar.x + bar.width + 5} // Position the label a bit to the right of the bar
										y={bar.y + bar.height / 2}
										verticalAnchor="middle"
										fill="#000"
									>
										{bar.key}
									</Text>
								</Group>
							)),
						)
					}
				</BarStackHorizontal>
				<AxisLeft scale={yScale} />
				<AxisBottom top={yMax} scale={xScale} />
			</Group>
		</svg>
	)
}

export default BarChart
