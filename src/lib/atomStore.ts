import { atom, atomFamily, getState, selector, subscribe } from "atom.io"
import * as FirebaseAuth from "firebase/auth"
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore"

import type { Candidate, ElectionData, SerializedVote, SystemUser } from "../types"
import { auth, db } from "./firebase"

export const currentElectionIdAtom = atom<string | null>({
	key: `currentElectionId`,
	default: null,
})

export const currentElectionLabelAtom = atom<string | null>({
	key: `currentElectionLabel`,
	default: null,
})

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

export type MyFirebaseUser = FirebaseAuth.User | { unauthenticated: true; loading: boolean }
export const myFirebaseUserAtom = atom<MyFirebaseUser>({
	key: `myFirebaseUser`,
	default: { unauthenticated: true, loading: true },
	effects: [
		({ setSelf }) => {
			const unSub = FirebaseAuth.onAuthStateChanged(auth, (myFirebaseUser) => {
				if (myFirebaseUser) {
					setSelf(myFirebaseUser)
				} else {
					setSelf({ unauthenticated: true, loading: false })
				}
			})
			return unSub
		},
	],
})

export const myselfSelector = selector<SystemUser | null>({
	key: `myself`,
	get: ({ get }) => {
		const myFirebaseUser = get(myFirebaseUserAtom)
		if (`unauthenticated` in myFirebaseUser) {
			return null
		}
		const myself = get(systemUserAtoms, myFirebaseUser.uid)
		return myself
	},
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
		const currentElectionLabel = get(currentElectionLabelAtom)
		if (currentElectionLabel === null) {
			return []
		}
		const candidateIds = get(find(candidateIndexAtoms, currentElectionLabel))
		return candidateIds.map((id) => {
			const candidate = get(find(candidateAtoms, id))
			return candidate
		})
	},
})

export const systemUserAtoms = atomFamily<SystemUser, string>({
	key: `systemUser`,
	default: (id) => ({
		id,
		username: ``,
		email: ``,
		avatar: ``,
	}),
	effects: (id) => [
		({ setSelf }) => {
			const unSub = onSnapshot(doc(db, `users`, id), (snapshot) => {
				const user = snapshot.data() as SystemUser
				setSelf(user)
			})
			return unSub
		},
		({ onSet }) => {
			onSet(async ({ newValue, oldValue }) => {
				if (oldValue.id === getState(myselfSelector)?.id) {
					await setDoc(doc(db, `users`, newValue.id), newValue, { merge: true })
				}
			})
		},
	],
})

export const voterIsFinishedAtoms = atomFamily<boolean, string>({
	key: `voterIsFinished`,
	default: false,
	effects: (id) => [
		({ setSelf }) => {
			const unSub = onSnapshot(doc(db, `votes`, id), (snapshot) => {
				const vote = snapshot.data() as SerializedVote
				setSelf(vote.finished)
			})
			return unSub
		},
	],
})
