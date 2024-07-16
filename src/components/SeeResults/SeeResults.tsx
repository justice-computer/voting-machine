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

const changeFrameTX = transaction<(direction: `next` | `prev`) => void>({
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
		set(resultsViewAtom, {
			round: newRound,
			phase: newPhase,
			frame: newFrame,
		})
	},
})

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
	const electionRef = useRef<ElectionInstance | null>(null)
	const [actualVotes, setActualVotes] = useState<ActualVote[]>([])
	const [candidates, setCandidates] = useState<Candidate[]>([])

	useEffect(() => {
		const electionToken = makeMolecule(root, electionMolecules, `election0`, {
			numberOfWinners: 3n,
			votingTiers: [3n, 3n, 3n],
		})
		const election = getState(electionToken)
		electionRef.current = election

		void getDoc(doc(db, `elections`, `current`)).then(async (snapshot) => {
			const electionData = snapshot.data() as ElectionData
			const votes = await Promise.all<ActualVote>(
				electionData.users.map(async (userKey) => {
					const actualVoteDocToken = doc(db, `votes`, userKey)
					const actualVoteDocSnapshot = await getDoc(actualVoteDocToken)
					const actualVote = actualVoteDocSnapshot.data() as Omit<ActualVote, `voterId`>
					return { ...actualVote, voterId: userKey }
				}),
			)
			setActualVotes(votes)
		})
		void getDocs(collection(db, `candidates`)).then((res) => {
			const candidateSnapshots = res.docs
			const candidateDocs = candidateSnapshots.map((snapshot) => {
				return {
					id: snapshot.id,
					...snapshot.data(),
				} as Candidate
			})
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
			while (resultsView.round > electionRef.current.rounds.length - 1 && safety > 0) {
				electionRef.current.spawnRound()
				safety--
			}
		}
	}, [resultsView.round])

	const changeFrame = runTransaction(changeFrameTX)
	const Phase = Phases[resultsView.phase]
	const Keyframe = Keyframes[resultsView.frame[0]]
	const state = resultsView.frame[1]
	return (
		<LayoutGroup>
			<div className={scss.class}>
				<main>
					<motion.header
						initial={{ opacity: 0, y: -100 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 100 }}
					>
						{resultsView.round}
					</motion.header>
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
							changeFrame(`prev`)
						}}
					>
						prev
					</button>
					<button
						type="button"
						disabled={viewLocation === `end`}
						onClick={() => {
							changeFrame(`next`)
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
			<motion.div layoutId="phase" data-phase="surplus_allocation">
				<motion.header layoutId="phase-header">surplus allocation</motion.header>
				<motion.main layoutId="phase-main">{children}</motion.main>
			</motion.div>
		)
	},
	winner_selection({ children, election }) {
		const roundsLength = useO(election.state.roundsLength)
		return (
			<motion.div layoutId="phase" data-phase="winner_selection">
				<motion.header layoutId="phase-header">winner selection</motion.header>
				<motion.main layoutId="phase-main">{roundsLength > 0 ? children : null}</motion.main>
			</motion.div>
		)
	},
	loser_selection({ children }) {
		return (
			<motion.div layoutId="phase" data-phase="loser_selection">
				<motion.header layoutId="phase-header">loser selection</motion.header>
				<motion.main layoutId="phase-main">{children}</motion.main>
			</motion.div>
		)
	},
	done({ children }) {
		return (
			<motion.div layoutId="phase" data-phase="done">
				<motion.header layoutId="phase-header">done</motion.header>
				<motion.main layoutId="phase-main">{children}</motion.main>
			</motion.div>
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
			<motion.div layoutId="keyframe" data-keyframe="show_surplus_ratio">
				<motion.header layoutId="keyframe-header">show surplus ratio</motion.header>
			</motion.div>
		)
	},
	show_alternative_consensus(_) {
		return (
			<motion.div layoutId="keyframe" data-keyframe="show_alternative_consensus">
				<motion.header layoutId="keyframe-header">show alternative consensus</motion.header>
			</motion.div>
		)
	},
	compress_alternative_consensus(_) {
		return (
			<motion.div layoutId="keyframe" data-keyframe="compress_alternative_consensus">
				<motion.header layoutId="keyframe-header">compress alternative consensus</motion.header>
			</motion.div>
		)
	},
	distribute_surplus(_) {
		return (
			<motion.div layoutId="keyframe" data-keyframe="distribute_surplus">
				<motion.header layoutId="keyframe-header">distribute surplus</motion.header>
			</motion.div>
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
			<motion.div layoutId="keyframe" data-keyframe="show_candidates">
				<motion.header layoutId="keyframe-header">
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
				</motion.header>
				<motion.main layoutId="keyframe-main">
					<motion.ol layoutId="candidates">
						{voteTotals.map(({ total, key }, idx) => {
							return (
								<CandidateTotal
									key={idx}
									candidate={findState(candidateAtoms, key)}
									total={total}
								/>
							)
						})}
					</motion.ol>
				</motion.main>
			</motion.div>
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
		const indexOfFirstNonWinner = voteTotals.findIndex(({ total }) =>
			droopQuota.isGreaterThan(total),
		)
		// biome-ignore lint/style/noNonNullAssertion: INTERDEPENDENCY_ISSUE
		const candidatesByStatus = getState(currentRound.state.candidatesByStatus!)
		return (
			<motion.div layoutId="keyframe" data-keyframe="draw_quota_line">
				<motion.header layoutId="keyframe-header">
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
				</motion.header>
				<motion.main layoutId="keyframe-main">
					<ol>
						{voteTotals.map(({ total, key }, idx) => {
							return (
								<React.Fragment key={idx}>
									{idx === indexOfFirstNonWinner ? (
										<motion.div layoutId="quota-line" transition={{ duration: 2.5 }}>
											droop quota
											<hr data-keyframe="quota-line" />
										</motion.div>
									) : null}
									<CandidateTotal candidate={findState(candidateAtoms, key)} total={total} />
								</React.Fragment>
							)
						})}
					</ol>
				</motion.main>
			</motion.div>
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
			<motion.div layoutId="keyframe" data-keyframe="highlight_winners">
				<motion.header layoutId="keyframe-header">
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
				</motion.header>
				<motion.main layoutId="keyframe-main">
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
				</motion.main>
			</motion.div>
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
			<motion.div layoutId="keyframe" data-keyframe="highlight_losers">
				<motion.header layoutId="keyframe-header">
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
				</motion.header>
			</motion.div>
		)
	},
	// done
	done(_) {
		return (
			<motion.div layoutId="keyframe" data-keyframe="done">
				<motion.header layoutId="keyframe-header">done</motion.header>
			</motion.div>
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
	return (
		<motion.li layoutId={props.candidate.key} data-candidate-total>
			<header>
				<span>{candidate.name}</span>
				{` `}
				<span>
					{numerator.toString()}/{denominator.toString()}
				</span>
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
