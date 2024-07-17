import "./userBar.css"

import { useI, useO } from "atom.io/react"
import { deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import ElectionManager from "~/src/components/ElectionManager/ElectionManager"
import Modal from "~/src/components/Modal/Modal"
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
	const [showElectionManager, setShowElectionManager] = useState(false)
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
		setShowElectionManager(false)
		toggleAdminMode()
	}

	function handleChangeElection(id: string) {
		if (currentUser == null) return
		setCurrentElectionId(id)
		localStorage.setItem(`electionId`, id)
		const docRef = doc(db, `votes`, currentUser?.id)
		deleteDoc(docRef)
			.then(() => {
				setShowElectionManager(false)
			})
			.catch((error) => {
				console.error(error)
			})
	}

	return (
		<div className="UserBar">
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setShowElectionManager(true)
					}}
				>
					<img src="./switch-icon.svg" alt="change" />
					{currentElectionName && <p style={{ marginLeft: `10px` }}>{currentElectionName}</p>}
				</button>
			</div>
			<Modal
				isOpen={showLogout}
				onClose={() => {
					setShowLogout(false)
				}}
				title="Logout"
			>
				<Logout
					handleLogout={handleLogout}
					cancelLogout={() => {
						setShowLogout(false)
					}}
				/>
			</Modal>
			<Modal
				isOpen={showElectionManager}
				onClose={() => {
					setShowElectionManager(false)
				}}
				title={`Election` + (currentElectionName ? `: ${currentElectionName}` : ``)}
			>
				<ElectionManager
					handleChangeElection={handleChangeElection}
					handleAdmin={handleAdmin}
					close={() => {
						setShowElectionManager(false)
					}}
				/>
			</Modal>
			<div className="user">
				<h2>{currentUser?.username}</h2>
				<button
					type="button"
					onClick={() => {
						setShowLogout(true)
					}}
				>
					<img src={currentUser?.avatar ?? `./avatar.png`} alt="avatar" />
				</button>
			</div>
		</div>
	)
}

export default UserBar
