import { atomFamily, getState, selectorFamily } from "atom.io"
import { parseJson, stringifyJson } from "atom.io/json"
import { doc, onSnapshot, setDoc } from "firebase/firestore"

import type { ActualVote, SerializedVote } from "../types"
import { myselfSelector } from "./auth"
import { db } from "./firebase"

/**
 * We don't want to tell Firebase what it just told us, so we're blocking
 * the onSet calls once when we get a new value from Firebase.
 * - @jeremybanka
 */
const serializedVoteAtomsGate: Record<string, boolean> = {}
export const serializedVoteAtoms = atomFamily<SerializedVote, string>({
	key: `serializedVote`,
	default: {
		voterId: ``,
		electionId: ``,
		finished: false,
		tierList: stringifyJson([] satisfies string[][]),
	},
	effects: (userId) => [
		({ setSelf }) => {
			const unSub = onSnapshot(doc(db, `votes`, userId), (snapshot) => {
				if (snapshot.exists()) {
					const vote = snapshot.data() as SerializedVote
					serializedVoteAtomsGate[userId] = true
					setSelf(vote)
				}
			})
			return unSub
		},
		({ onSet }) => {
			onSet(async ({ newValue }) => {
				if (serializedVoteAtomsGate[userId]) {
					serializedVoteAtomsGate[userId] = false
					return
				}
				const myId = getState(myselfSelector)?.id
				if (userId === myId) {
					await setDoc(doc(db, `votes`, newValue.voterId), newValue)
				} else {
					console.error(
						`Attempted to set serializedVote for ${newValue.voterId} but you are ${myId}`,
					)
				}
			})
		},
	],
})

export const actualVoteSelectors = selectorFamily<ActualVote, string>({
	key: `actualVote`,
	get:
		(userId) =>
		({ get }) => {
			const serializedVote = get(serializedVoteAtoms, userId)
			const actualVote: ActualVote = {
				...serializedVote,
				voterId: userId,
				tierList: parseJson(serializedVote.tierList),
			}
			return actualVote
		},
	set:
		(userId) =>
		({ get, set }, newValue) => {
			const myId = get(myselfSelector)?.id
			if (userId === myId) {
				set(serializedVoteAtoms, userId, {
					...newValue,
					tierList: stringifyJson(newValue.tierList),
				})
			} else {
				console.error(`Attempted to set actualVote for ${newValue.voterId} but you are ${myId}`)
			}
		},
})
