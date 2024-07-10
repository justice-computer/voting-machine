import "./candidateList.css"

import { collection, doc, onSnapshot, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

import { db } from "../../../lib/firebase"
import { useUserStore } from "../../../lib/userStore"
import type { ActualVote, Candidate } from "../../../types"
import CandidateDetail from "../../CandidateDetail/CandidateDetail"
import AddCandidate from "./AddCandidate/AddCandidate"

function CandidateList(): JSX.Element {
	const [editState, setEditState] = useState(false)
	const [candidates, setCandidates] = useState<Candidate[]>([])
	const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
	const [votes, setVotes] = useState<ActualVote | null>(null)
	const { currentUser } = useUserStore()

	// Candidates
	useEffect(() => {
		const unSub = onSnapshot(collection(db, `candidates`), (snapshot) => {
			const newCandidates: Candidate[] = snapshot?.docs.map((d) => {
				return {
					id: d.id,
					...d.data(),
				} as Candidate
			})
			setCandidates(newCandidates)
		})
		return unSub
	}, [])

	// Votes
	useEffect(() => {
		if (currentUser == null) return
		const unSub = onSnapshot(doc(db, `votes`, currentUser?.id), (res) => {
			const newVotes: ActualVote = res.data() as ActualVote
			setVotes(newVotes)
		})
		return unSub
	}, [currentUser?.id])

	const handleClose = () => {
		setEditState(false)
	}

	const selectCandidate = (id: string | undefined) => {
		if (id == null) return
		const candidate = candidates.find((c) => c.id === id)
		if (candidate) {
			setSelectedCandidate(candidate)
		}
	}

	const handleVote = async (vote: number | null) => {
		console.log(vote)
		if (selectedCandidate?.id == null) return
		if (currentUser == null) return
		const newVotes: ActualVote = {
			voterId: currentUser.id,
			firstChoice: votes?.firstChoice ?? [],
			secondChoice: votes?.secondChoice ?? [],
			thirdChoice: votes?.thirdChoice ?? [],
			finished: false,
		}
		if (
			newVotes.firstChoice
				.concat(newVotes.secondChoice, newVotes.thirdChoice)
				.includes(selectedCandidate.id)
		) {
			if (vote == null) {
				if (votes?.firstChoice.includes(selectedCandidate.id)) {
					newVotes.firstChoice = newVotes.firstChoice.filter((id) => id !== selectedCandidate.id)
				}
				if (votes?.secondChoice.includes(selectedCandidate.id)) {
					newVotes.secondChoice = newVotes.secondChoice.filter((id) => id !== selectedCandidate.id)
				}
				if (votes?.thirdChoice.includes(selectedCandidate.id)) {
					newVotes.thirdChoice = newVotes.thirdChoice.filter((id) => id !== selectedCandidate.id)
				}
			} else {
				toast.error(`Already voted for this candidate`)
			}
		} else {
			switch (vote) {
				case 1:
					if (votes?.firstChoice && votes?.firstChoice?.length > 2) {
						toast.error(`Already used up first choice votes`)
						break
					}
					newVotes.firstChoice.push(selectedCandidate.id)
					break
				case 2:
					if (votes?.secondChoice && votes?.secondChoice?.length > 2) {
						toast.error(`Already used up second choice votes`)
						break
					}
					newVotes.secondChoice.push(selectedCandidate.id)
					break
				case 3:
					if (votes?.thirdChoice && votes?.thirdChoice?.length > 2) {
						toast.error(`Already used up third choice votes`)
						break
					}
					newVotes.thirdChoice.push(selectedCandidate.id)
					break
				default:
					break
			}
		}
		await setDoc(doc(db, `votes`, currentUser.id), newVotes)
		setSelectedCandidate(null)
	}

	const handleFinished = async () => {
		if (currentUser == null) return
		if (votes == null) return
		await setDoc(doc(db, `votes`, currentUser.id), { finished: true }, { merge: true })
	}

	return (
		<>
			<div className="candidateList">
				<div className="search">
					<div className="searchBar">
						<img src="./search.png" alt="search" />
						<input type="text" placeholder="Search candidate" />
					</div>
					<img
						src="./plus.png"
						alt="plus"
						className="add"
						onClick={() => {
							setEditState(true)
						}}
						onKeyDown={(e) => {
							if (e.key === `Enter`) {
								setEditState(true)
							}
						}}
					/>
				</div>
				<div>
					{editState ? <AddCandidate close={handleClose} /> : null}
					{selectedCandidate ? (
						<CandidateDetail candidate={selectedCandidate} handleVote={handleVote} />
					) : null}
					{candidates.map((candidate) => (
						<div
							className="item"
							key={candidate.id}
							onClick={() => {
								selectCandidate(candidate?.id)
							}}
							onKeyDown={(e) => {
								if (e.key === `Enter`) {
									selectCandidate(candidate?.id)
								}
							}}
						>
							<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
							<div className="info">
								<h3>{candidate.name}</h3>
								<p>{candidate.heading}</p>
								{votes?.firstChoice?.includes(candidate?.id ?? ``) ? (
									<img className="first" src="./one-icon.svg" alt="one" />
								) : null}
								{votes?.secondChoice?.includes(candidate?.id ?? ``) ? (
									<img className="second" src="./two-icon.svg" alt="two" />
								) : null}
								{votes?.thirdChoice?.includes(candidate?.id ?? ``) ? (
									<img className="third" src="./three-icon.svg" alt="three" />
								) : null}
							</div>
						</div>
					))}
				</div>
			</div>
			<button
				type="button"
				disabled={votes == null}
				className="finished"
				onClick={() => handleFinished()}
				onKeyDown={(e) => {
					if (e.key === `Enter`) {
						void handleFinished()
					}
				}}
			>
				{/* TODO: Put this at the top of the page and require a confirmation and warning about unused votes */}
				Finished Voting
			</button>
		</>
	)
}

export default CandidateList
