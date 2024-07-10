import "./seeResults.css"

import { makeMolecule, makeRootMolecule } from "atom.io"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useRef, useState } from "react"

import { type ElectionInstance, electionMolecules } from "../../../packages/justiciar/src"
import { db } from "../../lib/firebase"
import { useUserStore } from "../../lib/userStore"
import type { ActualVote, Candidate, ElectionData } from "../../types"

type VoteSummary = {
	[candidateKey: string]: {
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

const root = makeRootMolecule(`root`)

function SeeResults(): JSX.Element {
	const { currentUser } = useUserStore()
	const electionRef = useRef<ElectionInstance | null>(null)
	const [actualVotes, setActualVotes] = useState<ActualVote[]>([])

	useEffect(() => {
		if (electionRef.current === null) {
			electionRef.current = makeMolecule(root, electionMolecules, `election0`, {
				numberOfWinners: 3n,
				votingTiers: [3n, 3n, 3n],
			})
		}
		void getDoc(doc(db, `elections`, `current`)).then(async (res) => {
			const electionData = res.data() as ElectionData
			console.log(electionData)
			const votes = await Promise.all(
				electionData.users.map(async (userKey) => {
					const actualVoteDocToken = doc(db, `votes`, userKey)
					const actualVoteDocSnapshot = await getDoc(actualVoteDocToken)
					const actualVote = actualVoteDocSnapshot.data() as ActualVote
					return actualVote
				}),
			)
			setActualVotes(votes)
		})
	}, [currentUser?.id])

	console.log(actualVotes)

	return <div className="seeResults"></div>
}

export default SeeResults
