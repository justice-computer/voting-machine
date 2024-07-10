import "./userBar.css"

import { useO } from "atom.io/react"
import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "~/src/lib/firebase"
import type { ElectionData } from "~/src/types"

import { currentElectionIdAtom } from "../../../lib/atomStore"
import { useUserStore } from "../../../lib/userStore"
import Logout from "../../Logout/Logout"

type UserBarProps = {
	toggleAdminMode: () => void
}

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()
	const [showLogout, setShowLogout] = useState(false)
	const currentElectionId = useO(currentElectionIdAtom)
	const [currentElectionName, setCurrentElectionName] = useState<string | null>(null)

	useEffect(() => {
		if (currentElectionId == null) return
		const unSub = onSnapshot(doc(db, `elections`, currentElectionId), (document) => {
			const electionData = document.data() as ElectionData
			setCurrentElectionName(electionData.name)
		})
		return unSub
	}, [currentElectionId])

	function handleLogout() {
		logout()
	}

	function handleAdmin() {
		toggleAdminMode()
	}

	return (
		<div className="UserBar">
			{showLogout ? (
				<Logout
					handleLogout={handleLogout}
					cancelLogout={() => {
						setShowLogout(false)
					}}
				/>
			) : null}
			<div className="user">
				<img src={currentUser?.avatar ?? `./avatar.png`} alt="avatar" />
				<h2>{currentUser?.username}</h2>
			</div>
			{currentElectionName && <h2>{currentElectionName}</h2>}
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setShowLogout(true)
					}}
				>
					<img src="./power-off-icon.svg" alt="logout" />
				</button>
				{currentUser?.admin && (
					<button type="button" onClick={handleAdmin}>
						<img src="./gear-icon.svg" alt="admin" />
					</button>
				)}
			</div>
		</div>
	)
}

export default UserBar
