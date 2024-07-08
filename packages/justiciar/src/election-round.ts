import type { CtorToolkit, MoleculeType, ReadonlySelectorToken } from "atom.io"
import { moleculeFamily, selectorFamily } from "atom.io"
import { findRelations } from "atom.io/data"

import { electionRoundCandidateMolecules } from "./candidate"
import { type ElectionInstance, electionMolecules, votes } from "./election"
import { Rational } from "./rational"
import { need } from "./refinements"
import type { ElectionRoundVoterInstance } from "./voter"
import { electionRoundVoterMolecules, voterRemainingEnergySelectors } from "./voter"

export type ElectionRoundKey = { election: string; round: number }

export type ElectionRoundVoteTotal = { key: string; total: Rational }
export const electionRoundVoteTotalsSelectors = selectorFamily<
	ElectionRoundVoteTotal[],
	ElectionRoundKey
>({
	key: `electionRoundVoteTotals`,
	get:
		(keys) =>
		({ get }) => {
			const election = get(electionMolecules, keys.election)
			const electionRound = get(electionRoundMolecules, keys)

			const candidates = get(election.state.candidates.relatedKeys)
			const runningCandidates = candidates.filter((candidateKey) => {
				const candidateRoundKey = {
					electionRound: keys,
					candidate: candidateKey,
				}
				const candidate = get(electionRoundCandidateMolecules, candidateRoundKey)
				const status = get(candidate.state.status)
				return status === `running`
			})

			const voteTotals = runningCandidates
				.map<ElectionRoundVoteTotal>((candidateKey) => {
					const candidateTotalVote = new Rational()
					const candidateVoterKeys = get(findRelations(votes, candidateKey).voterKeysOfCandidate)

					const candidateVoteNumbers = candidateVoterKeys
						.map<Rational | null>((voterKey) => {
							const voter = electionRound.voters.get(voterKey) ?? electionRound.spawnVoter(voterKey)
							const [voterTopFavorites] = get(voter.state.favorites)
							if (!voterTopFavorites.includes(candidateKey)) {
								return null
							}
							const numerator = get(voterRemainingEnergySelectors, {
								electionRound: keys,
								voter: voterKey,
							})
							if (numerator instanceof Error) {
								return null
							}
							const denominator = BigInt(voterTopFavorites.length)
							return new Rational(1n, denominator).mul(numerator)
						})
						.filter((total) => total !== null)

					for (const rational of candidateVoteNumbers) {
						candidateTotalVote.add(rational)
					}
					return { key: candidateKey, total: candidateTotalVote }
				})
				.sort(({ total: totalA }, { total: totalB }) => (totalA.isGreaterThan(totalB) ? -1 : 1))
			return voteTotals
		},
})

export type ElectedCandidate = { key: string; surplus: Rational; total: Rational }
export type EliminatedCandidate = { key: string }
export type ElectionRoundOutcome =
	| { type: `elected`; candidates: ElectedCandidate[] }
	| { type: `eliminated`; candidates: EliminatedCandidate[] }
export const electionRoundOutcomeSelectors = selectorFamily<
	ElectionRoundOutcome | Error,
	ElectionRoundKey
>({
	key: `electionRoundOutcome`,
	get:
		(keys) =>
		({ get }) => {
			const election = get(electionMolecules, keys.election)
			const electionRound = election.rounds[keys.round]
			const voteTotals = get(need(electionRound.state.voteTotals))
			const droopQuota = get(election.state.droopQuota)
			if (droopQuota instanceof Error) {
				return new Error(
					`Election round outcome could not be calculated because droopQuota calculation failed: ${droopQuota.message}`,
				)
			}

			const winners = voteTotals
				.filter(({ total }) => !droopQuota.isGreaterThan(total))
				.map<ElectedCandidate>(({ key, total }) => {
					const surplus = new Rational().add(total).sub(droopQuota)
					return { key, surplus, total }
				})

			if (winners.length > 0) {
				return { type: `elected`, candidates: winners }
			}

			const losers: { key: string }[] = []
			const loser = voteTotals.at(-1)
			if (loser) {
				losers.push({ key: loser.key })
				for (const { key, total: otherTotal } of voteTotals) {
					if (key === loser.key) {
						continue
					}
					const isEqual = !otherTotal.isGreaterThan(loser.total)
					if (isEqual) {
						losers.push({ key })
					}
				}
			}
			return { type: `eliminated`, candidates: losers }
		},
})

export class ElectionRoundState {
	public voteTotals?: ReadonlySelectorToken<ElectionRoundVoteTotal[]>
	public outcome?: ReadonlySelectorToken<ElectionRoundOutcome | Error>
	public constructor(private bond: CtorToolkit<ElectionRoundKey>[`bond`]) {}
	public setup(): void {
		this.voteTotals = this.bond(electionRoundVoteTotalsSelectors)
		this.outcome = this.bond(electionRoundOutcomeSelectors)
	}
}
export const electionRoundMolecules = moleculeFamily({
	key: `electionRound`,
	new: class ElectionRound {
		public state: ElectionRoundState
		public voters = new Map<string, ElectionRoundVoterInstance>()
		public constructor(
			private tools: CtorToolkit<ElectionRoundKey>,
			public key: ElectionRoundKey,
			public election: ElectionInstance,
		) {
			this.state = new ElectionRoundState(this.tools.bond)
		}
		public setup() {
			const candidates = this.tools.get(this.election.state.candidates.relatedKeys)
			for (const candidate of candidates) {
				this.tools.spawn(electionRoundCandidateMolecules, {
					electionRound: this.key,
					candidate,
				})
			}
			this.state.setup()
		}
		public spawnVoter(
			voterId: string,
		): InstanceType<MoleculeType<typeof electionRoundVoterMolecules>> {
			const key = { electionRound: this.key, voter: voterId }
			const token = this.tools.spawn(electionRoundVoterMolecules, key)
			const roundVoter = this.tools.get(token)
			this.voters.set(voterId, roundVoter)
			return roundVoter
		}
	},
})
export type ElectionRoundInstance = InstanceType<MoleculeType<typeof electionRoundMolecules>>
