import "./userBar.css"

import { useI, useO } from "atom.io/react"
import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import ChangeElection from "~/src/components/ChangeElection/ChangeElection"
import { currentElectionIdAtom } from "~/src/lib/atomStore"
import { db } from "~/src/lib/firebase"
import { useUserStore } from "~/src/lib/userStore"
import type { ElectionData } from "~/src/types"

import Logout from "../../Logout/Logout"

type UserBarProps = {
	toggleAdminMode: () => void
}

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()
	const [showLogout, setShowLogout] = useState(false)
	const [showChangeElection, setShowChangeElection] = useState(false)
	const [currentElectionName, setCurrentElectionName] = useState<string | null>(null)
	const currentElectionId = useO(currentElectionIdAtom)
	const setCurrentElectionId = useI(currentElectionIdAtom)

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

	function handleChangeElection(id: string) {
		setCurrentElectionId(id)
		localStorage.setItem(`electionId`, id)
		setShowChangeElection(false)
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
			{showChangeElection ? (
				<ChangeElection
					handleChangeElection={handleChangeElection}
					close={() => {
						setShowChangeElection(false)
					}}
				/>
			) : null}
			<div className="user">
				<img src={currentUser?.avatar ?? `./avatar.png`} alt="avatar" />
				<h2>{currentUser?.username}</h2>
			</div>
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setShowChangeElection(true)
					}}
				>
					<img src="./switch-icon.svg" alt="change" />
					{currentElectionName && <p style={{ marginLeft: `10px` }}>{currentElectionName}</p>}
				</button>
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
