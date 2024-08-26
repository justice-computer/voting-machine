import { AxisBottom, AxisLeft } from "@visx/axis"
import { Group } from "@visx/group"
import { LegendOrdinal } from "@visx/legend"
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale"
import { BarStackHorizontal } from "@visx/shape"

import type { GraphableCandidateVote } from "~/src/types"

type TierName = `t1` | `t2` | `t3` | `t4` | `t5` | `t6`

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

const TEST_DATA: GraphableCandidateVote[] = [
	{ id: `Joe`, t1: 13, t2: 12, t3: 1, t4: 0, t5: 0, t6: 0 },
	{ id: `Ralph`, t1: 19, t2: 1, t3: 0, t4: 32, t5: 0, t6: 1 },
	{ id: `Sally`, t1: 0, t2: 2, t3: 21, t4: 1, t5: 0, t6: 1 },
	{ id: `Martha`, t1: 0, t2: 10, t3: 1, t4: 11, t5: 2, t6: 1 },
	{ id: `Martinez`, t1: 11, t2: 1, t3: 1, t4: 90, t5: 1, t6: 1 },
	{ id: `Gretchen`, t1: 20, t2: 0, t3: 1, t4: 1, t5: 2, t6: 1 },
]

const data = TEST_DATA
const keys = Object.keys(data[0]).filter((d) => d !== `id`) as TierName[]

const tierTotals = data.reduce((allTotals, currentCandidate) => {
	const totalVotes = keys.reduce((tierTotal, k) => {
		tierTotal += Number(currentCandidate[k])
		return tierTotal
	}, 0)
	allTotals.push(totalVotes)
	return allTotals
}, [] as number[])

// accessors
const getName = (d: GraphableCandidateVote) => d.id

console.log(`------XXXXXXXXXXXXXXXXX--------`)
console.log(tierTotals)
console.log(`------XXXXXXXXXXXXXXXXX--------`)
// scales
const tierScale = scaleLinear<number>({
	domain: [0, Math.max(...tierTotals)],
	nice: true,
})
const nameScale = scaleBand<string>({
	domain: data.map(getName),
	padding: 0.2,
})
const colorScale = scaleOrdinal<TierName, string>({
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
	// console.log(data)

	tierScale.rangeRound([0, xMax])
	nameScale.rangeRound([yMax, 0])

	return width < 10 ? null : (
		<div>
			<svg width={width} height={height}>
				<title>Horizontal Stacked Bar Chart</title>
				<rect width={width} height={height} fill={background} rx={14} />
				<Group top={margin.top} left={margin.left}>
					<BarStackHorizontal<GraphableCandidateVote, TierName>
						data={data}
						keys={keys}
						height={yMax}
						y={getName}
						xScale={tierScale}
						yScale={nameScale}
						color={colorScale}
					>
						{(barStacks) => {
							return barStacks.map((barStack) => {
								// console.log(JSON.stringify(barStack, null, 2))
								return barStack.bars.map((bar) => (
									<rect
										key={`barstack-horizontal-${barStack.index}-${bar.index}`}
										x={bar.x}
										y={bar.y}
										width={bar.width}
										height={bar.height}
										fill={bar.color}
									/>
								))
							})
						}}
					</BarStackHorizontal>
					<AxisLeft
						hideAxisLine
						hideTicks
						scale={nameScale}
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
						scale={tierScale}
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
