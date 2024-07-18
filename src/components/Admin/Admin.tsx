import "./admin.css"

import { faker } from "@faker-js/faker"
import { getState } from "atom.io"
import { useI, useO } from "atom.io/react"
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	setDoc,
} from "firebase/firestore"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

import Modal from "~/src/components/Modal/Modal"
import NewElection from "~/src/components/NewElection/NewElection"
import { currentElectionIdAtom, currentElectionLabelAtom } from "~/src/lib/atomStore"
import { db } from "~/src/lib/firebase"
import { useUserStore } from "~/src/lib/userStore"
import type { ActualVote, ElectionData, SystemUser } from "~/src/types"

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
	const [showNewElection, setShowNewElection] = useState(false)
	const currentElectionId = useO(currentElectionIdAtom)
	const setCurrentElectionId = useI(currentElectionIdAtom)
	const { currentUser } = useUserStore()

	useEffect(() => {
		if (currentElectionId == null) return
		const unSub = onSnapshot(doc(db, `elections`, currentElectionId), async (res) => {
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
	}, [currentElectionId])

	function handleElectionReset() {
		if (currentElectionId == null) return
		void setDoc(
			doc(db, `elections`, currentElectionId),
			{ state: `not-started`, users: [] },
			{ merge: true },
		)
	}

	function handleStartTheElection() {
		if (currentElectionId == null) return
		void setDoc(doc(db, `elections`, currentElectionId), { state: `voting` }, { merge: true })
	}

	async function handleAddRandomVoter() {
		if (currentElectionId == null) return
		const newUser = {
			username: faker.internet.userName(),
			avatar: faker.image.avatar(),
			email: faker.internet.email(),
			name: faker.person.fullName(),
		}
		const user = await addDoc(collection(db, `users`), newUser)

		// Add the ID back in
		await setDoc(doc(db, `users`, user.id), { id: user.id }, { merge: true })
		await setDoc(doc(db, `votes`, user.id), {
			finished: false,
			firstChoice: [],
			secondChoice: [],
			thirdChoice: [],
		})
		const electionDoc = doc(db, `elections`, currentElectionId)
		const electionDocSnap = await getDoc(electionDoc)
		const electionData = electionDocSnap.data() as ElectionData
		await setDoc(
			doc(db, `elections`, currentElectionId),
			{ users: [...electionData.users, user.id] },
			{ merge: true },
		)
	}

	async function handleNewElection(name: string, label: string) {
		if (!currentUser) return
		try {
			const newElection: Omit<ElectionData, `id`> = {
				name,
				createdBy: currentUser?.id,
				state: `not-started`,
				createdAt: new Date(),
				users: [],
				label,
			}
			const election = await addDoc(collection(db, `elections`), newElection)
			setCurrentElectionId(election.id)
			localStorage.setItem(`electionId`, election.id)
			const docRef = doc(db, `votes`, currentUser?.id)
			await deleteDoc(docRef)
			setShowNewElection(false)
		} catch (error: any) {
			console.error(error)
			toast.error(`Error creating election ${error.message}`)
		}
	}

	async function handleAddVotes(voterId: string) {
		const currentElectionLabel = getState(currentElectionLabelAtom)
		const candidates = (await getDocs(collection(db, `candidates`))).docs.map((document) =>
			document.data(),
		)
		const candidatesFiltered = candidates.filter(
			(candidate) => candidate.label === currentElectionLabel,
		)
		const idsFiltered = candidatesFiltered.map((document) => document.id)
		const idsShuffled = shuffleArray(idsFiltered)

		console.log({
			candidates,
			candidatesFiltered,
			idsFiltered,
			idsShuffled,
		})
		await setDoc(doc(db, `votes`, voterId), {
			finished: true,
			firstChoice: idsShuffled.slice(0, 2),
			secondChoice: idsShuffled.slice(2, 4),
			thirdChoice: idsShuffled.slice(4, 6),
		})
		setFinishedVoters((prev) => [...prev, voterId])
	}

	async function handleFinishElection() {
		if (currentElectionId == null) return
		await setDoc(doc(db, `elections`, currentElectionId), { state: `closed` }, { merge: true })
	}

	return (
		<div className="admin">
			<Modal
				isOpen={showNewElection}
				onClose={() => {
					setShowNewElection(false)
				}}
			>
				<NewElection
					close={() => {
						setShowNewElection(!showNewElection)
					}}
					handleNewElection={handleNewElection}
				/>
			</Modal>
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
				<button
					className="admin-button"
					type="button"
					onClick={() => {
						setShowNewElection(true)
					}}
				>
					<img src="./new-icon.svg" alt="new" />
					Create new election
				</button>
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
