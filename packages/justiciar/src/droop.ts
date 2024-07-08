import { selectorFamily } from "atom.io"
import { findRelations } from "atom.io/data"

import { electionConfigAtoms, registeredVoters } from "./election"
import { Rational } from "./rational"

export function droopQuota(numberOfVoters: bigint, numberOfWinners: bigint): Rational {
	const numberOfWinnersPlusOne = numberOfWinners + 1n
	return new Rational(numberOfVoters, numberOfWinnersPlusOne)
}

export const droopQuotaSelectors = selectorFamily<Error | Rational, string>({
	key: `droopQuota`,
	get:
		(electionId) =>
		({ get, seek }) => {
			const configAtom = seek(electionConfigAtoms, electionId)
			if (!configAtom) {
				return new Error(
					`Droop Quota calculation relies on electionConfig, which for election "${electionId}" was not found`,
				)
			}
			const { numberOfWinners } = get(configAtom)
			const registeredVoterKeysSelector = findRelations(
				registeredVoters,
				electionId,
			).voterKeysOfElection
			const registeredVoterKeys = get(registeredVoterKeysSelector)
			const numberOfVoters = BigInt(registeredVoterKeys.length)
			const quota = droopQuota(numberOfVoters, numberOfWinners)
			return quota
		},
})
