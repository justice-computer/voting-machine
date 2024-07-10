import "./seeResults.css"

import { useO } from "atom.io/react"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useState } from "react"

import { db } from "../../lib/firebase"
import { useUserStore } from "../../lib/userStore"
import type { ActualVote, Candidate, ElectionData } from "../../types"
import { currentElectionIdAtom } from "../WaitForVoters/WaitForVoters"

type VoteSummary = {
	[key: string]: {
		firstChoice: number
		secondChoice: number
		thirdChoice: number
		disqualified: boolean
	}
}

type CandidateLookup = {
	[key: string]: Candidate
}

export function findWinningCandidateId(
	voteSummary: VoteSummary,
	eliminatedCandidateIds: string[],
): string | null {
	const activeCandidateIds = Object.keys(voteSummary).filter(
		(candidateId) => !eliminatedCandidateIds.includes(candidateId),
	)
	const firstChoiceVotes = activeCandidateIds.map(
		(candidateId) => voteSummary[candidateId].firstChoice,
	)
	const totalFirstChoiceVotes = firstChoiceVotes.reduce((acc, votes) => acc + votes, 0)
	const maxVotes = Math.max(...firstChoiceVotes)
	// A candidate wins if they have more than half of the total first choice votes
	if (maxVotes > totalFirstChoiceVotes / 2) {
		const winningCandidateId =
			activeCandidateIds.find((candidateId) => voteSummary[candidateId].firstChoice === maxVotes) ??
			null
		return winningCandidateId
	}
	return null
}

export function eliminateCandidates(
	voteSummary: VoteSummary,
	eliminatedCandidateIds: string[],
): string[] {
	const newVoteSummary = { ...voteSummary }
	const newEliminatedCandidateIds = [...eliminatedCandidateIds]
	const candidateIds = Object.keys(newVoteSummary)
	const firstChoiceVotes = candidateIds.map(
		(candidateId) => newVoteSummary[candidateId].firstChoice,
	)
	const minVotes = Math.min(...firstChoiceVotes)
	const minCandidateIds = candidateIds.filter(
		(candidateId) => newVoteSummary[candidateId].firstChoice === minVotes,
	)
	for (const candidateId of minCandidateIds) {
		newVoteSummary[candidateId].disqualified = true
		newEliminatedCandidateIds.push(candidateId)
	}
	return newEliminatedCandidateIds
}

/**
 * when a candidate explodes, their votes go flying everywhere
 * @param votes
 * @param eliminatedCandidateIds
 * @returns
 */
export function redistributeVotes(votes: ActualVote, eliminatedCandidateIds: string[]): ActualVote {
	// take all the votes for the eliminated candidates and redistribute them to the next choice
	const newVotes = { ...votes }

	for (const eliminatedCandidateId of eliminatedCandidateIds) {
		// 1. go through the votes for each user...

		// 2. if the eliminated candidate is the second choice, make a third choice the second choice
		let index = 0
		for (const candidateId of votes.secondChoice) {
			if (candidateId === eliminatedCandidateId) {
				// we voted for a candidate for second choice that has been eliminated
				const nextChoice = votes.thirdChoice[index] // FIXME: this could be problematic
				if (nextChoice) {
					newVotes.secondChoice[index] = nextChoice
					// get rid of the third choice
					newVotes.thirdChoice = newVotes.thirdChoice.filter((i: string) => i !== candidateId)
				}
			}
			index++
		}
		// 3. if the eliminated candidate is the first choice, make a second choice the first choice
		index = 0
		for (const candidateId of votes.firstChoice) {
			if (candidateId === eliminatedCandidateId) {
				// we voted for a candidate for first choice that has been eliminated
				const nextChoice = votes.secondChoice[index] // FIXME: this could be problematic
				if (nextChoice) {
					newVotes.firstChoice[index] = nextChoice
					// get rid of the second choice
					newVotes.secondChoice = newVotes.secondChoice.filter((i: string) => i !== candidateId)
				}
			}
			index++
		}
	}
	return newVotes
}

export async function getVoteSummary(
	userId: string,
	newVoteSummary: VoteSummary,
	eliminatedCandidateIds: string[],
): Promise<VoteSummary> {
	const votesDocRef = doc(db, `votes`, userId)
	const votesDocSnap = await getDoc(votesDocRef)
	const votes = votesDocSnap.data() as ActualVote

	const newVotes = redistributeVotes(votes, eliminatedCandidateIds)

	for (const candidateId of newVotes.firstChoice) {
		if (newVoteSummary[candidateId]) {
			newVoteSummary[candidateId].firstChoice++
		} else {
			newVoteSummary[candidateId] = {
				firstChoice: 1,
				secondChoice: 0,
				thirdChoice: 0,
				disqualified: false,
			}
		}
	}
	for (const candidateId of newVotes.secondChoice) {
		if (newVoteSummary[candidateId]) {
			newVoteSummary[candidateId].secondChoice++
		} else {
			newVoteSummary[candidateId] = {
				firstChoice: 0,
				secondChoice: 1,
				thirdChoice: 0,
				disqualified: false,
			}
		}
	}
	for (const candidateId of newVotes.thirdChoice) {
		if (newVoteSummary[candidateId]) {
			newVoteSummary[candidateId].thirdChoice++
		} else {
			newVoteSummary[candidateId] = {
				firstChoice: 0,
				secondChoice: 0,
				thirdChoice: 1,
				disqualified: false,
			}
		}
	}
	return newVoteSummary
}

function SeeResults(): JSX.Element {
	const { currentUser } = useUserStore()
	const [voteSummary, setVoteSummary] = useState<VoteSummary>({})
	const [candidateLookup, setCandidateLookup] = useState<CandidateLookup>({})
	const [eliminatedCandidateIds, setEliminatedCandidateIds] = useState<string[]>([])
	const [winner, setWinner] = useState<string | null>(null)
	const currentElectionId = useO(currentElectionIdAtom)

	useEffect(() => {
		const newVoteSummary = { ...voteSummary }
		void getDoc(doc(db, `elections`, currentElectionId)).then(async (res) => {
			const electionData = res.data() as ElectionData
			const promises = electionData.users.map(async (id) => {
				return getVoteSummary(id, newVoteSummary, eliminatedCandidateIds)
			})
			await Promise.all(promises).then(async () => {
				const cPromises = Object.keys(newVoteSummary).map(async (candidateId) => {
					const result = await getDoc(doc(db, `candidates`, candidateId))
					const candidate = result.data() as Candidate
					return candidate
				})
				await Promise.all(cPromises).then((candidates) => {
					const newCandidateLookup = candidates.reduce((acc, candidate) => {
						if (!candidate.id) return acc
						acc[candidate.id] = candidate
						return acc
					}, {} as CandidateLookup)
					setCandidateLookup(newCandidateLookup)
					setVoteSummary(newVoteSummary)
				})
			})
		})
	}, [currentUser?.id, eliminatedCandidateIds])

	useEffect(() => {
		console.log(`determining winning candidate...`)
		const winningCandidateId = findWinningCandidateId(voteSummary, eliminatedCandidateIds)
		if (winningCandidateId) {
			setWinner(winningCandidateId)
			console.log(
				`The winner is ${candidateLookup[winningCandidateId]?.name ?? winningCandidateId}`,
			)
		}
	}, [voteSummary, eliminatedCandidateIds])

	function handleProcess() {
		const newEliminatedCandidateIds = eliminateCandidates(voteSummary, eliminatedCandidateIds)
		setEliminatedCandidateIds(newEliminatedCandidateIds)
		console.log(`eliminating candidate...`, newEliminatedCandidateIds)
	}

	return (
		<div className="seeResults">
			{winner && <h1>The winner is {candidateLookup[winner]?.name ?? winner} 🎉</h1>}
			{Object.entries(voteSummary).map(([candidateId, votes]) => (
				<div key={candidateId} className="candidate">
					<h2>{candidateLookup[candidateId]?.name ?? candidateId}</h2>
					<p>First choice: {votes.firstChoice}</p>
					<p>Second choice: {votes.secondChoice}</p>
					<p>Third choice: {votes.thirdChoice}</p>
				</div>
			))}
			<button type="button" onClick={handleProcess}>
				Process results
			</button>
		</div>
	)
}

export default SeeResults
