import "./userBar.css"

import { useState } from "react"

import { useUserStore } from "../../../lib/userStore"
import Logout from "../../Logout/Logout"

type UserBarProps = {
	toggleAdminMode: () => void
}

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()
	const [showLogout, setShowLogout] = useState(false)

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
