import "./list.css"

import { useO } from "atom.io/react"

import { candidatesInCurrentElectionSelector, electionAtom } from "~/src/lib/atomStore"
import type { BallotSheetElection } from "~/src/stories/Ballot"
import { BallotSheet } from "~/src/stories/Ballot"

function List(): JSX.Element {
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)
	const election = useO(electionAtom)

	const elections = [
		{
			name: election.subtitle,
			id: `potus`,
			candidates,
			config: {
				numberOfWinners: 1,
				votingTiers: [1, 1, 1, 1, 1, 1],
			},
		},
	] satisfies BallotSheetElection[]

	return (
		<div className="list">
			<BallotSheet title={election.title} elections={elections} />
		</div>
	)
}

export default List
