import { selector } from "atom.io"

import type { ActualVote, SystemUser } from "../types"
import { currentElectionIdAtom, electionAtom } from "./election"
import { systemUserAtoms } from "./users"
import { actualVoteSelectors } from "./votes"

export const currentElectionVotersSelector = selector<{ user: SystemUser; vote: ActualVote }[]>({
	key: `currentElectionVoters`,
	get: ({ get }) => {
		const currentElectionId = get(currentElectionIdAtom)
		if (currentElectionId == null) {
			return []
		}
		const election = get(electionAtom)
		const electionVoters = election.users.map((userId) => {
			const user = get(systemUserAtoms, userId)
			const vote = get(actualVoteSelectors, userId)
			return { user, vote }
		})
		return electionVoters
	},
})
