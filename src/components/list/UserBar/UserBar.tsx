import "./userBar.css"

type UserBarProps = {
	turnOnAdminMode: () => void
}

function UserBar({ turnOnAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()


	function handleAdmin() {
		turnOnAdminMode()
	}

	return (
}

export default UserBar
