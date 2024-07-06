import { onAuthStateChanged } from "firebase/auth"
import { useEffect } from "react"

import Login from "./components/Login/Login"
import Notification from "./components/Notification/Notification"
import StateRouter from "./components/StateRouter/StateRouter"
import SystemErrorBoundary from "./components/SystemErrorBoundary/SystemErrorBoundary"
import { auth } from "./lib/firebase"
import { useUserStore } from "./lib/userStore"

const App = (): JSX.Element => {
	const { currentUser, isLoading, fetchUserInfo } = useUserStore()
	useEffect(() => {
		const unSub = onAuthStateChanged(auth, async (newUser) => {
			await fetchUserInfo(newUser?.uid)
		})
		return unSub
	}, [fetchUserInfo])

	if (isLoading) return <div className="loading">Loading...</div>

	return (
		<div className="container">
			<SystemErrorBoundary>
				{currentUser ? <StateRouter /> : <Login />}
				<Notification />
			</SystemErrorBoundary>
		</div>
	)
}

export default App
