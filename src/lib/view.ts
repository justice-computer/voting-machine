import { atom, selector } from "atom.io"

import { myselfSelector } from "./auth"
import { currentElectionAtom } from "./election"
import { actualVoteSelectors } from "./votes"

export type ModalView = `admin` | `managing-auth` | `managing-elections`
export const modalViewAtom = atom<ModalView | null>({
	key: `modalView`,
	default: null,
})

export type View = `closed` | `not-started` | `voted` | `voting`
export const viewSelector = selector<View>({
	key: `view`,
	get: ({ get }) => {
		const myself = get(myselfSelector)
		if (!myself) {
			return `not-started`
		}
		// const modalView = get(modalViewAtom)
		// if (myself.admin && modalView === `admin`) {
		// 	return `admin`
		// }
		// if (modalView) {
		// 	return modalView
		// }
		const myVote = get(actualVoteSelectors, myself.id)
		const currentElection = get(currentElectionAtom)
		if (myVote.finished) {
			return `voted`
		}
		return currentElection.state
	},
})
