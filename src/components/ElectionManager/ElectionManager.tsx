import "./electionManager.css"

import { useI, useO } from "atom.io/react"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { useEffect, useState } from "react"

import Accordion from "~/src/components/Accordion/Accordion"
import { myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { db } from "~/src/lib/firebase"
import { modalViewAtom } from "~/src/lib/view"
import type { ElectionData } from "~/src/types"

type ElectionInfo = ElectionData & {
	userName: string
	formattedCreatedAt: string
}
function ElectionManager(): JSX.Element {
	const [electionData, setElectionData] = useState<ElectionInfo[]>([])
	const myself = useO(myselfSelector)
	const setModalView = useI(modalViewAtom)
	const setCurrentElection = useI(currentElectionAtom)

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
						label: election.data().label,
						title: election.data().title,
						subtitle: election.data().subtitle,
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
			<div className="change-icons">
				{myself?.admin && (
					<button
						type="button"
						onClick={() => {
							setModalView(`admin`)
						}}
					>
						<img src="./gear-icon.svg" alt="admin" />
						Manage
					</button>
				)}
			</div>
			<Accordion title="Change Election">
				<div className="election-list">
					<table>
						<tbody>
							{electionData.map((election) => (
								<tr key={election.id}>
									<td>
										<button
											type="button"
											onClick={() => {
												setCurrentElection(election)
												setModalView(null)
											}}
										>
											select
										</button>
									</td>
									<td>{election.name}</td>
									<td>{election.userName}</td>
									<td>{election.formattedCreatedAt}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Accordion>
		</div>
	)
}

export default ElectionManager
