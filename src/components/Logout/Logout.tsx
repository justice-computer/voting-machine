import "./logout.css"

import { useI } from "atom.io/react"

import { modalViewAtom } from "~/src/lib/view"

type LogoutProps = {
	handleLogout: () => void
}

function Logout({ handleLogout }: LogoutProps): JSX.Element {
	const setModalView = useI(modalViewAtom)

	return (
		<div className="logout">
			<h1>Do you want to log out?</h1>
			<div className="logout-icons">
				<button type="button" onClick={handleLogout}>
					<img src="./power-off-icon.svg" alt="logout" />
					<h2>yes</h2>
				</button>
				<button
					type="button"
					onClick={() => {
						setModalView(null)
					}}
				>
					<img src="./cancel-icon.svg" alt="cancel" />
					<h2>no</h2>
				</button>
			</div>
		</div>
	)
}

export default Logout
