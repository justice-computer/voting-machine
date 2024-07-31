import type { Stringified } from "atom.io/json"
export type SystemUser = {
	admin?: boolean
	username: string
	email: string | null
	avatar?: string
	id: string
}

export type Candidate =
	| {
			id: string
			name: string
			avatar?: string
			heading: string
			details: string
			label: string
	  }
	| {
			id: undefined
			name: string
			avatar?: string
			heading: string
			details: string
			label: string
	  }

export type AvatarImage = {
	file: File | null
	url: string
}

export type ElectionState = `closed` | `not-started` | `voted` | `voting`

export type ElectionData = {
	id: string
	name: string
	state: ElectionState
	createdAt: Date
	createdBy: string
	users: string[]
	label: string
	title: string
	subtitle: string
}

export type ActualVote = {
	voterId: string
	electionId: string
	tierList: string[][]
	finished: boolean
}

export type SerializedVote = {
	voterId: string
	electionId: string
	tierList: Stringified<string[][]>
	finished: boolean
}
