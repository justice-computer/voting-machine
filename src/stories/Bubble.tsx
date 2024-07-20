import type { WritableToken } from "atom.io"
import { useI, useO } from "atom.io/react"
import { motion } from "framer-motion"
import { useId } from "react"

import scss from "./Bubble.module.scss"

export type BubblePropsCore = {
	label?: string
	height?: number | string
	width?: number | string
}

export type BubbleStateTokenized = {
	checkedState: WritableToken<boolean>
}

export type BubbleState = {
	checked: boolean
	setChecked: (checked: boolean) => void
}

export type BubbleProps = BubblePropsCore & (BubbleState | BubbleStateTokenized)

export type BubbleProps_INTERNAL = BubblePropsCore & BubbleState & { id: string }

function Bubble_INTERNAL(props: BubbleProps_INTERNAL): JSX.Element {
	const { id, checked, setChecked, height = 20, width = 20 } = props
	return (
		<label className={scss.class} htmlFor={`${id}-checkbox`} style={{ height, width }}>
			<input
				type="checkbox"
				id={`${id}-checkbox`}
				checked={checked}
				onChange={(e) => {
					setChecked(e.target.checked)
				}}
			/>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
				<title>scribble</title>
				{checked ? (
					<motion.path
						d="M8.06,13.37c-.59-.43-1.11-.98-1.5-1.6-.16-.26-.31-.53-.37-.83-.07-.33-.05-.67-.02-1.01.06-.75.11-1.51.36-2.21s.73-1.37,1.42-1.66c.39-.17.83-.2,1.26-.18.73.03,1.44.21,2.15.39.32.08.64.17.92.34s.51.43.73.68c.14.16.28.32.37.52.09.18.12.38.16.57.12.67.18,1.36.2,2.04.02.73-.05,1.52-.55,2.05-.6.65-1.59.68-2.43.94-.42.13-.85.33-1.27.22-.17-.04-.33-.14-.48-.23-.46-.29-.92-.59-1.36-.92-.33-.24-.65-.5-.86-.84-.27-.46-.3-1.03-.19-1.55s.36-1,.62-1.47c.38-.69.86-1.42,1.62-1.6.49-.12,1.01.03,1.5.17.36.11.73.22,1.08.38.47.21.93.51,1.16.97.16.32.2.68.2,1.04,0,1.03-.33,2.06-.97,2.87s-1.61,1.36-2.63,1.42c-.18.01-.36,0-.52-.06-.17-.07-.3-.19-.43-.32-.2-.19-.41-.39-.56-.63-.21-.32-.32-.7-.42-1.07-.37-1.3-.74-2.62-.72-3.97,0-.51.09-1.05.42-1.43.41-.46,1.07-.57,1.69-.61,1.02-.07,2.11-.03,2.94.57.47.34.81.84,1.14,1.33.19.29.39.58.48.91.1.37.06.75,0,1.13-.22,1.24-.75,2.43-1.54,3.42-.21.26-.47.53-.8.55-.14,0-.27-.03-.4-.07-1.1-.34-2.15-.86-3.08-1.54-.24-.17-.47-.36-.61-.63-.14-.28-.16-.6-.14-.91.06-1.07.47-2.09.9-3.07.06-.14.12-.28.23-.39.21-.21.53-.24.82-.25,1.58-.06,3.16.15,4.67.61.09.03.17.05.25.11.09.07.14.18.18.29.11.34.06.71,0,1.07-.13.78-.32,1.55-.56,2.3-.17.54-.38,1.07-.66,1.56-.3.53-.75,1.05-1.36,1.15-.35.06-.71-.03-1.05-.13-.47-.14-.93-.3-1.38-.49-.49-.2-.99-.45-1.32-.86-.36-.45-.49-1.04-.51-1.62-.04-1.31.47-2.62,1.39-3.56.17-.17.35-.34.58-.41.37-.13.77,0,1.13.16.75.36,1.39.94,1.82,1.65.14.23.26.48.3.75.06.34,0,.69-.09,1.02-.13.55-.31,1.1-.64,1.56s-.82.83-1.37.9c-.14.02-.29.02-.43-.03-.25-.09-.42-.34-.54-.58-.36-.7-.53-1.48-.7-2.25-.15-.69-.3-1.38-.45-2.07-.04-.16-.07-.34.02-.48.07-.11.19-.17.32-.2.61-.2,1.28-.08,1.91.07.39.09.77.19,1.12.37s.66.47.81.83c.07.18.11.38.1.57-.02.28-.12.55-.24.8-.21.46-.46.9-.74,1.31-.29.42-.66.84-1.16.94-.32.06-.64-.01-.95-.09-.27-.06-.53-.13-.77-.26s-.45-.34-.53-.6c-.06-.21-.03-.43,0-.65.04-.32.09-.64.13-.96.05-.37.1-.75.28-1.08s.5-.61.88-.62c.23,0,.46.09.66.2.83.46,1.43,1.22,2,1.98.13.17.25.33.34.53.21.47.13,1.03-.06,1.5-.12.29-.28.57-.52.77-.2.16-.44.27-.69.33-.43.12-.9.13-1.31-.05-.53-.24-.86-.79-1.03-1.35-.37-1.23-.01-2.71,1.03-3.46.25-.18.54-.32.85-.29.21.02.4.1.59.19.42.2.88.43,1.06.86.13.33.07.7-.01,1.04-.08.32-.17.63-.35.9-.27.39-.74.63-1.22.66s-.96-.13-1.34-.42c-.42-.32-.73-.82-.74-1.35-.01-.79.63-1.47,1.36-1.76.34-.14.72-.22,1.08-.13.43.1.77.42,1.08.73.18.18.36.37.44.62.11.33.01.68-.08,1.01-.13.45-.26.91-.48,1.32-.19.36-.52.72-.93.73-.16,0-.32-.05-.47-.1-.7-.23-1.39-.47-2.09-.7-.06-.02-.11-.04-.15-.08-.03-.03-.05-.07-.06-.11-.15-.39-.09-.84.07-1.22s.41-.73.66-1.06c.27-.37.55-.74.9-1.02.06-.05.12-.09.19-.1.09-.01.18.03.26.08.41.23.81.45,1.22.68.35.2.71.4,1.01.67.45.41.74,1,.75,1.61s-.29,1.22-.81,1.55c-.19.12-.41.21-.63.29l-1.71.64c-.11.04-.22.08-.34.07-.18-.01-.32-.14-.45-.26-.55-.51-1.14-1.1-1.19-1.85-.01-.23.02-.45.07-.67.18-.92.55-1.9,1.37-2.36.19-.11.41-.18.62-.16s.43.14.53.33c.15.32-.07.69-.31.95-.05.05-.11.11-.18.12-.1.02-.2-.07-.24-.16s-.03-.21-.02-.31c.28-.09.55.16.72.4.3.42.54.89.71,1.38.07.21.13.45.05.66-.13.34-.54.47-.9.51-.66.08-1.34.02-1.98-.16-.07-.02-.15-.05-.21-.1-.1-.09-.12-.23-.11-.36.02-.87.7-1.58,1.43-2.05.27-.17.56-.33.88-.38s.67.03.89.27c.3.33.21.93-.17,1.17-.18.11-.4.14-.61.14-.51,0-1.02-.19-1.38-.56-.1-.11-.19-.24-.16-.39.02-.11.11-.2.21-.25.26-.14.59-.13.86,0s.49.33.68.56c.13.17.25.35.3.56.08.35-.04.71-.16,1.04-.02.06-.05.13-.1.16-.05.03-.11.03-.16.02-.42-.04-.82-.27-1.06-.62s-.31-.8-.2-1.21c.03-.11.07-.21.15-.3.19-.22.53-.23.82-.22.34,0,.71.02.98.23.34.26.43.73.49,1.15.06.41.08.91-.26,1.17-.27.2-.64.14-.95.04-.43-.14-.84-.34-1.25-.55-1.03-.53-2.06-1.08-2.97-1.8-.21-.16-.42-.36-.46-.62-.03-.23.08-.45.25-.61s.38-.25.59-.34c.29-.12.59-.21.9-.29.17-.04.34-.08.51-.06.21.01.41.1.61.19.3.15.59.32.86.51.11.08.21.16.28.27.06.1.09.22.12.34.13.65.14,1.42-.37,1.85"
						variants={{
							hidden: {
								pathLength: 0,
								fill: `rgba(255, 255, 255, 0)`,
							},
							visible: {
								pathLength: 1,
								fill: `rgba(255, 255, 255, 1)`,
							},
						}}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={{ duration: 1 }}
					/>
				) : null}
			</svg>
		</label>
	)
}

function warn() {
	console.warn(`No setChecked provided`)
}
export function Bubble(props: BubbleProps): JSX.Element {
	let checked = false
	let setChecked: (value: boolean) => void = warn
	if (`checked` in props) {
		setChecked = props.setChecked
		checked = props.checked
	} else {
		setChecked = useI(props.checkedState)
		checked = useO(props.checkedState)
	}
	const id = useId()
	return <Bubble_INTERNAL checked={checked} setChecked={setChecked} id={id} />
}
