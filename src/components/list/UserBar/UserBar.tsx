import "./userBar.css"

import { useI, useO } from "atom.io/react"
import { deleteDoc, doc } from "firebase/firestore"
import { useState } from "react"

import ElectionManager from "~/src/components/ElectionManager/ElectionManager"
import Modal from "~/src/components/Modal/Modal"
import { currentElectionIdAtom, electionAtom } from "~/src/lib/atomStore"
import { db } from "~/src/lib/firebase"
import { useUserStore } from "~/src/lib/userStore"

import Logout from "../../Logout/Logout"

type UserBarProps = {
	toggleAdminMode: () => void
}

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()
	const [showLogout, setShowLogout] = useState(false)
	const [showElectionManager, setShowElectionManager] = useState(false)
	const setCurrentElectionId = useI(currentElectionIdAtom)
	const election = useO(electionAtom)

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
		// FIXME
		// SIDE EFFECT: useEffect in StateRouter will update the election state
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
					{election.name && <p style={{ marginLeft: `10px` }}>{election.name}</p>}
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
				title={`Election` + (election.name ? `: ${election.name}` : ``)}
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
