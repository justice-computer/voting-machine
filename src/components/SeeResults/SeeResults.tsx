import type { AtomToken, ReadonlySelectorToken } from "atom.io"
import {
	atom,
	atomFamily,
	disposeState,
	getState,
	makeMolecule,
	makeRootMolecule,
	runTransaction,
	selector,
	transaction,
} from "atom.io"
import { findState } from "atom.io/ephemeral"
import { useO } from "atom.io/react"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { LayoutGroup, motion } from "framer-motion"
import type {
	Ballot,
	CandidateStatus,
	ElectionInstance,
	ElectionRoundInstance,
	ElectionRoundOutcome,
	Rational,
} from "justiciar"
import { electionMolecules } from "justiciar"
import type { FunctionComponent, ReactNode } from "react"
import React, { useEffect, useRef, useState } from "react"

import { currentElectionIdAtom, currentElectionLabelAtom } from "~/src/lib/atomStore"
import { db } from "~/src/lib/firebase"
import type { ActualVote, Candidate, ElectionData } from "~/src/types"

import { CandidatePicture } from "../CandidatePicture/CandidatePicture"
import scss from "./SeeResults.module.scss"

const RESULTS_VIEW_PHASES = [
	`surplus_allocation`,
	`winner_selection`,
	`loser_selection`,
	`done`,
] as const
type ResultsViewPhase = (typeof RESULTS_VIEW_PHASES)[number]
const RESULTS_VIEW_KEYFRAMES = {
	surplus_allocation: [
		[`show_surplus_ratio`, null],
		[`show_alternative_consensus`, null],
		[`compress_alternative_consensus`, null],
		[`distribute_surplus`, null],
	],
	winner_selection: [
		[`show_candidates`, null],
		[`draw_quota_line`, null],
		[`highlight_winners`, null],
	],
	loser_selection: [
		[`show_candidates`, null],
		[`highlight_losers`, null],
	],
	done: [[`done`, null]],
} as const satisfies Record<ResultsViewPhase, [name: string, state: unknown][]>

type ResultsViewKeyframe<Phase extends ResultsViewPhase> =
	(typeof RESULTS_VIEW_KEYFRAMES)[Phase][number]

type ResultsViewState<Phase extends ResultsViewPhase> = {
	round: number
	phase: Phase
	frame: ResultsViewKeyframe<Phase>
}

const resultsViewAtom = atom<ResultsViewState<ResultsViewPhase>>({
	key: `resultsView`,
	default: {
		round: 0,
		phase: `winner_selection`,
		frame: [`show_candidates`, null],
	} satisfies ResultsViewState<`winner_selection`>,
})
const viewLocationSelector = selector<`beginning` | `end` | `middle`>({
	key: `viewLocation`,
	get: ({ get }) => {
		const view = get(resultsViewAtom)
		if (
			view.round === 0 &&
			view.phase === `winner_selection` &&
			view.frame[0] === `show_candidates`
		) {
			return `beginning`
		}
		if (
			view.round === Number.POSITIVE_INFINITY &&
			view.phase === `done` &&
			view.frame[0] === `done`
		) {
			return `end`
		}
		return `middle`
	},
})

const changeFrameTX = transaction<(direction: `next` | `prev`, election: ElectionInstance) => void>(
	{
		key: `nextFrame`,
		do: ({ get, set }, direction) => {
			const state = get(resultsViewAtom)
			let newRound = state.round
			let newPhase: ResultsViewPhase = state.phase
			let newFrame: ResultsViewKeyframe<ResultsViewPhase>
			const currentPhaseFrames = RESULTS_VIEW_KEYFRAMES[state.phase]
			const currentIndex = currentPhaseFrames.findIndex((frame) => frame[0] === state.frame[0])
			const newIndex = currentIndex + (direction === `next` ? 1 : -1)
			newFrame = currentPhaseFrames[newIndex]
			if (!newFrame) {
				switch (direction) {
					case `next`:
						newPhase = RESULTS_VIEW_PHASES[RESULTS_VIEW_PHASES.indexOf(state.phase) + 1]
						break
					case `prev`:
						newPhase = RESULTS_VIEW_PHASES[RESULTS_VIEW_PHASES.indexOf(state.phase) - 1]
						break
				}
				if (newPhase) {
					const newPhaseFrames = RESULTS_VIEW_KEYFRAMES[newPhase]
					switch (direction) {
						case `next`:
							newFrame = newPhaseFrames[0]
							break
						case `prev`:
							newFrame = newPhaseFrames[newPhaseFrames.length - 1]
							break
					}
				} else if (newPhase === undefined) {
					switch (direction) {
						case `next`:
							newRound = state.round + 1
							newPhase = `surplus_allocation`
							newFrame = [`show_surplus_ratio`, null]
							break
						case `prev`:
							newRound = state.round - 1
							newPhase = `done`
							newFrame = [`done`, null]
							break
					}
					if (newRound === -1) {
						console.error(`You are at the beginning and cannot go back!`)
						return
					}
				}
			}
			/* 🚧 ABRIDGED 🚧 */
			switch (direction) {
				case `next`:
					switch (newPhase) {
						case `surplus_allocation`:
							newPhase = `winner_selection`
							newFrame = [`show_candidates`, null]
							break
						case `winner_selection`:
							if (newFrame[0] === `highlight_winners`) {
								newPhase = `done`
								newFrame = [`done`, null]
							}
							break
					}
					break
				case `prev`:
					switch (newPhase) {
						case `loser_selection`:
							newPhase = `winner_selection`
							newFrame = [`draw_quota_line`, null]
							break
						case `surplus_allocation`:
							newRound = state.round - 1
							newPhase = `done`
							newFrame = [`done`, null]
							break
					}
					break
			}
			/* 🚧 ABRIDGED 🚧 */

			set(resultsViewAtom, {
				round: newRound,
				phase: newPhase,
				frame: newFrame,
			})
		},
	},
)

function actualVoteToBallot(actualVote: ActualVote): Ballot {
	const ballot: Ballot = {
		voterId: actualVote.voterId,
		votes: {
			election0: [actualVote.firstChoice, actualVote.secondChoice, actualVote.thirdChoice],
		},
	}
	return ballot
}

const root = makeRootMolecule(`root`)

export const STATUS_COLORS = {
	running: `white`,
	elected: `green`,
	eliminated: `red`,
}

function CandidateView(props: {
	candidate: AtomToken<Candidate>
	status: CandidateStatus
}): JSX.Element {
	const { status } = props
	const candidate = useO(props.candidate)
	const color = STATUS_COLORS[status]
	return (
		<div style={{ color }}>
			<h2>{candidate.name}</h2>
			<p>{candidate.heading}</p>
			<p>{candidate.details}</p>
		</div>
	)
}

function RoundOutcome(props: {
	outcome: ReadonlySelectorToken<ElectionRoundOutcome | Error>
}): JSX.Element {
	const outcome = getState(props.outcome)
	if (outcome instanceof Error) {
		return <div>Error: {outcome.message}</div>
	}

	switch (outcome.type) {
		case `elected`:
			return (
				<div>
					<h2>Elected</h2>
					<ul>
						{outcome.candidates.map((candidate) => (
							<li key={candidate.key}>
								<CandidateView
									candidate={findState(candidateAtoms, candidate.key)}
									status="elected"
								/>
							</li>
						))}
					</ul>
				</div>
			)
		case `eliminated`:
			return (
				<div>
					<h2>Eliminated</h2>
					<ul>
						{outcome.candidates.map((candidate) => (
							<li key={candidate.key}>
								<CandidateView
									candidate={findState(candidateAtoms, candidate.key)}
									status="eliminated"
								/>
							</li>
						))}
					</ul>
				</div>
			)
	}
}

function ElectionRound(props: {
	election: ElectionInstance
	idx: number
	round: ElectionRoundInstance | null
}): JSX.Element {
	const { election, idx, round } = props
	return (
		<div>
			<header>round {idx}</header>
			{round ? (
				<div>
					<main>
						{round.state.outcome ? <RoundOutcome outcome={round.state.outcome} /> : null}
						{round.state.voteTotals ? null : null}
					</main>
				</div>
			) : (
				<button type="button" onClick={() => election.spawnRound()}>
					Spawn Round
				</button>
			)}
		</div>
	)
}

function ElectionRounds(props: {
	election: ElectionInstance
}): JSX.Element {
	const { election } = props
	useO(election.state.roundsLength)
	const currentPhase = useO(election.state.phase)
	switch (currentPhase.name) {
		case `registration`:
		case `voting`:
			return <div>Voting</div>
		case `counting`:
			return (
				<div>
					{election.rounds.map((round, index) => (
						<ElectionRound key={index} election={election} idx={index} round={round} />
					))}
					<ElectionRound election={election} idx={election.rounds.length} round={null} />
				</div>
			)
	}
}

export const candidateAtoms = atomFamily<Candidate, string>({
	key: `candidates`,
	default: (id) => ({
		id,
		type: `candidate`,
		name: `NO_NAME`,
		heading: `NO_HEADING`,
		details: `NO_DETAILS`,
		label: `NO_LABEL`,
		status: `running`,
	}),
	effects: (id) => [
		({ setSelf }) => {
			void getDoc(doc(db, `candidates`, id)).then((snapshot) => {
				const candidate = snapshot.data() as Candidate
				const loadedAvatar = new Image()
				loadedAvatar.src = candidate.avatar ?? `./avatar.png`
				setSelf({ ...candidate, loadedAvatar })
			})
		},
	],
})

function SeeResults(): JSX.Element {
	const resultsView = useO(resultsViewAtom)
	const viewLocation = useO(viewLocationSelector)
	const currentElectionId = useO(currentElectionIdAtom)
	const currentElectionLabel = useO(currentElectionLabelAtom)
	const electionRef = useRef<ElectionInstance | null>(null)
	const [actualVotes, setActualVotes] = useState<ActualVote[]>([])
	const [candidates, setCandidates] = useState<Candidate[]>([])

	console.log(currentElectionLabel)
	useEffect(() => {
		if (currentElectionId === null) {
			return
		}
		const electionToken = makeMolecule(root, electionMolecules, `election0`, {
			numberOfWinners: 3n,
			votingTiers: [3n, 3n, 3n],
		})
		const election = getState(electionToken)
		electionRef.current = election

		void getDoc(doc(db, `elections`, currentElectionId)).then(async (snapshot) => {
			const electionData = snapshot.data() as ElectionData
			console.log({ electionData })
			const votes = await Promise.all<ActualVote>(
				electionData.users.map(async (userKey) => {
					const actualVoteDocToken = doc(db, `votes`, userKey)
					const actualVoteDocSnapshot = await getDoc(actualVoteDocToken)
					const actualVote = actualVoteDocSnapshot.data() as Omit<ActualVote, `voterId`>
					return { ...actualVote, voterId: userKey }
				}),
			)
			console.log(votes)
			setActualVotes(votes)
		})
		void getDocs(collection(db, `candidates`)).then((res) => {
			const candidateSnapshots = res.docs
			const candidateDocs = candidateSnapshots
				.map((snapshot) => {
					return {
						id: snapshot.id,
						...snapshot.data(),
					} as Candidate
				})
				.filter((candidate) => candidate.label === currentElectionLabel)
			setCandidates(candidateDocs)
		})

		return () => {
			if (import.meta.env.PROD) {
				disposeState(electionToken)
			}
		}
	}, [])

	useEffect(() => {
		if (actualVotes.length === 0 || candidates.length === 0) return
		const election = electionRef.current
		if (!election) {
			console.error(`No election found`)
			return
		}
		if (getState(election.state.phase).name === `registration`) {
			for (const actualVote of actualVotes) {
				runTransaction(election.registerVoter)(actualVote.voterId)
			}
			for (const candidate of candidates) {
				const candidateId = candidate.id
				if (!candidateId) {
					console.error(`Candidate "${candidate.name}" has no ID`)
					return
				}
				runTransaction(election.registerCandidate)(candidateId)
			}
			runTransaction(election.beginVoting)()
			const ballots: Ballot[] = actualVotes.map(actualVoteToBallot)
			for (const actualVote of actualVotes) {
				console.log(actualVote)
				const ballot = actualVoteToBallot(actualVote)
				ballots.push(ballot)
				runTransaction(election.castBallot)(ballot)
			}
			runTransaction(election.beginCounting)()
			election.spawnRound()
		}
	}, [actualVotes, candidates])

	useEffect(() => {
		if (electionRef.current && getState(electionRef.current.state.phase).name === `counting`) {
			let safety = 15
			while (resultsView.round > electionRef.current.rounds.length - 2 && safety > 0) {
				console.log(`spawning round ${15 - safety}`)
				electionRef.current.spawnRound()
				safety--
			}
		}
	}, [resultsView.round, resultsView.phase])

	const changeFrame = runTransaction(changeFrameTX)
	const Phase = Phases[resultsView.phase]
	const Keyframe = Keyframes[resultsView.frame[0]]
	const state = resultsView.frame[1]
	return (
		<LayoutGroup>
			<div className={scss.class}>
				<main>
					<header>{resultsView.round}</header>
					<main>
						{electionRef.current ? (
							<Phase election={electionRef.current}>
								<Keyframe state={state} election={electionRef.current} />
							</Phase>
						) : (
							<div data-keyframe="loading">
								<header>loading</header>
							</div>
						)}
					</main>
				</main>
				<nav>
					<button
						type="button"
						disabled={viewLocation === `beginning`}
						onClick={() => {
							if (electionRef.current) {
								changeFrame(`prev`, electionRef.current)
							}
						}}
					>
						prev
					</button>
					<button
						type="button"
						disabled={viewLocation === `end`}
						onClick={() => {
							if (electionRef.current) {
								changeFrame(`next`, electionRef.current)
							}
						}}
					>
						next
					</button>
				</nav>
				<aside>
					{electionRef.current ? <ElectionRounds election={electionRef.current} /> : null}
				</aside>
			</div>
		</LayoutGroup>
	)
}

export const Phases = {
	surplus_allocation({ children }) {
		return (
			<div data-phase="surplus_allocation">
				<header>surplus allocation</header>
				<main>{children}</main>
			</div>
		)
	},
	winner_selection({ children, election }) {
		const roundsLength = useO(election.state.roundsLength)
		return (
			<div data-phase="winner_selection">
				<header>winner selection</header>
				<main>{roundsLength > 0 ? children : null}</main>
			</div>
		)
	},
	loser_selection({ children }) {
		return (
			<div data-phase="loser_selection">
				<header>loser selection</header>
				<main>{children}</main>
			</div>
		)
	},
	done({ children }) {
		return (
			<div data-phase="done">
				<header>done</header>
				<main>{children}</main>
			</div>
		)
	},
} satisfies Record<
	ResultsViewPhase,
	FunctionComponent<{ children: ReactNode; election: ElectionInstance }>
>

export const Keyframes = {
	// surplus_allocation
	show_surplus_ratio(_) {
		return (
			<div data-keyframe="show_surplus_ratio">
				<header>show surplus ratio</header>
			</div>
		)
	},
	show_alternative_consensus(_) {
		return (
			<div data-keyframe="show_alternative_consensus">
				<header>show alternative consensus</header>
			</div>
		)
	},
	compress_alternative_consensus(_) {
		return (
			<div data-keyframe="compress_alternative_consensus">
				<header>compress alternative consensus</header>
			</div>
		)
	},
	distribute_surplus(_) {
		return (
			<div data-keyframe="distribute_surplus">
				<header>distribute surplus</header>
			</div>
		)
	},
	// winner_selection
	show_candidates({ election }) {
		const view = useO(resultsViewAtom)
		const currentRound = election.rounds[view.round]
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const voteTotals = getState(currentRound.state.voteTotals!)
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		return (
			<div data-keyframe="show_candidates">
				<header>
					<span>show candidates</span>

					<CandidateStatusBar
						running={[]}
						elected={candidatesByStatus.elected.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						eliminated={candidatesByStatus.eliminated.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
					/>
				</header>
				<main>
					<ol>
						{voteTotals.map(({ total, key }, idx) => {
							return (
								<CandidateTotal
									key={idx}
									candidate={findState(candidateAtoms, key)}
									total={total}
								/>
							)
						})}
					</ol>
				</main>
			</div>
		)
	},
	draw_quota_line({ election }) {
		const view = useO(resultsViewAtom)
		const currentRound = election.rounds[view.round]
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const voteTotals = getState(currentRound.state.voteTotals!)
		const droopQuota = getState(election.state.droopQuota)

		if (droopQuota instanceof Error) {
			return <div>Error: {droopQuota.message}</div>
		}
		const droopQuotaSimple = droopQuota.simplify()
		const droopQuotaApprox = Number(droopQuotaSimple[0]) / Number(droopQuotaSimple[1])
		const indexOfFirstNonWinner = voteTotals.findIndex(({ total }) =>
			droopQuota.isGreaterThan(total),
		)
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		return (
			<div data-keyframe="draw_quota_line">
				<header>
					<span>draw quota line</span>
					<CandidateStatusBar
						running={[]}
						elected={candidatesByStatus.elected.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						eliminated={candidatesByStatus.eliminated.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
					/>
				</header>
				<main>
					<ol>
						{voteTotals.map(({ total, key }, idx) => {
							return (
								<React.Fragment key={idx}>
									{idx === indexOfFirstNonWinner ? (
										<motion.div layoutId="quota-line" transition={{ duration: 2.5 }}>
											droop quota ({droopQuotaApprox})
											<hr data-keyframe="quota-line" />
										</motion.div>
									) : null}
									<CandidateTotal candidate={findState(candidateAtoms, key)} total={total} />
								</React.Fragment>
							)
						})}
					</ol>
				</main>
			</div>
		)
	},
	highlight_winners({ election }) {
		const view = useO(resultsViewAtom)
		const currentRound = election.rounds[view.round]
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const voteTotals = getState(currentRound.state.voteTotals!)
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const roundOutcome = getState(currentRound.state.outcome!)
		if (roundOutcome instanceof Error) {
			return <div>Error: {roundOutcome.message}</div>
		}
		return (
			<div data-keyframe="highlight_winners">
				<header>
					<span>highlight winners</span>
					<CandidateStatusBar
						running={candidatesByStatus.running
							.filter(
								(candidate) =>
									!(
										roundOutcome.type === `elected` &&
										roundOutcome.candidates.some((c) => c.key === candidate.candidate)
									),
							)
							.map((candidate) => findState(candidateAtoms, candidate.candidate))}
						elected={candidatesByStatus.elected.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						eliminated={candidatesByStatus.eliminated.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
					/>
				</header>
				<main>
					<ol>
						{voteTotals
							.filter(
								(voteTotal) =>
									roundOutcome.type === `elected` &&
									roundOutcome.candidates.some((candidate) => candidate.key === voteTotal.key),
							)
							.map(({ total, key }, idx) => {
								return (
									<CandidateTotal
										key={idx}
										candidate={findState(candidateAtoms, key)}
										total={total}
									/>
								)
							})}
						<motion.div layoutId="quota-line" transition={{ duration: 2.5 }}>
							droop quota
							<hr data-keyframe-quota-line />
						</motion.div>
					</ol>
				</main>
			</div>
		)
	},
	// loser_selection
	highlight_losers({ election }) {
		const view = useO(resultsViewAtom)
		const currentRound = election.rounds[view.round]
		const droopQuota = getState(election.state.droopQuota)

		if (droopQuota instanceof Error) {
			return <div>Error: {droopQuota.message}</div>
		}

		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		return (
			<div data-keyframe="highlight_losers">
				<header>
					<span>highlight losers</span>
					<CandidateStatusBar
						running={candidatesByStatus.running.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						elected={candidatesByStatus.elected.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						eliminated={candidatesByStatus.eliminated.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
					/>
				</header>
			</div>
		)
	},
	// done
	done({ election }) {
		const view = useO(resultsViewAtom)
		const currentRound = election.rounds[view.round]
		const droopQuota = getState(election.state.droopQuota)

		if (droopQuota instanceof Error) {
			return <div>Error: {droopQuota.message}</div>
		}

		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		return (
			<div data-keyframe="done">
				<header>
					<span>done</span>
					<CandidateStatusBar
						running={candidatesByStatus.running.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						elected={candidatesByStatus.elected.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
						eliminated={candidatesByStatus.eliminated.map((candidate) =>
							findState(candidateAtoms, candidate.candidate),
						)}
					/>
				</header>
			</div>
		)
	},
} satisfies Record<
	ResultsViewKeyframe<ResultsViewPhase>[0],
	FunctionComponent<{ state: ResultsViewKeyframe<ResultsViewPhase>[1]; election: ElectionInstance }>
>

export default SeeResults

function CandidateTotal(props: {
	candidate: AtomToken<Candidate>
	total: Rational
}): JSX.Element {
	const candidate = useO(props.candidate)
	const simplified = props.total.simplify()
	const numerator = simplified[0]
	const denominator = simplified[1]
	const total = (Number(numerator) / Number(denominator)).toString()
	const decimalIdx = total.indexOf(`.`)
	const totalApprox = decimalIdx === -1 ? total : total.slice(0, decimalIdx + 4)
	return (
		<motion.li layoutId={props.candidate.key} data-candidate-total>
			<header>
				<span>{candidate.name}</span>
				{` `}
				<span>{totalApprox === total ? total : `~${totalApprox}…`}</span>
			</header>
			<main>
				<CandidatePicture
					candidate={props.candidate}
					size="medium"
					height={[100n, 100n]}
					width={[100n, 100n]}
				/>
				<data>
					{Array.from(props.total.entries()).flatMap(([d, n]) => {
						return Array.from({ length: Number(n) }, (_, i) => (
							<CandidatePicture
								key={`${d.toString()}_${i}_${n.toString()}`}
								candidate={props.candidate}
								size="small"
								height={[1n, 1n]}
								width={[1n, d]}
							/>
						))
					})}
				</data>
			</main>
		</motion.li>
	)
}

function CandidateStatusBar(props: {
	eliminated: AtomToken<Candidate>[]
	running: AtomToken<Candidate>[]
	elected: AtomToken<Candidate>[]
}): JSX.Element {
	return (
		<motion.div data-candidate-status-bar layoutId="candidate-status-bar">
			<motion.div data-candidates="eliminated" layoutId="eliminated-candidates">
				<ul>
					{props.eliminated.map((candidate) => (
						<motion.li key={candidate.key} layoutId={candidate.key} data-candidate-actual>
							<CandidatePicture
								key={candidate.key}
								candidate={candidate}
								size="small"
								height={[1n, 1n]}
								width={[1n, 1n]}
							/>
						</motion.li>
					))}
				</ul>
				<span>✘</span>
			</motion.div>
			<motion.div data-candidates="running" layoutId="running-candidates">
				<ul>
					{props.running.map((candidate) => (
						<motion.li key={candidate.key} layoutId={candidate.key} data-candidate-actual>
							<CandidatePicture
								key={candidate.key}
								candidate={candidate}
								size="small"
								height={[1n, 1n]}
								width={[1n, 1n]}
							/>
						</motion.li>
					))}
				</ul>
			</motion.div>
			<motion.div data-candidates="elected" layoutId="elected-candidates">
				<span>✓</span>
				<ul>
					{props.elected.map((candidate) => (
						<motion.li key={candidate.key} layoutId={candidate.key} data-candidate-actual>
							<CandidatePicture
								key={candidate.key}
								candidate={candidate}
								size="small"
								height={[1n, 1n]}
								width={[1n, 1n]}
							/>
						</motion.li>
					))}
				</ul>
			</motion.div>
		</motion.div>
	)
}
