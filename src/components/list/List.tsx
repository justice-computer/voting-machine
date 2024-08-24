import "./list.css"

import { useO } from "atom.io/react"

import { currentElectionIdAtom, electionAtom } from "~/src/lib/election"
import { candidatesInCurrentElectionSelector } from "~/src/lib/election-candidates"
import type { BallotSheetElection } from "~/src/stories/Ballot"
import { BallotSheet } from "~/src/stories/Ballot"

function List(): JSX.Element {
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)
	const electionId = useO(currentElectionIdAtom)
	const election = useO(electionAtom)
	if (electionId == null) return <div>No election found</div>

	const elections = [
		{
			name: election.subtitle,
			id: electionId,
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
