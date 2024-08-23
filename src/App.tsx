import { useO } from "atom.io/react"

import Login from "./components/Login/Login"
import Notification from "./components/Notification/Notification"
import StateRouter from "./components/StateRouter/StateRouter"
import SystemErrorBoundary from "./components/SystemErrorBoundary/SystemErrorBoundary"
import { myAuthStatusAtom } from "./lib/atomStore"

const App = (): JSX.Element => {
	const myAuthStatus = useO(myAuthStatusAtom)

	if (myAuthStatus.loading) return <div className="loading">Loading...</div>

	return (
		<SystemErrorBoundary>
			{myAuthStatus.authenticated ? <StateRouter /> : <Login />}
			<Notification />
		</SystemErrorBoundary>
	)
}

export default App

// CACHE IMAGES IN SERVICE WORKER
if (`serviceWorker` in navigator) {
	window.addEventListener(`load`, () => {
		navigator.serviceWorker.register(`/image-caching-worker.js`).then(
			(registration) => {
				console.log(`ServiceWorker registration successful with scope: `, registration.scope)
			},
			(error) => {
				console.log(`ServiceWorker registration failed: `, error)
			},
		)
	})
}
