import { selector } from "atom.io"

import type { ActualVote, SystemUser } from "../types"
import { currentElectionAtom } from "./election"
import { systemUserAtoms } from "./users"
import { actualVoteSelectors } from "./votes"

export const currentElectionVotersSelector = selector<{ user: SystemUser; vote: ActualVote }[]>({
	key: `currentElectionVoters`,
	get: ({ get }) => {
		const currentElection = get(currentElectionAtom)
		if (!currentElection.id) {
			console.log(`currentElectionVoters: no currentElection`)
			return []
		}
		const electionVoters = currentElection.users.map((userId) => {
			const user = get(systemUserAtoms, userId)
			const vote = get(actualVoteSelectors, userId)
			return { user, vote }
		})
		return electionVoters
	},
})
