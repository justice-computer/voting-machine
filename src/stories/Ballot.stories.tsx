/* eslint-disable quotes */
import type { Meta, StoryObj } from "@storybook/react"

import { BallotSheet } from "./Ballot"

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
	title: "Example/Ballot",
	component: BallotSheet,
	parameters: {
		// Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
		layout: "centered",
	},
	// This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
	tags: ["autodocs"],
} satisfies Meta<typeof BallotSheet>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
	args: {
		title: "General Election",
		// TODO: should this be called races?
		elections: [
			{
				name: "President of the United States of America",
				id: "potus",
				users: ["abc123"],
				candidates: [
					{
						name: "Jonathan Jimble",
						id: "jonathan-jimble",
						heading: ``,
						details: ``,
						label: ``,
					},
					{
						name: "Squiggly Miggly",
						id: "squiggly-miggly",
						heading: ``,
						details: ``,
						label: ``,
					},
					{
						name: "Mr. Frog",
						id: "mr-frog",
						heading: ``,
						details: ``,
						label: ``,
					},
				],
				config: {
					numberOfWinners: 1,
					votingTiers: [1, 1, 1, 1, 1, 1],
				},
			},
		],
	},
}
