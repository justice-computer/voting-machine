import "./newElection.css"

import { useI, useO } from "atom.io/react"
import { addDoc, collection, deleteDoc, doc, getDoc } from "firebase/firestore"
import { useState } from "react"
import { toast } from "react-toastify"

import { myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { db } from "~/src/lib/firebase"
import { modalViewAtom } from "~/src/lib/view"
import type { ElectionData } from "~/src/types"

function NewElection(): JSX.Element {
	const myself = useO(myselfSelector)
	const setModalView = useI(modalViewAtom)
	const setCurrentElection = useI(currentElectionAtom)
	const [electionName, setElectionName] = useState(``)
	const [electionLabel, setElectionLabel] = useState(``)

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
			setModalView(null)
		} catch (error: any) {
			console.error(error)
			toast.error(`Error creating election ${error.message}`)
		}
	}

	return (
		<div className="new-election">
			<h1>Create Election</h1>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					if (electionName.length === 0) {
						toast.error(`Election name cannot be empty`)
						return
					}
					handleNewElection(electionName, electionLabel)
						.then(() => {
							setModalView(null)
						})
						.catch((error: any) => {
							console.error(error)
							toast.error(`Error creating election ${error.message}`)
						})
				}}
			>
				<label htmlFor="election-name">Election Name</label>
				<input
					id="election-name"
					type="text"
					value={electionName}
					placeholder="Election Name"
					onChange={(e) => {
						setElectionName(e.target.value)
					}}
				/>
				<label htmlFor="election-label">Label</label>
				<input
					id="election-label"
					type="text"
					value={electionLabel}
					placeholder="Label"
					onChange={(e) => {
						setElectionLabel(e.target.value)
					}}
				/>
				<div className="icons">
					<button type="submit">
						<img src="./new-icon.svg" alt="NewElection" />
						<h2>Create</h2>
					</button>
					<button type="button" onClick={close}>
						<img src="./cancel-icon.svg" alt="cancel" />
						<h2>Cancel</h2>
					</button>
				</div>
			</form>
		</div>
	)
}

export default NewElection
