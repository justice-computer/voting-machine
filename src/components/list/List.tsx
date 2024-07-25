import "./list.css"

import { useO } from "atom.io/react"

import { candidatesInCurrentElectionSelector } from "~/src/lib/atomStore"
import type { BallotSheetElection } from "~/src/stories/Ballot"
import { BallotSheet } from "~/src/stories/Ballot"

function List(): JSX.Element {
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)

	const title = `General Election`
	const elections = [
		{
			name: `President of the United States of America`,
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
			<BallotSheet title={title} elections={elections} />
		</div>
	)
}

export default List
