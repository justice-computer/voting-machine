import "./waitForVoters.css"

import { runTransaction } from "atom.io"
import { useO } from "atom.io/react"
import { useEffect, useRef } from "react"

import BarChart from "~/src/components/BarChart/BarChart"
import { joinElectionTX, retractSubmittedBallot } from "~/src/lib/election"
import { candidatesInCurrentElectionSelector } from "~/src/lib/election-candidates"
import {
	type CurrentElectionVoters,
	currentElectionVotersSelector,
} from "~/src/lib/election-voters"
import { determineWinnersFromCurrentVotes } from "~/src/lib/justiciar"

import type { ElectionState, GraphableCandidateVote } from "../../types"

type WaitForVotersProps = {
	targetState: ElectionState
}

type LiveCandidateVotes = {
	[candidateId: string]: number[]
}

function getLiveCandidateVotes(currentElectionVoters: CurrentElectionVoters[]): LiveCandidateVotes {
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)
	if (candidates.length === 0) return {}
	const output: LiveCandidateVotes = candidates.reduce((acc: LiveCandidateVotes, candidate) => {
		// FIXME: hard-coded to 6 tiers
		acc[candidate.id] = Array(6).fill(0)
		return acc
	}, {})

	for (const currentElectionVoter of currentElectionVoters) {
		const { vote } = currentElectionVoter
		vote.tierList.forEach((candidateIdList, idx) => {
			// FIXME: hard-coding one vote per tier
			const candidateId = candidateIdList[0]
			if (candidateId === undefined) return
			const currentCount = output[candidateId][idx]
			if (currentCount === undefined) return
			output[candidateId][idx] = currentCount + 1
		})
	}
	return output
}

function transformToGraphable(liveCandidateVotes: LiveCandidateVotes): GraphableCandidateVote[] {
	const candidates = useO(candidatesInCurrentElectionSelector).filter(
		(candidate) => candidate.id !== undefined,
	)
	const output: GraphableCandidateVote[] = Object.entries(liveCandidateVotes).map(
		([candidateId, tierTotals]) => {
			const candidate = candidates.find((c) => c.id === candidateId)
			if (!candidate?.name) throw new Error(`Candidate "${candidateId}" has no name`)
			return {
				// id: candidateId,
				name: candidate.name,
				t1: tierTotals[0],
				t2: tierTotals[1],
				t3: tierTotals[2],
				t4: tierTotals[3],
				t5: tierTotals[4],
				t6: tierTotals[5],
			}
		},
	)
	return output
}

function WaitForVoters({ targetState }: WaitForVotersProps): JSX.Element {
	const currentElectionVoters = useO(currentElectionVotersSelector)
	const joinElection = runTransaction(joinElectionTX)
	const liveCandidateVotes = getLiveCandidateVotes(currentElectionVoters)
	const graphableCandidateVotes = transformToGraphable(liveCandidateVotes)

	useEffect(() => {
		// Start a timer to run the function 1 second after mounting
		const timeoutId = setTimeout(() => {
			// Set up the interval to run the function every second
			const intervalId = setInterval(() => {
				// Your periodic function here
				console.log(`Function is running every second`)
				const winners = determineWinnersFromCurrentVotes()
				console.log(`---------------------------------------`)
				console.log(winners)
				console.log(`---------------------------------------`)
			}, 10000)

			// Cleanup function to stop the interval when the component unmounts
			return () => {
				clearInterval(intervalId)
			}
		}, 5000)

		// Cleanup function to clear the timeout if the component unmounts before the timeout completes
		return () => {
			clearTimeout(timeoutId)
		}
	}, [])

	return (
		<div className="waitForVoters">
			{currentElectionVoters.length ? (
				<>
					<BarChart
						data={graphableCandidateVotes}
						margin={{ top: 20, left: 150, right: 40, bottom: 100 }}
					/>
				</>
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
