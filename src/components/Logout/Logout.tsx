import "./logout.css"

type LogoutProps = {
	handleLogout: () => void
	cancelLogout: () => void
}

function Logout({ handleLogout, cancelLogout }: LogoutProps): JSX.Element {
	return (
		<div className="logout">
			<h1>Do you want to log out?</h1>
			<div className="logout-icons">
				<button type="button" onClick={handleLogout}>
					<img src="./power-off-icon.svg" alt="logout" />
					<h2>yes</h2>
				</button>
				<button type="button" onClick={cancelLogout}>
					<img src="./cancel-icon.svg" alt="cancel" />
					<h2>no</h2>
				</button>
			</div>
		</div>
	)
}

export default Logout
