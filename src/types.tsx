import type { stringified } from "atom.io/json"
export type SystemUser = {
	admin?: boolean
	username: string
	email: string | null
	avatar?: string
	id: string
}

export type Candidate = {
	id: string
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

export interface GraphableCandidateVote {
	name?: string
	id: string
	t1: number
	t2: number
	t3: number
	t4: number
	t5: number
	t6: number
}

export type ActualVote = {
	voterId: string
	electionId: string
	// 0th index is the first vote-tier.
	// For elections with one vote per tier
	// like Portland, each entry will be an array
	// of one candidate string.
	// -@peba Aug 2024
	tierList: string[][]
	finished: boolean
}

export type SerializedVote = {
	voterId: string
	electionId: string
	tierList: stringified<string[][]>
	finished: boolean
}
