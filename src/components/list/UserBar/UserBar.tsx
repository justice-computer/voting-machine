import "./userBar.css"

import { useUserStore } from "../../../lib/userStore"

type UserBarProps = {
	toggleAdminMode: () => void
}

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()

	function handleLogout() {
		logout()
	}

	function handleAdmin() {
		toggleAdminMode()
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
			</div>
		</div>
	)
}

export default UserBar
