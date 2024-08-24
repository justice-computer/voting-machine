import "./userBar.css"

import { useI, useO } from "atom.io/react"
import { useState } from "react"

import ElectionManager from "~/src/components/ElectionManager/ElectionManager"
import Modal from "~/src/components/Modal/Modal"
import { logout, myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { modalViewAtom } from "~/src/lib/view"

import Logout from "../../Logout/Logout"

function UserBar(): JSX.Element {
	const myself = useO(myselfSelector)
	const [showLogout, setShowLogout] = useState(false)
	const currentElection = useO(currentElectionAtom)
	const modalView = useO(modalViewAtom)
	const setModalView = useI(modalViewAtom)

	return (
		<div className="UserBar">
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setModalView(`managing-elections`)
					}}
				>
					<img src="./switch-icon.svg" alt="change" />
					{currentElection.name && <p style={{ marginLeft: `10px` }}>{currentElection.name}</p>}
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
					handleLogout={() => {
						logout()
					}}
					cancelLogout={() => {
						setShowLogout(false)
					}}
				/>
			</Modal>
			<Modal
				isOpen={modalView === `managing-elections`}
				onClose={() => {
					setModalView(null)
				}}
				title={`Election` + (currentElection.name ? `: ${currentElection.name}` : ``)}
			>
				<ElectionManager
					close={() => {
						setModalView(null)
					}}
				/>
			</Modal>
			<div className="user">
				<h2>{myself?.username}</h2>
				<button
					type="button"
					onClick={() => {
						setShowLogout(true)
					}}
				>
					<img src={myself?.avatar ?? `./avatar.png`} alt="avatar" />
				</button>
			</div>
		</div>
	)
}

export default UserBar
