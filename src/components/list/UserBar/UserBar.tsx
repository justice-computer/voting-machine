import "./userBar.css"

import { useUserStore } from "../../../lib/userStore"

type UserBarProps = {
	turnOnAdminMode: () => void
}

function UserBar({ turnOnAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()

	function handleLogout() {
		logout()
	}

	function handleAdmin() {
		turnOnAdminMode()
	}

	return (
		<div className="UserBar">
			<div className="user">
				<img src={currentUser?.avatar ?? `./avatar.png`} alt="avatar" />
				<h2>{currentUser?.username}</h2>
			</div>
			<div className="icons">
				<button type="button" onClick={handleLogout}>
					<img src="./power-off-icon.svg" alt="logout" />
				</button>
				{currentUser?.admin && (
					<button type="button" onClick={handleAdmin}>
						<img src="./gear-icon.svg" alt="admin" />
					</button>
				)}
				<img src="./edit.png" alt="edit" />
			</div>
		</div>
	)
}

export default UserBar
