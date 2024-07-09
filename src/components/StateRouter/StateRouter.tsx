import "./stateRouter.css"

import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "../../lib/firebase"
import { useUserStore } from "../../lib/userStore"
import type { ActualVote, ElectionData, ElectionState } from "../../types"
import Admin from "../Admin/Admin"
import List from "../list/List"
import UserBar from "../list/UserBar/UserBar"
import SeeResults from "../SeeResults/SeeResults"
import WaitForVoters from "../WaitForVoters/WaitForVoters"

function NextComponent(
	userElectionState: ElectionState,
	adminMode: boolean,
	setAdminMode: (mode: boolean) => void,
) {
	if (adminMode)
		return (
			<Admin
				exitAdminMode={() => {
					setAdminMode(false)
				}}
			/>
		)
	switch (userElectionState) {
		case `not-started`:
			return <WaitForVoters targetState="voting" />
		case `voting`:
			return <List />
		case `voted`:
			return <WaitForVoters targetState="closed" />
		case `closed`:
			return <SeeResults />
		default:
			return <div className="stateRouter">Loading...</div>
	}
}

function StateRouter(): JSX.Element {
	const { currentUser } = useUserStore()
	const [electionState, setElectionState] = useState<ElectionState>(`not-started`)
	const [hasVoted, setHasVoted] = useState(false)
	const [adminMode, setAdminMode] = useState(false)

	// Election state
	useEffect(() => {
		const unSub = onSnapshot(doc(db, `elections`, `current`), (document) => {
			const electionData = document.data() as ElectionData
			setElectionState(electionData.state)
		})
		return unSub
	}, [currentUser?.id])

	// Votes
	useEffect(() => {
		if (currentUser == null) return
		const unSub = onSnapshot(doc(db, `votes`, currentUser?.id), (res) => {
			const newVotes: ActualVote = res.data() as ActualVote
			setHasVoted(newVotes.finished)
		})
		return unSub
	}, [currentUser?.id])

	let userElectionState = electionState
	if (userElectionState === `voting` && hasVoted) {
		userElectionState = `voted`
	}

	return (
		<div className="stateRouter">
			<UserBar
				toggleAdminMode={() => {
					setAdminMode(!adminMode)
				}}
			/>
			{NextComponent(userElectionState, adminMode, setAdminMode)}
		</div>
	)
}

export default StateRouter
