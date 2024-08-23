import { atomFamily, getState } from "atom.io"
import { doc, onSnapshot, setDoc } from "firebase/firestore"

import type { SystemUser } from "../types"
import { myselfSelector } from "./auth"
import { db } from "./firebase"

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
				if (snapshot.exists()) {
					const user = snapshot.data() as SystemUser
					setSelf(user)
				}
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
