import type { CtorToolkit, MoleculeType } from "atom.io"
import { atomFamily, moleculeFamily, setState, transaction } from "atom.io"
import { editRelations, join } from "atom.io/data"

import { candidateMolecules } from "./candidate"
import { droopQuotaSelectors } from "./droop"
import type { ElectionRoundInstance, ElectionRoundKey } from "./election-round"
import { electionRoundMolecules } from "./election-round"
import type { Ballot } from "./voter"

export type ElectionPhase =
	| { name: `counting`; voterRegistrationIsOpen: false; currentRound: bigint }
	| { name: `registration`; voterRegistrationIsOpen: true }
	| { name: `voting`; voterRegistrationIsOpen: boolean }

const electionPhaseAtoms = atomFamily<ElectionPhase, string>({
	key: `electionPhase`,
	default: { name: `registration`, voterRegistrationIsOpen: true },
})

export type ElectionConfig = {
	numberOfWinners: bigint
	votingTiers: ReadonlyArray<bigint>
}
export const electionConfigAtoms = atomFamily<ElectionConfig, string>({
	key: `electionConfig`,
	default: { numberOfWinners: 1n, votingTiers: [1n] },
})

export const electionRoundsLengthAtoms = atomFamily<number, string>({
	key: `electionRoundsLength`,
	default: 0,
})

export const votes = join(
	{
		key: `votes`,
		between: [`voter`, `candidate`],
		cardinality: `n:n`,
	},
	{
		tier: 0 as number,
	},
)

export const electionCandidates = join({
	key: `electionCandidates`,
	between: [`election`, `candidate`],
	cardinality: `1:n`,
})

export const registeredVoters = join({
	key: `registeredVoters`,
	between: [`voter`, `election`],
	cardinality: `n:n`,
})

export class ElectionState {
	public constructor(
		bond: CtorToolkit<string>[`bond`],
		public config = bond(electionConfigAtoms),
		public roundsLength = bond(electionRoundsLengthAtoms),
		public droopQuota = bond(droopQuotaSelectors),
		public phase = bond(electionPhaseAtoms),
		public candidates = bond(electionCandidates, { as: `election` }),
		public voters = bond(registeredVoters, { as: `election` }),
	) {}
}
export const electionMolecules = moleculeFamily({
	key: `election`,
	new: class Election {
		public state: ElectionState
		public rounds: ElectionRoundInstance[] = []
		public constructor(
			private tools: CtorToolkit<string>,
			public key: string,
			config: ElectionConfig,
		) {
			this.state = new ElectionState(tools.bond)
			this.tools.set(this.state.config, config)
		}
		public registerVoter = transaction<(voterId: string) => void>({
			key: `registerVoter`,
			do: ({ get }, voterId) => {
				const phase = get(this.state.phase)
				if (phase.voterRegistrationIsOpen === false) {
					throw new Error(`Tried to register voter "${voterId}" but voter registration is closed`)
				}
				editRelations(registeredVoters, (voters) => {
					voters.set({ election: this.key, voter: voterId })
				})
			},
		})
		public registerCandidate = transaction<(candidateId: string) => void>({
			key: `registerCandidate`,
			do: ({ make, get }, candidateId) => {
				const phase = get(this.state.phase)
				if (phase.name !== `registration`) {
					throw new Error(
						`Tried to register candidate "${candidateId}" but this election is in the "${phase.name}" phase, not the "registration" phase`,
					)
				}
				editRelations(electionCandidates, (candidates) => {
					candidates.set({ election: this.key, candidate: candidateId })
				})
				make({ type: `molecule`, key: this.key }, candidateMolecules, candidateId)
			},
		})
		public castBallot = transaction<(ballot: Ballot) => void>({
			key: `castBallot`,
			do: ({ get }, ballot) => {
				const phase = get(this.state.phase)
				if (phase.name !== `voting`) {
					throw new Error(
						`Tried to cast ballot for election "${this.key}" but this election is the "${phase.name}" phase, not the "voting" phase`,
					)
				}
				const { voterId } = ballot
				const voterKeys = get(this.state.voters.relatedKeys)
				if (!voterKeys.includes(voterId)) {
					throw new Error(`Voter "${voterId}" not registered in election "${this.key}"`)
				}

				const votesByTier = ballot.votes[this.key]

				const electionConfig = get(this.state.config)
				const maximumTiers = electionConfig.votingTiers.length
				if (votesByTier.length > maximumTiers) {
					throw new Error(
						`Ballot "${voterId}" for election "${this.key}" submitted too many tiers; wanted a maximum of ${maximumTiers}, got ${votesByTier.length}`,
					)
				}

				const candidateKeys = get(this.state.candidates.relatedKeys)

				editRelations(votes, (relations) => {
					let idx = 0
					while (idx < votesByTier.length) {
						// TODO: Handle invalid ballots
						const tier = votesByTier[idx]
						const tierMax = electionConfig.votingTiers[idx]
						if (tier.length > tierMax) {
							throw new Error(
								`Ballot for election ${this.key} submitted too many votes for tier ${idx}; wanted a maximum of ${tierMax}, got ${tier.length}`,
							)
						}
						for (const candidateId of tier) {
							if (!candidateKeys.includes(candidateId)) {
								throw new Error(
									`Ballot for election ${this.key} submitted incorrect candidate at tier ${idx}; candidate "${candidateId}" not registered in election`,
								)
							}

							relations.set({ candidate: candidateId, voter: voterId }, { tier: idx })
						}
						idx++
					}
				})

				return null
			},
		})

		public beginVoting = transaction<() => void>({
			key: `beginVoting`,
			do: ({ get, set }) => {
				const phase = get(this.state.phase)
				if (phase.name !== `registration`) {
					throw new Error(
						`Tried to begin voting for election "${this.key}" but this election is in the "${phase.name}" phase, not the "registration" phase`,
					)
				}
				set(this.state.phase, {
					name: `voting`,
					voterRegistrationIsOpen: true,
				})
			},
		})

		public closeVoterRegistration = transaction<() => void>({
			key: `closeVoterRegistration`,
			do: ({ get, set }) => {
				const phase = get(this.state.phase)
				if (phase.name !== `voting`) {
					throw new Error(
						`Tried to close voter registration for election "${this.key}" but this election is in the "${phase.name}" phase, not the "voting" phase`,
					)
				}
				set(this.state.phase, {
					name: `voting`,
					voterRegistrationIsOpen: false,
				})
			},
		})

		public beginCounting = transaction<() => void>({
			key: `beginCounting`,
			do: ({ get, set }) => {
				const phase = get(this.state.phase)
				if (phase.name !== `voting`) {
					throw new Error(
						`Tried to begin counting for election "${this.key}" but this election is the "${phase.name}" phase, not the "voting" phase`,
					)
				}
				set(this.state.phase, {
					name: `counting`,
					voterRegistrationIsOpen: false,
					currentRound: 0n,
				})
			},
		})

		public spawnRound(): ElectionRoundInstance {
			const keys = [
				[`election`, this.key],
				[`round`, this.rounds.length],
			] satisfies ElectionRoundKey
			const token = this.tools.spawn(electionRoundMolecules, keys, this)
			const round = this.tools.get(token)
			this.rounds.push(round)
			setState(this.state.roundsLength, this.rounds.length)
			round.setup()
			return round
		}
	},
})
export type ElectionInstance = InstanceType<MoleculeType<typeof electionMolecules>>
