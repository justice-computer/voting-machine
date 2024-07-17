import "./newElection.css"

import { useState } from "react"
import { toast } from "react-toastify"

type NewElectionProps = {
	handleNewElection: (name: string, label: string) => void
	close: () => void
}

function NewElection({ handleNewElection, close }: NewElectionProps): JSX.Element {
	const [electionName, setElectionName] = useState(``)
	const [electionLabel, setElectionLabel] = useState(``)

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
