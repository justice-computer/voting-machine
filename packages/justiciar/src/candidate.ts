import type { CtorToolkit } from "atom.io"
import { atomFamily, moleculeFamily, selectorFamily } from "atom.io"
import { findRelations } from "atom.io/data"

import { electionMolecules, votes } from "./election"
import type { ElectionRoundKey } from "./election-round"
import { Rational } from "./rational"
import { need } from "./refinements"
import { voterCurrentFavoritesSelectors } from "./voter"

export type CandidateStatus = `elected` | `eliminated` | `running`

export type CandidateData = {
	type: `candidate`
	id: string
	name: string
}
export const candidateAtoms = atomFamily<CandidateData, string>({
	key: `candidate`,
	default: (id) => ({
		type: `candidate`,
		name: `NO_NAME`,
		id,
		status: `running`,
	}),
})
export const candidateMolecules = moleculeFamily({
	key: `candidate`,
	new: class Candidate {
		public constructor(
			tools: CtorToolkit<string>,
			public key: string,
			public state = tools.bond(candidateAtoms),
		) {}
	},
})

export type ElectionRoundCandidateKey = {
	electionRound: ElectionRoundKey
	candidate: string
}
export const candidateStatusSelectors = selectorFamily<
	CandidateStatus | Error,
	ElectionRoundCandidateKey
>({
	key: `candidateStatus`,
	get:
		(keys) =>
		({ get }) => {
			const election = get(electionMolecules, keys.electionRound.election)
			const previousElectionRounds = election.rounds.slice(0, keys.electionRound.round)
			let status: CandidateStatus = `running`
			for (const round of previousElectionRounds) {
				const outcome = get(need(round.state.outcome))
				if (outcome instanceof Error) {
					return outcome
				}
				if (outcome.candidates.some(({ key }) => key === keys.candidate)) {
					status = outcome.type
				}
			}
			return status
		},
})

export type AlternativeConsensus = {
	[candidateKey: string]: Rational
}
export const candidateAlternativeConsensusSelectors = selectorFamily<
	AlternativeConsensus | Error,
	ElectionRoundCandidateKey
>({
	key: `candidateAlternativeConsensus`,
	get:
		(keys) =>
		({ get, seek }) => {
			const voterKeysForCandidateSelector = findRelations(
				votes,
				keys.candidate,
			).voterKeysOfCandidate
			const voterKeysForCandidate = get(voterKeysForCandidateSelector)
			const alternativeConsensus: AlternativeConsensus = {}
			for (const voterKey of voterKeysForCandidate) {
				const voterCurrentFavoritesSelector = seek(voterCurrentFavoritesSelectors, {
					electionRound: keys.electionRound,
					voter: voterKey,
				})
				if (!voterCurrentFavoritesSelector) {
					return new Error(`Could not find voterCurrentFavorites for voter "${voterKey}"`)
				}
				const [topTier, nextTier] = get(voterCurrentFavoritesSelector)
				const candidateIsTopTier = topTier.includes(keys.candidate)
				if (candidateIsTopTier) {
					const voterAlternatives =
						topTier.length === 1 ? nextTier : topTier.filter((key) => key !== keys.candidate)

					const numberOfCandidatesCurrentlySharingVote = topTier.length
					const numberOfCandidatesWhoWillShareVote = voterAlternatives.length
					const voteDivisor = BigInt(
						numberOfCandidatesCurrentlySharingVote * numberOfCandidatesWhoWillShareVote,
					)
					for (const voterAlternative of voterAlternatives) {
						let alternative = alternativeConsensus[voterAlternative]
						if (!alternative) {
							alternative = new Rational()
							alternativeConsensus[voterAlternative] = alternative
						}
						alternative.add(1n, voteDivisor)
					}
				}
			}
			return alternativeConsensus
		},
})

export class ElectionRoundCandidateState {
	public constructor(
		bond: CtorToolkit<ElectionRoundCandidateKey>[`bond`],
		public status = bond(candidateStatusSelectors),
		public alternativeConsensus = bond(candidateAlternativeConsensusSelectors),
	) {}
}
export const electionRoundCandidateMolecules = moleculeFamily({
	key: `electionRoundCandidate`,
	new: class ElectionRoundCandidate {
		public state: ElectionRoundCandidateState
		public constructor(
			tools: CtorToolkit<ElectionRoundCandidateKey>,
			public key: ElectionRoundCandidateKey,
		) {
			this.state = new ElectionRoundCandidateState(tools.bond)
		}
	},
})
