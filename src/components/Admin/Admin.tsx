import "./admin.css"

import { faker } from "@faker-js/faker"
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "../../lib/firebase"
import type { ActualVote, ElectionData, SystemUser } from "../../types"

type AdminProps = {
	exitAdminMode: () => void
}

function shuffleArray(array: string[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

function Admin({ exitAdminMode }: AdminProps): JSX.Element {
	const [voters, setVoters] = useState<SystemUser[]>()
	const [finishedVoters, setFinishedVoters] = useState<string[]>([])
	const [currentState, setCurrentState] = useState<string>(`not-started`)

	useEffect(() => {
		const unSub = onSnapshot(doc(db, `elections`, `current`), async (res) => {
			const electionData = res.data() as ElectionData
			setCurrentState(electionData.state)

			// Get all the users in the current election
			const promises = electionData.users.map(async (id) => {
				const userDocRef = doc(db, `users`, id)
				const userDocSnap = await getDoc(userDocRef)
				const user = userDocSnap.data() as SystemUser
				return user
			})
			await Promise.all(promises).then(async (users) => {
				setVoters(users)

				// Check if the voters have finished voting
				await Promise.all(
					electionData.users.map(async (id) => {
						const voteDocRef = doc(db, `votes`, id)
						const voteDocSnap = await getDoc(voteDocRef)
						const vote = voteDocSnap.data() as ActualVote
						if (vote.finished) {
							setFinishedVoters((prev) => [...prev, id])
						}
						return id
					}),
				)
			})
		})
		return unSub
	}, [])

	function handleElectionReset() {
		void setDoc(doc(db, `elections`, `current`), { state: `not-started`, users: [] })
	}

	function handleStartTheElection() {
		void setDoc(doc(db, `elections`, `current`), { state: `voting` }, { merge: true })
	}

	async function handleAddRandomVoter() {
		const newUser = {
			username: faker.internet.userName(),
			avatar: faker.image.avatar(),
			email: faker.internet.email(),
			name: faker.person.fullName(),
		}
		const user = await addDoc(collection(db, `users`), newUser)
		// Add the ID back in
		await setDoc(doc(db, `user`, user.id), { id: user.id }, { merge: true })
		await setDoc(doc(db, `votes`, user.id), {
			finished: false,
			firstChoice: [],
			secondChoice: [],
			thirdChoice: [],
		})
		const electionDoc = doc(db, `elections`, `current`)
		const electionDocSnap = await getDoc(electionDoc)
		const electionData = electionDocSnap.data() as ElectionData
		await setDoc(
			doc(db, `elections`, `current`),
			{ users: [...electionData.users, user.id] },
			{ merge: true },
		)
	}

	async function handleAddVotes(voterId: string) {
		const candidates = await getDocs(collection(db, `candidates`))
		const ids = shuffleArray(candidates.docs.map((document) => document.id))
		await setDoc(doc(db, `votes`, voterId), {
			finished: true,
			firstChoice: ids.slice(0, 3),
			secondChoice: ids.slice(3, 6),
			thirdChoice: ids.slice(6, 9),
		})
	}
	async function handleFinishElection() {
		await setDoc(doc(db, `elections`, `current`), { state: `closed` }, { merge: true })
	}

	// TODO: MAKE THESE BUTTONS NICER LOOKING
	return (
		<div className="admin">
			<h1>Admin</h1>
			<p>Current state: {currentState}</p>
			<p>Current voters:</p>
			{voters?.length ? (
				<div className="waiting">
					<ul>
						{voters.map((voter) => (
							<div className="UserBar" key={voter.id}>
								<div className="user">
									<img src={voter?.avatar ?? `./avatar.png`} alt="avatar" />
									<p>{voter?.username}</p>
									{finishedVoters.includes(voter.id) ? (
										<p>✅</p>
									) : (
										<button
											className="admin-button"
											type="button"
											onClick={() => handleAddVotes(voter.id)}
										>
											Add Votes
										</button>
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
			<div className="admin-buttons">
				<button className="admin-button" type="button" onClick={handleElectionReset}>
					<img src="./reset-icon.svg" alt="reset" />
					Reset election
				</button>
				<button className="admin-button" type="button" onClick={handleAddRandomVoter}>
					<img src="./random-icon.svg" alt="add random" />
					Add random voter
				</button>
				<button className="admin-button" type="button" onClick={handleStartTheElection}>
					<img src="./play-icon.svg" alt="start" />
					Start the election
				</button>
				<button className="admin-button" type="button" onClick={handleFinishElection}>
					<img src="./finish-icon.svg" alt="finish" />
					Finish the election
				</button>
				<button className="admin-button" type="button" onClick={exitAdminMode}>
					<img src="./exit-icon.svg" alt="exit" />
					EXIT ADMIN MODE
				</button>
			</div>
		</div>
	)
}

export default Admin
