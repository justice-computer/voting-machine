import "./electionManager.css"

import { stringifyJson } from "atom.io/json"
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"

import Accordion from "~/src/components/Accordion/Accordion"
import { db } from "~/src/lib/firebase"
import { useUserStore } from "~/src/lib/userStore"
import { prepareBallot } from "~/src/stories/Ballot"
import type { ElectionData, SerializedVote } from "~/src/types"

type ElectionManagerProps = {
	handleChangeElection: (id: string) => void
	handleAdmin: () => void
	close: () => void
}

type ElectionInfo = ElectionData & {
	userName: string
	formattedCreatedAt: string
}
function ElectionManager({
	handleChangeElection,
	handleAdmin,
	close,
}: ElectionManagerProps): JSX.Element {
	const [electionData, setElectionData] = useState<ElectionInfo[]>([])
	const { currentUser } = useUserStore()

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

	const handleFinished = async () => {
		if (currentUser == null) return
		for (const election of electionData) {
			const tierList = stringifyJson(prepareBallot(election.id))
			const newVote: SerializedVote = {
				voterId: currentUser.id,
				electionId: election.id,
				tierList,
				finished: true,
			}

			await setDoc(doc(db, `votes`, currentUser.id), newVote)
			if (!election.users.includes(currentUser.id)) {
				election.users.push(currentUser.id)
				await setDoc(doc(db, `elections`, election.id), { users: election.users }, { merge: true })
			}
		}
		close()
	}

	return (
		<div className="change-election">
			<div className="change-icons">
				{currentUser?.admin && (
					<button type="button" onClick={handleAdmin}>
						<img src="./gear-icon.svg" alt="admin" />
						Manage
					</button>
				)}
				{/* FIXME: Implement finish voting */}
				<button type="button" onClick={handleFinished}>
					<img src="./finish-icon.svg" alt="cancel" />
					Finish Voting
				</button>
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
												handleChangeElection(election.id)
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
