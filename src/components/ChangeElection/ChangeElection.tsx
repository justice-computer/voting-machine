import "./changeElection.css"

import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "~/src/lib/firebase"
import type { ElectionData } from "~/src/types"

type ChangeElectionProps = {
	handleChangeElection: (id: string) => void
	close: () => void
}

type ElectionInfo = ElectionData & {
	userName: string
	formattedCreatedAt: string
}
function ChangeElection({ handleChangeElection, close }: ChangeElectionProps): JSX.Element {
	const [electionData, setElectionData] = useState<ElectionInfo[]>([])

	useEffect(() => {
		getDocs(collection(db, `elections`))
			.then((elections) => {
				const electionsPromises = elections.docs.map(async (election) => {
					const user = await getDoc(doc(db, `users`, election.data().createdBy))
					const createdDate = election.data().createdAt.toDate()
					const formattedCreatedAt = createdDate.toLocaleString(`en-US`, {
						year: `numeric`,
						month: `2-digit`,
						day: `2-digit`,
						hour: `2-digit`,
						minute: `2-digit`,
						second: `2-digit`,
						hour12: true, // Use 24-hour time format
					})
					return {
						id: election.id,
						createdAt: election.data().createdAt,
						createdBy: election.data().createdBy,
						name: election.data().name,
						users: election.data().users,
						state: election.data().state,
						userName: user.data()?.username || `unknown`,
						formattedCreatedAt,
					}
				})

				Promise.all(electionsPromises)
					.then((electionsData) => {
						const sortedElections = electionsData.sort((a, b) => b.createdAt - a.createdAt)
						setElectionData(sortedElections)
					})
					.catch((error) => {
						console.error(error)
					})
			})
			.catch((error) => {
				console.error(error)
			})
	}, [])

	return (
		<div className="change-election">
			<h1>Change Election</h1>
			<div className="election-list">
				<ul>
					{electionData.map((election) => (
						<li key={election.id}>
							<button
								type="button"
								onClick={() => {
									handleChangeElection(election.id)
								}}
							>
								select
							</button>
							<p>{election.name}</p>
							<p>{election.userName}</p>
							<p>{election.formattedCreatedAt}</p>
						</li>
					))}
				</ul>
			</div>
			<div className="icons">
				<button type="button" onClick={close}>
					<img src="./cancel-icon.svg" alt="cancel" />
					Cancel
				</button>
			</div>
		</div>
	)
}

export default ChangeElection
