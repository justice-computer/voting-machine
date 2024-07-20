/* eslint-disable quotes */
import type { Meta, StoryObj } from "@storybook/react"

import { Ballot } from "./Ballot"

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
	title: "Example/Ballot",
	component: Ballot,
	parameters: {
		// Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
		layout: "centered",
	},
	// This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
	tags: ["autodocs"],
} satisfies Meta<typeof Ballot>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
	args: {
		title: "General Election",
		elections: [
			{
				displayName: "President of the United States of America",
				id: "potus",
				candidates: [
					{
						displayName: "Jonathan Jimble",
						id: "jonathan-jimble",
					},
					{
						displayName: "Squiggly Miggly",
						id: "squiggly-miggly",
					},
					{
						displayName: "Mr. Frog",
						id: "mr-frog",
					},
				],
				config: {
					numberOfWinners: 3n,
					votingTiers: [1n, 1n, 1n, 1n, 1n, 1n],
				},
			},
		],
	},
}
