import { useO } from "atom.io/react"

import CandidateDetail from "~/src/components/CandidateDetail/CandidateDetail"
import { currentElectionAtom } from "~/src/lib/election"
import { candidateDetailViewAtom, modalViewAtom, viewSelector } from "~/src/lib/view"

import Admin from "./components/Admin/Admin"
import ElectionManager from "./components/ElectionManager/ElectionManager"
import List from "./components/list/List"
import UserBar from "./components/list/UserBar/UserBar"
import Login from "./components/Login/Login"
import Logout from "./components/Logout/Logout"
import Modal from "./components/Modal/Modal"
import NewElection from "./components/NewElection/NewElection"
import Notification from "./components/Notification/Notification"
import SeeResults from "./components/SeeResults/SeeResults"
import SystemErrorBoundary from "./components/SystemErrorBoundary/SystemErrorBoundary"
import WaitForVoters from "./components/WaitForVoters/WaitForVoters"
import { myAuthStatusAtom } from "./lib/auth"

function NextComponent(): JSX.Element {
	const view = useO(viewSelector)
	const modalView = useO(modalViewAtom)
	if (modalView === `admin`) return <div />
	console.log(`view: ${view}`)

	switch (view) {
		case `not-started`:
			return (
				<div>
					<h1>Waiting for election to begin…</h1>
				</div>
			)
		case `voting`:
			return <List />
		case `voted`:
			return <WaitForVoters targetState="closed" />
		case `closed`:
			return <SeeResults />
	}
}

function Modals(): JSX.Element {
	const modalView = useO(modalViewAtom)
	const currentElection = useO(currentElectionAtom)

	// Admin acts like a modal but it's not
	if (modalView === `admin`) {
		return <Admin />
	}
	return (
		<>
			<Modal isOpen={modalView === `managing-auth`} title="Logout">
				<Logout />
			</Modal>
			<Modal
				isOpen={modalView === `managing-elections`}
				title={`Election` + (currentElection.name ? `: ${currentElection.name}` : ``)}
			>
				<ElectionManager />
			</Modal>
			<Modal isOpen={modalView === `candidate-detail`} noClose>
				<CandidateDetail />
			</Modal>
			<Modal isOpen={modalView === `new-election`}>
				<NewElection />
			</Modal>
		</>
	)
}

const App = (): JSX.Element => {
	const myAuthStatus = useO(myAuthStatusAtom)

	if (myAuthStatus.loading) return <div className="loading">Loading...</div>

	return (
		<SystemErrorBoundary>
			{myAuthStatus.authenticated ? (
				<>
					<UserBar />
					<Modals />
					<NextComponent />
				</>
			) : (
				<Login />
			)}
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
