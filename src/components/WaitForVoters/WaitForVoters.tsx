import "./waitForVoters.css"

import { useO } from "atom.io/react"
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"

import { currentElectionIdAtom } from "~/src/lib/atomStore"

import { db } from "../../lib/firebase"
import { useUserStore } from "../../lib/userStore"
import type { ElectionData, ElectionState, SerializedVote, SystemUser } from "../../types"

type WaitForVotersProps = {
	targetState: ElectionState
}

function WaitForVoters({ targetState }: WaitForVotersProps): JSX.Element {
	const { currentUser } = useUserStore()
	const [voters, setVoters] = useState<SystemUser[]>()
	const [finishedVoters, setFinishedVoters] = useState<string[]>([])
	const currentElectionId = useO(currentElectionIdAtom)

	useEffect(() => {
		if (currentElectionId == null) return
		const unSub = onSnapshot(doc(db, `elections`, currentElectionId), async (res) => {
			const electionData = res.data() as ElectionData
			const promises = electionData.users.map(async (id) => {
				const userDocRef = doc(db, `users`, id)
				const userDocSnap = await getDoc(userDocRef)
				const user = userDocSnap.data() as SystemUser
				return user
			})
			await Promise.all(promises).then(async (users) => {
				console.log(targetState, electionData.state)
				setVoters(users)
				if (targetState === `closed`) {
					await Promise.all(
						electionData.users.map(async (id) => {
							// TODO: Make this onSnapshot so it updates
							const voteDocRef = doc(db, `votes`, id)
							const voteDocSnap = await getDoc(voteDocRef)
							const vote = voteDocSnap.data() as SerializedVote | undefined
							if (vote?.finished) {
								setFinishedVoters((prev) => [...prev, id])
							}
							return id
						}),
					)
				}
			})
		})
		return unSub
	}, [currentUser?.id, targetState, currentElectionId])

	const handleReturn = () => {
		if (currentUser == null) return
		void setDoc(doc(db, `votes`, currentUser.id), { finished: false }, { merge: true })
	}

	const handleJoin = async () => {
		if (currentUser == null || currentElectionId == null) return
		await setDoc(doc(db, `votes`, currentUser.id), {
			finished: false,
			tierList: `[]`,
		})
		const electionDoc = doc(db, `elections`, currentElectionId)
		const electionDocSnap = await getDoc(electionDoc)
		const electionData = electionDocSnap.data() as ElectionData
		const users = electionData.users
		if (!users.includes(currentUser.id)) {
			users.push(currentUser.id)
			await setDoc(electionDoc, { users }, { merge: true })
		}
	}

	return (
		<div className="waitForVoters">
			{voters?.length ? (
				<div className="waiting">
					<h1>Waiting for voters...</h1>
					<h2 style={{ padding: `10px` }}>Current voters:</h2>
					<ul>
						{voters.map((voter) => (
							<div className="userInfo" key={voter.id}>
								<div className="user">
									<img src={voter?.avatar ?? `./avatar.png`} alt="avatar" />
									<h2>{voter?.username}</h2>
									{targetState !== `closed` ? null : finishedVoters.includes(voter.id) ? (
										<p>✅</p>
									) : (
										<p>❌</p>
									)}
								</div>
							</div>
						))}
					</ul>
				</div>
			) : (
				<div>
					<h1>Waiting for voters...</h1>
					<p>No voters yet</p>
				</div>
			)}
			{targetState === `closed` && (
				<button type="button" className="action" onClick={handleReturn}>
					Return to voting
				</button>
			)}
			{targetState === `voting` && (
				<button type="button" className="action" onClick={handleJoin}>
					Join the vote!
				</button>
			)}
		</div>
	)
}

export default WaitForVoters
