import "./admin.css"

import { faker } from "@faker-js/faker"
import { stringifyJson } from "atom.io/json"
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
import { myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { db } from "~/src/lib/firebase"
import { modalViewAtom } from "~/src/lib/view"
import type { ElectionData, SerializedVote, SystemUser } from "~/src/types"

function shuffleArray(array: string[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

function Admin(): JSX.Element {
	const [voters, setVoters] = useState<SystemUser[]>()
	const [finishedVoters, setFinishedVoters] = useState<string[]>([])
	const [currentState, setCurrentState] = useState<string>(`not-started`)
	const [showNewElection, setShowNewElection] = useState(false)
	const currentElection = useO(currentElectionAtom)
	const setCurrentElection = useI(currentElectionAtom)
	const setModalView = useI(modalViewAtom)
	const myself = useO(myselfSelector)

	useEffect(() => {
		if (currentElection.id === ``) return
		const unSub = onSnapshot(doc(db, `elections`, currentElection.id), async (res) => {
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
						const vote = voteDocSnap.data() as SerializedVote
						if (vote.finished) {
							setFinishedVoters((prev) => [...prev, id])
						}
						return id
					}),
				)
			})
		})
		return unSub
	}, [currentElection])

	function handleElectionReset() {
		if (currentElection.id === ``) return
		void setDoc(
			doc(db, `elections`, currentElection.id),
			{ state: `not-started`, users: [] },
			{ merge: true },
		)
	}

	function handleStartTheElection() {
		if (currentElection == null) return
		void setDoc(doc(db, `elections`, currentElection.id), { state: `voting` }, { merge: true })
	}

	async function handleAddRandomVoter() {
		if (currentElection == null) return
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
			tierList: `[]`,
		})
		const electionDoc = doc(db, `elections`, currentElection.id)
		const electionDocSnap = await getDoc(electionDoc)
		const electionData = electionDocSnap.data() as ElectionData
		await setDoc(
			doc(db, `elections`, currentElection.id),
			{ users: [...electionData.users, user.id] },
			{ merge: true },
		)
	}

	async function handleNewElection(name: string, label: string) {
		if (myself === null) return
		try {
			const newElection: Omit<ElectionData, `id`> = {
				name,
				createdBy: myself.id,
				state: `not-started`,
				createdAt: new Date(),
				users: [],
				label,
				title: ``,
				subtitle: ``,
			}
			const { id } = await addDoc(collection(db, `elections`), newElection)
			const election = (await getDoc(doc(db, `elections`, id))).data() as Omit<ElectionData, `id`>
			setCurrentElection({ ...election, id })
			localStorage.setItem(`electionId`, id)
			const docRef = doc(db, `votes`, myself.id)
			await deleteDoc(docRef)
			setShowNewElection(false)
		} catch (error: any) {
			console.error(error)
			toast.error(`Error creating election ${error.message}`)
		}
	}

	async function handleAddVotes(voterId: string) {
		const candidates = (await getDocs(collection(db, `candidates`))).docs.map((document) =>
			document.data(),
		)
		const candidatesFiltered = candidates.filter(
			(candidate) => candidate.label === currentElection.label,
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
			tierList: stringifyJson(idsShuffled.map((id) => [id])),
		})
		setFinishedVoters((prev) => [...prev, voterId])
	}

	async function handleFinishElection() {
		if (currentElection == null) return
		await setDoc(doc(db, `elections`, currentElection.id), { state: `closed` }, { merge: true })
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
				<button
					className="admin-button"
					type="button"
					onClick={() => {
						setModalView(null)
					}}
				>
					<img src="./exit-icon.svg" alt="exit" />
					EXIT ADMIN MODE
				</button>
			</div>
		</div>
	)
}

export default Admin
