import { disposeState, getState, makeMolecule, makeRootMolecule, runTransaction } from "atom.io"
import type { Ballot } from "justiciar"
import { electionMolecules } from "justiciar"

import type { ActualVote } from "../types"
import { currentElectionAtom } from "./election"
import { candidatesInCurrentElectionSelector } from "./election-candidates"
import { currentElectionVotersSelector } from "./election-voters"

export const root = makeRootMolecule(`root`)

export function actualVoteToBallot(actualVote: ActualVote): Ballot {
	const ballot: Ballot = {
		voterId: actualVote.voterId,
		votes: {
			election0: actualVote.tierList,
		},
	}
	return ballot
}

export function determineWinnersFromCurrentVotes(): string[] {
	const currentElection = getState(currentElectionAtom)
	if (!currentElection.id) {
		return []
	}

	const electionToken = makeMolecule(root, electionMolecules, Math.random().toString(), {
		numberOfWinners: 3n,
		votingTiers: [1n, 1n, 1n, 1n, 1n, 1n],
	})

	const election = getState(electionToken)

	const currentElectionCandidates = getState(candidatesInCurrentElectionSelector)
	for (const candidate of currentElectionCandidates) {
		runTransaction(election.registerCandidate)(candidate.id)
	}
	const currentElectionVoters = getState(currentElectionVotersSelector)
	for (const voter of currentElectionVoters) {
		runTransaction(election.registerVoter)(voter.user.id)
	}
	runTransaction(election.beginVoting)()

	for (const { vote } of currentElectionVoters) {
		console.log(vote)
		const ballot = actualVoteToBallot(vote)
		runTransaction(election.castBallot)(ballot)
	}
	runTransaction(election.beginCounting)()

	const losers: string[] = []
	const winners: string[] = []
	let safety = -100
	while (safety < 0) {
		safety++
		if (
			losers.length + winners.length === currentElectionCandidates.length ||
			winners.length === 3
		) {
			break
		}
		const round = election.spawnRound()
		round.setup()
		if (round.state.outcome) {
			const outcome = getState(round.state.outcome)
			if (outcome instanceof Error) {
				return []
			}
			switch (outcome.type) {
				case `elected`:
					winners.push(outcome.candidates[0].key)
					break
				case `eliminated`:
					losers.push(outcome.candidates[0].key)
					break
			}
		}
	}

	disposeState(electionToken)
	return winners
}
