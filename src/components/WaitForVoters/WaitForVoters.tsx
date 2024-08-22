import "./waitForVoters.css"

import { runTransaction } from "atom.io"
import { useO } from "atom.io/react"

import {
	currentElectionVotersSelector,
	joinElectionTX,
	retractSubmittedBallotTX,
} from "~/src/lib/atomStore"

import type { ElectionState } from "../../types"

type WaitForVotersProps = {
	targetState: ElectionState
}

function WaitForVoters({ targetState }: WaitForVotersProps): JSX.Element {
	const currentElectionVoters = useO(currentElectionVotersSelector)
	const joinElection = runTransaction(joinElectionTX)
	const retractSubmittedBallot = runTransaction(retractSubmittedBallotTX)

	return (
		<div className="waitForVoters">
			{currentElectionVoters.length ? (
				<div className="waiting">
					<h1>Waiting for voters...</h1>
					<h2 style={{ padding: `10px` }}>Current voters:</h2>
					<ul>
						{currentElectionVoters.map(({ user, vote }) => (
							<div className="userInfo" key={user.id}>
								<div className="user">
									<img src={user.avatar ?? `./avatar.png`} alt="avatar" />
									<h2>{user?.username}</h2>
									{targetState !== `closed` ? null : vote.finished ? <p>✅</p> : <p>❌</p>}
								</div>
							</div>
						))}
					</ul>
				</div>
			) : (
				<div>
					<h1>Waiting for voters...</h1>
					<p>No voters yet</p>
				</div>
			)}
			{targetState === `closed` && (
				<button
					type="button"
					className="action"
					onClick={() => {
						retractSubmittedBallot()
					}}
				>
					Return to voting
				</button>
			)}
			{targetState === `voting` && (
				<button
					type="button"
					className="action"
					onClick={() => {
						joinElection()
					}}
				>
					Join the vote!
				</button>
			)}
		</div>
	)
}

export default WaitForVoters
