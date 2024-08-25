import "./list.css"

import { stringifyJson } from "atom.io/json"
import { useO } from "atom.io/react"
import { doc, setDoc } from "firebase/firestore"

import { myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { candidatesInCurrentElectionSelector } from "~/src/lib/election-candidates"
import { db } from "~/src/lib/firebase"
import { type BallotSheetElection, prepareBallot } from "~/src/stories/Ballot"
import { BallotSheet } from "~/src/stories/Ballot"
import type { SerializedVote } from "~/src/types"

function List(): JSX.Element {
	const myself = useO(myselfSelector)
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)
	const currentElection = useO(currentElectionAtom)
	if (!currentElection.id) return <div>No election found</div>

	const elections = [
		{
			name: currentElection.subtitle,
			id: currentElection.id,
			users: currentElection.users,
			candidates,
			config: {
				numberOfWinners: 1,
				// FIXME: hard-coded to 6 tiers
				votingTiers: [1, 1, 1, 1, 1, 1],
			},
		},
	] satisfies BallotSheetElection[]

	const handleFinished = async () => {
		if (myself == null) return
		for (const election of elections) {
			const tierList = stringifyJson(prepareBallot(election.id))
			const newVote: SerializedVote = {
				voterId: myself.id,
				electionId: election.id,
				tierList,
				finished: true,
			}

			await setDoc(doc(db, `votes`, myself.id), newVote)
			if (!election.users.includes(myself.id)) {
				election.users.push(myself.id)
				await setDoc(doc(db, `elections`, election.id), { users: election.users }, { merge: true })
			}
		}
	}

	return (
		<div className="list">
			<BallotSheet title={currentElection.title} elections={elections} />
			<div className="change-icons">
				<button type="button" onClick={handleFinished}>
					<img src="./finish-icon.svg" alt="cancel" />
					Finish Voting
				</button>
			</div>
		</div>
	)
}

export default List
