import { useI, useO } from "atom.io/react"
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { currentElectionIdAtom, currentElectionLabelAtom } from "~/src/lib/atomStore"

import { db } from "../../lib/firebase"
import { useUserStore } from "../../lib/userStore"
import type { ElectionData, ElectionState, SerializedVote } from "../../types"
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
	const currentElectionId = useO(currentElectionIdAtom)
	const setCurrentElectionId = useI(currentElectionIdAtom)
	const setCurrentElectionLabel = useI(currentElectionLabelAtom)

	// Current elections
	useEffect(() => {
		getDocs(collection(db, `elections`))
			.then((elections) => {
				const electionsData = elections.docs.map((election) => ({
					id: election.id,
					createdAt: election.data().createdAt,
					name: election.data().name,
					label: election.data().label,
				}))
				const sortedElections = electionsData.sort((a, b) => b.createdAt - a.createdAt)

				// Pick the newest election, unless there is one stored in localStorage
				const storedElectionId = localStorage.getItem(`electionId`)
				if (storedElectionId) {
					const storedElection = sortedElections.find(
						(election) => election.id === storedElectionId,
					)
					if (storedElection) {
						setCurrentElectionId(storedElection.id)
						setCurrentElectionLabel(storedElection.label)
						console.log(`using stored election ${storedElection.id}`)
					}
				} else {
					setCurrentElectionId(sortedElections[0].id)
					setCurrentElectionLabel(sortedElections[0].label)
					localStorage.setItem(`electionId`, sortedElections[0].id)
					console.log(`auto-selecting election ${sortedElections[0].name}`)
				}
			})
			.catch((error) => {
				console.error(error)
			})
	}, [currentUser?.id, currentElectionId])

	// Election state
	useEffect(() => {
		if (currentElectionId == null) return
		const unSub = onSnapshot(doc(db, `elections`, currentElectionId), (document) => {
			const electionData = document.data() as ElectionData
			setElectionState(electionData.state)
		})
		return unSub
	}, [currentUser?.id, currentElectionId])

	// Votes
	useEffect(() => {
		if (currentUser == null) return
		const unSub = onSnapshot(doc(db, `votes`, currentUser?.id), (res) => {
			const newVotes = res.data() as SerializedVote | undefined
			if (newVotes) {
				setHasVoted(newVotes.finished)
			}
		})
		return unSub
	}, [currentUser?.id, currentElectionId])

	let userElectionState = electionState
	if (userElectionState === `voting` && hasVoted) {
		userElectionState = `voted`
	}

	return (
		<>
			<UserBar
				toggleAdminMode={() => {
					setAdminMode(!adminMode)
				}}
			/>
			{NextComponent(userElectionState, adminMode, setAdminMode)}
		</>
	)
}

export default StateRouter
