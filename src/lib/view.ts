import { atom, selector } from "atom.io"

import type { Candidate } from "../types"
import { myselfSelector } from "./auth"
import { currentElectionAtom } from "./election"
import { actualVoteSelectors } from "./votes"

export type ModalView =
	| `admin`
	| `candidate-detail`
	| `managing-auth`
	| `managing-elections`
	| `new-election`
export const modalViewAtom = atom<ModalView | null>({
	key: `modalView`,
	default: null,
})

export const candidateDetailViewAtom = atom<Candidate | null>({
	key: `candidateDetailView`,
	default: null,
})

export type View = `closed` | `not-started` | `voted` | `voting`
export const viewSelector = selector<View>({
	key: `view`,
	get: ({ get }) => {
		const myself = get(myselfSelector)
		if (!myself) {
			console.log(`viewSelector: no myself`)
			return `not-started`
		}
		const myVote = get(actualVoteSelectors, myself.id)
		const currentElection = get(currentElectionAtom)
		if (myVote.finished) {
			console.log(`viewSelector: voted`)
			return `voted`
		}
		console.log(`viewSelector: ${currentElection.state}`)
		return currentElection.state
	},
})
