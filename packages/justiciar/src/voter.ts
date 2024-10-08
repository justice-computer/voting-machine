import type { CtorToolkit, MoleculeType } from "atom.io"
import { moleculeFamily, selectorFamily } from "atom.io"
import { findRelations } from "atom.io/data"
import { fromEntries } from "atom.io/json"

import type { ElectionRoundCandidateKey } from "./candidate"
import { candidateStatusSelectors } from "./candidate"
import { electionMolecules, votes } from "./election"
import { Rational } from "./rational"
import { need } from "./refinements"

export type Voter = {
	type: `voter`
	id: string
	name: string
}

export type Ballot = {
	voterId: string
	votes: {
		[electionId: string]: string[][]
	}
}

export type ElectionRoundVoterKey = [[`election`, string], [`round`, number], [`voter`, string]]

export const voterCurrentFavoritesSelectors = selectorFamily<
	[topTier: string[], nextTier: string[]],
	ElectionRoundVoterKey
>({
	key: `voterCurrentFavorites`,
	get:
		(keyEntries) =>
		({ get }) => {
			const keys = fromEntries(keyEntries)
			const votedForCandidateEntries = get(findRelations(votes, keys.voter).candidateEntriesOfVoter)
			const stillRunning = votedForCandidateEntries.filter(([candidateKey]) => {
				const electionRoundCandidateKey = [
					[`election`, keys.election],
					[`round`, keys.round],
					[`candidate`, candidateKey],
				] satisfies ElectionRoundCandidateKey
				const candidateStatus = get(candidateStatusSelectors, electionRoundCandidateKey)
				return candidateStatus === `running`
			})
			let topTier = Number.POSITIVE_INFINITY
			let nextTier = Number.POSITIVE_INFINITY
			for (const [, { tier }] of stillRunning) {
				if (tier < topTier) {
					nextTier = topTier
					topTier = tier
				}
				if (tier < nextTier && tier > topTier) {
					nextTier = tier
				}
			}
			const topFavorites = []
			const nextFavorites = []
			for (const [id, { tier }] of stillRunning) {
				if (tier === topTier) {
					topFavorites.push(id)
				} else if (tier === nextTier) {
					nextFavorites.push(id)
				}
			}
			return [topFavorites, nextFavorites]
		},
})

export const voterRemainingEnergySelectors = selectorFamily<
	Error | Rational,
	ElectionRoundVoterKey
>({
	key: `voterRemainingEnergy`,
	get:
		(keyEntries) =>
		({ get }) => {
			const keys = fromEntries(keyEntries)
			const remainingEnergy = new Rational(1n)
			const election = get(electionMolecules, keys.election)
			// const votedForCandidateEntries = get(findRelations(votes, keys.voter).candidateEntriesOfVoter)
			const previousElectionRounds = election.rounds.slice(0, keys.round)
			let roundNumber = -1
			for (const round of previousElectionRounds) {
				roundNumber++
				const electionRoundVoterKey = [
					[`election`, keys.election],
					[`round`, roundNumber],
					[`voter`, keys.voter],
				] satisfies ElectionRoundVoterKey
				const [voterFavoritesDuringRound] = get(
					voterCurrentFavoritesSelectors,
					electionRoundVoterKey,
				)
				const numberOfFavoriteCandidates = BigInt(voterFavoritesDuringRound.length)
				const outcome = get(need(round.state.outcome))
				if (outcome instanceof Error) {
					return outcome
				}
				if (outcome.type === `elected`) {
					for (const electedCandidate of outcome.candidates) {
						if (voterFavoritesDuringRound.includes(electedCandidate.key)) {
							const refund = new Rational()
								.add(electedCandidate.surplus)
								.div(electedCandidate.total)
								.div(numberOfFavoriteCandidates)
							remainingEnergy.sub(1n, numberOfFavoriteCandidates).add(refund)
						}
					}
				}
			}
			return remainingEnergy
		},
})

export class ElectionRoundVoterState {
	public constructor(
		bond: CtorToolkit<ElectionRoundVoterKey>[`bond`],
		public favorites = bond(voterCurrentFavoritesSelectors),
		public remainingEnergy = bond(voterRemainingEnergySelectors),
	) {}
}
export const electionRoundVoterMolecules = moleculeFamily({
	key: `electionRoundVoter`,
	new: class ElectionRoundVoter {
		public state: ElectionRoundVoterState
		public constructor(
			tools: CtorToolkit<ElectionRoundVoterKey>,
			public key: string,
		) {
			this.state = new ElectionRoundVoterState(tools.bond)
		}
	},
})
export type ElectionRoundVoterInstance = InstanceType<
	MoleculeType<typeof electionRoundVoterMolecules>
>
