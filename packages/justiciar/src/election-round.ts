import type { CtorToolkit, MoleculeType, ReadonlySelectorToken } from "atom.io"
import { moleculeFamily, selectorFamily } from "atom.io"
import { findRelations } from "atom.io/data"
import { fromEntries } from "atom.io/json"

import type { ElectionRoundCandidateKey } from "./candidate"
import { electionRoundCandidateMolecules } from "./candidate"
import { type ElectionInstance, electionMolecules, votes } from "./election"
import { Rational } from "./rational"
import { need } from "./refinements"
import type { ElectionRoundVoterInstance, ElectionRoundVoterKey } from "./voter"
import { electionRoundVoterMolecules, voterRemainingEnergySelectors } from "./voter"

export type ElectionRoundKey = [[`election`, string], [`round`, number]]

export type CandidatesByStatus = {
	running: ElectionRoundCandidateKey[]
	elected: ElectionRoundCandidateKey[]
	eliminated: ElectionRoundCandidateKey[]
}
export const electionRoundCandidatesByStatusSelectors = selectorFamily<
	CandidatesByStatus,
	ElectionRoundKey
>({
	key: `electionRoundCandidatesByStatus`,
	get:
		(keyEntries) =>
		({ get }) => {
			const keys = fromEntries(keyEntries)
			const running: ElectionRoundCandidateKey[] = []
			const elected: ElectionRoundCandidateKey[] = []
			const eliminated: ElectionRoundCandidateKey[] = []

			const election = get(electionMolecules, keys.election)
			const candidates = get(election.state.candidates.relatedKeys)

			const runningCandidates = candidates.map(
				(candidateKey) =>
					[
						[`election`, keys.election],
						[`round`, keys.round],
						[`candidate`, candidateKey],
					] satisfies ElectionRoundCandidateKey,
			)
			for (const candidate of runningCandidates) {
				const candidateRoundCandidate = get(electionRoundCandidateMolecules, candidate)
				const status = get(candidateRoundCandidate.state.status)
				switch (status) {
					case `running`:
						running.push(candidate)
						break
					case `elected`:
						elected.push(candidate)
						break
					case `eliminated`:
						eliminated.push(candidate)
						break
				}
			}
			return { running, elected, eliminated }
		},
})

export type ElectionRoundVoteTotal = { key: string; total: Rational }
export const electionRoundVoteTotalsSelectors = selectorFamily<
	ElectionRoundVoteTotal[],
	ElectionRoundKey
>({
	key: `electionRoundVoteTotals`,
	get:
		(keyEntries) =>
		({ get }) => {
			const keys = fromEntries(keyEntries)
			const election = get(electionMolecules, keys.election)
			const electionRound = get(electionRoundMolecules, keyEntries)

			const candidates = get(election.state.candidates.relatedKeys)
			const runningCandidates = candidates.filter((candidateKey) => {
				const candidateRoundCandidateKey = [
					[`election`, keys.election],
					[`round`, keys.round],
					[`candidate`, candidateKey],
				] satisfies ElectionRoundCandidateKey
				const candidate = get(electionRoundCandidateMolecules, candidateRoundCandidateKey)
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
							const electionRoundVoterKey = [
								[`election`, keys.election],
								[`round`, keys.round],
								[`voter`, voterKey],
							] satisfies ElectionRoundVoterKey

							const numerator = get(voterRemainingEnergySelectors, electionRoundVoterKey)
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
		(keyEntries) =>
		({ get }) => {
			const keys = fromEntries(keyEntries)
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
	public candidatesByStatus?: ReadonlySelectorToken<CandidatesByStatus>
	public voteTotals?: ReadonlySelectorToken<ElectionRoundVoteTotal[]>
	public outcome?: ReadonlySelectorToken<ElectionRoundOutcome | Error>
	public constructor(private bond: CtorToolkit<ElectionRoundKey>[`bond`]) {}
	public setup(): void {
		this.voteTotals = this.bond(electionRoundVoteTotalsSelectors)
		this.outcome = this.bond(electionRoundOutcomeSelectors)
		this.candidatesByStatus = this.bond(electionRoundCandidatesByStatusSelectors)
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
				this.tools.spawn(electionRoundCandidateMolecules, [...this.key, [`candidate`, candidate]])
			}
			this.state.setup()
		}
		public spawnVoter(
			voterId: string,
		): InstanceType<MoleculeType<typeof electionRoundVoterMolecules>> {
			const key = [...this.key, [`voter`, voterId]] satisfies ElectionRoundVoterKey
			const token = this.tools.spawn(electionRoundVoterMolecules, key)
			const roundVoter = this.tools.get(token)
			this.voters.set(voterId, roundVoter)
			return roundVoter
		}
	},
})
export type ElectionRoundInstance = InstanceType<MoleculeType<typeof electionRoundMolecules>>
