import { doc, getDoc } from "firebase/firestore"
import { create } from "zustand"

import type { SystemUser } from "../types"
import { db } from "./firebase"

type UserStore = {
	currentUser: SystemUser | null
	isLoading: boolean
	fetchUserInfo: (uid: string | undefined) => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
	currentUser: null,
	isLoading: true,
	fetchUserInfo: async (uid: string | undefined) => {
		if (!uid) {
			set({ currentUser: null, isLoading: false })
			return
		}
		try {
			const userDoc = await getDoc(doc(db, `users`, uid))
			if (userDoc.exists()) {
				const userSnap = userDoc.data()
				const currentUser: SystemUser = {
					admin: userSnap.admin,
					id: userDoc.id,
					email: userSnap.email,
					username: userSnap.username,
					avatar: userSnap.avatar,
				}
				set({ currentUser, isLoading: false })
			} else {
				set({ currentUser: null, isLoading: false })
			}
		} catch (error) {
			console.error(error)
		}
	},
}))
