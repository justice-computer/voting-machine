import { atom, getState, setState, transaction } from "atom.io"
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore"

import type { ElectionData } from "../types"
import { myselfSelector } from "./auth"
import { db } from "./firebase"
import { actualVoteSelectors, serializedVoteAtoms } from "./votes"

function deepEqual(obj1: any, obj2: any) {
	if (obj1 === obj2) return true

	if (typeof obj1 !== `object` || obj1 === null || typeof obj2 !== `object` || obj2 === null) {
		return false
	}

	const keys1 = Object.keys(obj1)
	const keys2 = Object.keys(obj2)

	if (keys1.length !== keys2.length) return false

	for (const key of keys1) {
		if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
			return false
		}
	}

	return true
}

export const currentElectionAtom = atom<ElectionData>({
	key: `currentElection`,
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
		function startup({ setSelf }) {
			getDocs(collection(db, `elections`))
				.then((elections) => {
					const electionsData = elections.docs.map((election) => {
						const electionData = election.data() as ElectionData
						return {
							...electionData,
							id: election.id,
						}
					})
					// @ts-expect-error ts doesn't realize that Dates support arithmetic
					const sortedElections = electionsData.sort((a, b) => b.createdAt - a.createdAt)

					// Pick the newest election, unless there is one stored in localStorage
					const storedElectionId = localStorage.getItem(`electionId`)
					if (storedElectionId) {
						const storedElection = sortedElections.find(
							(election) => election.id === storedElectionId,
						)
						if (storedElection) {
							console.log(`using stored election ${storedElection.id}`)
							setSelf(storedElection)
						}
					} else {
						console.log(`using election`, sortedElections[0])
						setSelf({ ...sortedElections[0], id: sortedElections[0].id })
						localStorage.setItem(`electionId`, sortedElections[0].id)
						console.log(`auto-selecting election ${sortedElections[0].name}`)
					}
				})
				.catch((error) => {
					console.error(error)
				})
		},
		function onChange({ setSelf, onSet }) {
			let unSub: (() => void) | undefined
			onSet(({ oldValue, newValue }) => {
				if (deepEqual(oldValue, newValue)) {
					return
				}
				setSelf(newValue)
				unSub?.()
				if (newValue === null) {
					return
				}
				unSub = onSnapshot(doc(db, `elections`, newValue.id), (snapshot) => {
					const election = snapshot.data() as ElectionData
					setSelf({ ...election, id: newValue.id })
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
		const currentElection = get(currentElectionAtom)
		const myId = get(myselfSelector)?.id
		if (!myId) {
			console.error(`Attempted to join an election but you are not logged in`)
			return
		}
		if (currentElection.users.includes(myId)) {
			console.error(`Attempted to join an election but you are already in it`)
			return
		}
		set(currentElectionAtom, {
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
