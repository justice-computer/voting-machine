import "./userBar.css"

import { useI, useO } from "atom.io/react"
import type { Timestamp } from "firebase/firestore"
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { currentElectionIdAtom } from "~/src/lib/atomStore"
import { db } from "~/src/lib/firebase"
import { useUserStore } from "~/src/lib/userStore"
import type { ElectionData } from "~/src/types"

import Logout from "../../Logout/Logout"

type UserBarProps = {
	toggleAdminMode: () => void
}

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
						console.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>`, sortedElections)
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

function UserBar({ toggleAdminMode }: UserBarProps): JSX.Element {
	const { currentUser, logout } = useUserStore()
	const [showLogout, setShowLogout] = useState(false)
	const [showChangeElection, setShowChangeElection] = useState(false)
	const [currentElectionName, setCurrentElectionName] = useState<string | null>(null)
	const currentElectionId = useO(currentElectionIdAtom)
	const setCurrentElectionId = useI(currentElectionIdAtom)

	useEffect(() => {
		if (currentElectionId == null) return
		const unSub = onSnapshot(doc(db, `elections`, currentElectionId), (document) => {
			const electionData = document.data() as ElectionData
			setCurrentElectionName(electionData.name)
		})
		return unSub
	}, [currentElectionId])

	function handleLogout() {
		logout()
	}

	function handleAdmin() {
		toggleAdminMode()
	}

	function handleChangeElection(id: string) {
		setCurrentElectionId(id)
		setShowChangeElection(false)
	}

	return (
		<div className="UserBar">
			{showLogout ? (
				<Logout
					handleLogout={handleLogout}
					cancelLogout={() => {
						setShowLogout(false)
					}}
				/>
			) : null}
			{showChangeElection ? (
				<ChangeElection
					handleChangeElection={handleChangeElection}
					close={() => {
						setShowChangeElection(false)
					}}
				/>
			) : null}
			<div className="user">
				<img src={currentUser?.avatar ?? `./avatar.png`} alt="avatar" />
				<h2>{currentUser?.username}</h2>
			</div>
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setShowChangeElection(true)
					}}
				>
					<img src="./switch-icon.svg" alt="change" />
					{currentElectionName && <p>{currentElectionName}</p>}
				</button>
				<button
					type="button"
					onClick={() => {
						setShowLogout(true)
					}}
				>
					<img src="./power-off-icon.svg" alt="logout" />
				</button>
				{currentUser?.admin && (
					<button type="button" onClick={handleAdmin}>
						<img src="./gear-icon.svg" alt="admin" />
					</button>
				)}
			</div>
		</div>
	)
}

export default UserBar
