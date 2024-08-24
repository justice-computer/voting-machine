import { atom, getState, setState, subscribe, transaction } from "atom.io"
import { doc, onSnapshot } from "firebase/firestore"

import type { ElectionData } from "../types"
import { myselfSelector } from "./auth"
import { db } from "./firebase"
import { actualVoteSelectors, serializedVoteAtoms } from "./votes"

export const currentElectionIdAtom = atom<string | null>({
	key: `currentElectionId`,
	default: null,
})

export const currentElectionLabelAtom = atom<string | null>({
	key: `currentElectionLabel`,
	default: null,
})

export const electionAtom = atom<ElectionData>({
	key: `election`,
	default: {
		id: ``,
		name: ``,
		state: `not-started`,
		createdAt: new Date(),
		createdBy: ``,
		users: [],
		label: ``,
		title: ``,
		subtitle: ``,
	},
	effects: [
		({ setSelf }) => {
			let unSub: (() => void) | undefined
			subscribe(currentElectionIdAtom, ({ newValue }) => {
				unSub?.()
				if (newValue === null) {
					return
				}
				unSub = onSnapshot(doc(db, `elections`, newValue), (snapshot) => {
					const election = snapshot.data() as ElectionData
					setSelf(election)
				})
			})
			return unSub
		},
	],
})

export function retractSubmittedBallot(): void {
	const myId = getState(myselfSelector)?.id
	if (!myId) {
		console.error(`Attempted to retract a ballot but you are not logged in`)
		return
	}
	const serializedVote = getState(serializedVoteAtoms, myId)
	if (serializedVote.finished) {
		setState(serializedVoteAtoms, myId, {
			...serializedVote,
			finished: false,
		})
	} else {
		console.error(`Attempted to retract a ballot that is not finished`)
	}
}

export const joinElectionTX = transaction<() => void>({
	key: `joinElection`,
	do: ({ get, set }) => {
		const currentElection = get(electionAtom)
		const myId = get(myselfSelector)?.id
		if (!myId) {
			console.error(`Attempted to join an election but you are not logged in`)
			return
		}
		if (currentElection.users.includes(myId)) {
			console.error(`Attempted to join an election but you are already in it`)
			return
		}
		set(electionAtom, {
			...currentElection,
			users: [...currentElection.users, myId],
		})
		set(actualVoteSelectors, myId, (current) => {
			return {
				...current,
				voterId: myId,
				electionId: currentElection.id,
			}
		})
	},
})
