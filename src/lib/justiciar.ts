import { disposeState, getState, makeMolecule, makeRootMolecule, runTransaction } from "atom.io"
import type { Ballot } from "justiciar"
import { electionMolecules } from "justiciar"

import type { ActualVote } from "../types"
import { currentElectionAtom } from "./election"
import { candidatesInCurrentElectionSelector } from "./election-candidates"
import { currentElectionVotersSelector } from "./election-voters"

export const root = makeRootMolecule(`root`)

export function actualVoteToBallot(electionKey: string, actualVote: ActualVote): Ballot {
	const ballot: Ballot = {
		voterId: actualVote.voterId,
		votes: {
			[electionKey]: actualVote.tierList,
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
		const ballot = actualVoteToBallot(electionToken.key, vote)
		debugger
		try {
			runTransaction(election.castBallot)(ballot)
		} catch (error: any) {
			console.log(`Ignoring ballot ${error.message}`)
			console.log(JSON.stringify(ballot, null, 2))
		}
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
		console.log(`Safety ${safety}`)
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
					if (outcome.candidates.length > 0) {
						losers.push(outcome.candidates[0].key)
					}
					break
			}
		}
	}

	disposeState(electionToken)
	return winners
}
