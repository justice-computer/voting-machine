import { getState, makeMolecule, makeRootMoleculeInStore, runTransaction } from "atom.io"
import { describe, it } from "vitest"

import { electionMolecules, need, ok } from "../src"

describe(`core procedures`, () => {
	it(`should return the correct divisibleVotingPower`, () => {
		const root = makeRootMoleculeInStore(`root`)
		const electionToken = makeMolecule(root, electionMolecules, `election0`, {
			numberOfWinners: 2n,
			votingTiers: [3n, 3n, 3n],
		})
		const election = getState(electionToken)

		if (!election) {
			throw new Error(`No election found`)
		}

		const droopQuota = getState(election.state.droopQuota)
		console.log({ droopQuota })

		for (let i = 0; i < 100; i++) {
			runTransaction(election.registerVoter)(`voter${i}`)
		}
		for (let i = 0; i < 10; i++) {
			runTransaction(election.registerCandidate)(`candidate${i}`)
		}

		runTransaction(election.beginVoting)()

		const droopQuota1 = getState(election.state.droopQuota)
		console.log({ droopQuota1 })

		for (let i = 0; i < 34; i++) {
			runTransaction(election.castBallot)({
				voterId: `voter${i}`,
				votes: {
					election0: [[`candidate0`], [`candidate1`], [`candidate2`]],
				},
			})
		}

		runTransaction(election.beginCounting)()

		const round0 = election.spawnRound()
		const round0Outcome = getState(need(round0.state.outcome))
		if (!ok(round0Outcome)) throw round0Outcome
		console.log(...round0Outcome.candidates)
		const round1 = election.spawnRound()
		const round1Outcome = getState(need(round1.state.outcome))
		if (!ok(round1Outcome)) throw round1Outcome
		console.log(...round1Outcome.candidates)
	})
})
