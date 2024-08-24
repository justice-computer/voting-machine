import { atom, selector, setState } from "atom.io"
import * as FirebaseAuth from "firebase/auth"

import type { SystemUser } from "../types"
import { auth } from "./firebase"
import { systemUserAtoms } from "./users"

export type AuthStatus =
	| { authenticated: false; loading: boolean }
	| { authenticated: true; loading: false; myself: FirebaseAuth.User }
export const myAuthStatusAtom = atom<AuthStatus>({
	key: `myAuthStatus`,
	default: { authenticated: false, loading: true },
	effects: [
		({ setSelf }) => {
			const unSub = FirebaseAuth.onAuthStateChanged(auth, (myFirebaseUser) => {
				if (myFirebaseUser) {
					setSelf({ authenticated: true, loading: false, myself: myFirebaseUser })
				} else {
					setSelf({ authenticated: false, loading: false })
				}
			})
			return unSub
		},
	],
})
export const myselfSelector = selector<SystemUser | null>({
	key: `myself`,
	get: ({ get }) => {
		const myAuthStatus = get(myAuthStatusAtom)
		if (myAuthStatus.authenticated) {
			const myself = get(systemUserAtoms, myAuthStatus.myself.uid)
			return myself
		}
		return null
	},
})
export function logout(): void {
	void FirebaseAuth.signOut(auth).then(() => {
		setState(myAuthStatusAtom, { authenticated: false, loading: false })
	})
}
