import "./candidateList.css"

import { useO } from "atom.io/react"
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

import Modal from "~/src/components/Modal/Modal"

import { currentElectionIdAtom, currentElectionLabelAtom } from "../../../lib/atomStore"
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
	const currentElectionId = useO(currentElectionIdAtom)
	const currentElectionLabel = useO(currentElectionLabelAtom)

	// Candidates
	useEffect(() => {
		const unSub = onSnapshot(collection(db, `candidates`), (snapshot) => {
			const newCandidates: Candidate[] = snapshot?.docs
				.map((d) => {
					return {
						id: d.id,
						...d.data(),
					} as Candidate
				})
				.filter((candidate) => candidate.label === currentElectionLabel)
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

	const handleVote = async (vote: number | null, candidateId: string | undefined) => {
		console.log(vote, candidateId)
		candidateId = candidateId ?? selectedCandidate?.id
		if (candidateId == null || currentElectionId == null) return
		if (currentUser == null) return
		const newVotes: ActualVote = {
			voterId: currentUser.id,
			electionId: currentElectionId,
			firstChoice: votes?.firstChoice ?? [],
			secondChoice: votes?.secondChoice ?? [],
			thirdChoice: votes?.thirdChoice ?? [],
			finished: false,
		}

		const alreadyVotedForThisCandidate =newVotes.firstChoice.concat(newVotes.secondChoice, newVotes.thirdChoice).includes(candidateId)
    let oldVote = null
		if (alreadyVotedForThisCandidate) {
      // first, clear the existing vote
      if (votes?.firstChoice.includes(candidateId)) {
        newVotes.firstChoice = newVotes.firstChoice.filter((id) => id !== candidateId)
        oldVote = 1;
      }
      if (votes?.secondChoice.includes(candidateId)) {
        newVotes.secondChoice = newVotes.secondChoice.filter((id) => id !== candidateId)
        oldVote = 2;
      }
      if (votes?.thirdChoice.includes(candidateId)) {
        newVotes.thirdChoice = newVotes.thirdChoice.filter((id) => id !== candidateId)
        oldVote = 3;
      }
    }
    switch (vote) {
      case 1:
        if (newVotes?.firstChoice && newVotes?.firstChoice?.length > 2) {
          toast.error(`Already used up first choice votes`)
          break
        }
        if (oldVote !== 1) newVotes.firstChoice.push(candidateId)
        break
      case 2:
        if (newVotes?.secondChoice && newVotes?.secondChoice?.length > 2) {
          toast.error(`Already used up second choice votes`)
          break
        }
        if (oldVote !== 2) newVotes.secondChoice.push(candidateId)
        break
      case 3:
        if (newVotes?.thirdChoice && newVotes?.thirdChoice?.length > 2) {
          toast.error(`Already used up third choice votes`)
          break
        }
        if (oldVote !== 3) newVotes.thirdChoice.push(candidateId)
        break
      default:
        console.log(`Unknown vote`, vote)
        break
    }
		await setDoc(doc(db, `votes`, currentUser.id), newVotes)
		setSelectedCandidate(null)
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
					<Modal title="Add Candidate" isOpen={editState} onClose={handleClose}>
						<AddCandidate close={handleClose} />
					</Modal>
					<Modal
						isOpen={selectedCandidate != null}
						onClose={() => {
							setSelectedCandidate(null)
						}}
					>
						<CandidateDetail candidate={selectedCandidate} />
					</Modal>
					<table>
						<tbody>
							{candidates.map((candidate) => (
								<tr key={candidate.id} className="item">
									<td className="c-name"
										onClick={() => {
											selectCandidate(candidate?.id)
										}}
									>
										<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
										<h3>{candidate.name}</h3>
									</td>
									<td className="vote">
										<button
											className={votes?.firstChoice?.includes(candidate?.id ?? ``) ? `first` : ``}
											type="button"
											onClick={() => handleVote(1, candidate.id)}
										>
											<img src="./one-icon.svg" alt="one" />
										</button>
									</td>
									<td className="vote">
										<button
											className={votes?.secondChoice?.includes(candidate?.id ?? ``) ? `second` : ``}
											type="button"
											onClick={() => handleVote(2, candidate.id)}
										>
											<img src="./two-icon.svg" alt="two" />
										</button>
									</td>
									<td className="vote">
										<button
											className={votes?.thirdChoice?.includes(candidate?.id ?? ``) ? `third` : ``}
											type="button"
											onClick={() => handleVote(3, candidate.id)}
										>
											<img src="./three-icon.svg" alt="three" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</>
	)
}

export default CandidateList
