import { atomFamily, selector } from "atom.io"
import { collection, doc, onSnapshot } from "firebase/firestore"

import type { Candidate } from "../types"
import { currentElectionAtom } from "./election"
import { db } from "./firebase"

export const candidateIndexAtoms = atomFamily<string[], string>({
	key: `candidateIndex`,
	default: [],
	effects: (electionLabel) => [
		({ setSelf }) => {
			// TODO: If we were smart, we would send the label as a firebase query param
			const unSub = onSnapshot(collection(db, `candidates`), ({ docs }) => {
				const candidateDocs = docs
					.map((candidateSnapshot) => {
						return {
							id: candidateSnapshot.id,
							...candidateSnapshot.data(),
						} as Candidate
					})
					.filter((candidate) => candidate.label === electionLabel)
				setSelf(candidateDocs.map((candidate) => candidate.id).filter((id) => id !== undefined))
			})
			return unSub
		},
	],
})

export const candidateAtoms = atomFamily<Candidate, string>({
	key: `candidates`,
	default: (id) => ({
		id,
		type: `candidate`,
		name: `NO_NAME`,
		heading: `NO_HEADING`,
		details: `NO_DETAILS`,
		label: `NO_LABEL`,
		status: `running`,
	}),
	effects: (id) => [
		({ setSelf }) => {
			const unSub = onSnapshot(doc(db, `candidates`, id), (snapshot) => {
				const candidate = snapshot.data() as Candidate
				const loadedAvatar = new Image()
				loadedAvatar.src = candidate.avatar ?? `./avatar.png`
				setSelf({ ...candidate, loadedAvatar })
			})
			return unSub
		},
	],
})

export const candidatesInCurrentElectionSelector = selector<Candidate[]>({
	key: `candidatesInCurrentElection`,
	get: ({ get, find }) => {
		const currentElection = get(currentElectionAtom)
		if (!currentElection.id) {
			return []
		}
		const candidateIds = get(find(candidateIndexAtoms, currentElection.label))
		return candidateIds.map((id) => {
			const candidate = get(find(candidateAtoms, id))
			return candidate
		})
	},
})
