import type { AtomToken, TokenType } from "atom.io"
import { useO } from "atom.io/react"

import type { candidateAtoms } from "~/src/lib/election-candidates"

import scss from "./CandidatePicture.module.scss"

export function CandidatePicture(props: {
	candidate: AtomToken<TokenType<typeof candidateAtoms>>
	size: `large` | `medium` | `small`
	height: [bigint, bigint]
	width: [bigint, bigint]
}): JSX.Element {
	let max = 10
	let min = 120
	switch (props.size) {
		case `large`:
			max = 10
			min = 120
			break
		case `medium`:
			max = 8
			min = 60
			break
		case `small`:
			max = 6
			min = 30
			break
	}
	const candidate = useO(props.candidate)

	return (
		<div
			data-candidate-picture
			className={scss.class}
			style={setCssVars({
				"--max": `${max}vmin`,
				"--min": `${min}px`,
				"--height-numerator": props.height[0].toString(),
				"--height-denominator": props.height[1].toString(),
				"--width-numerator": props.width[0].toString(),
				"--width-denominator": props.width[1].toString(),
			})}
		>
			<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
		</div>
	)
}
export const setCssVars = (
	vars: Record<`--${string}`, number | string>,
): Partial<React.CSSProperties> => vars as any
