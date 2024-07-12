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
import type {
	Ballot,
	CandidateStatus,
	ElectionInstance,
	ElectionRoundInstance,
	ElectionRoundOutcome,
} from "justiciar"
import { electionMolecules } from "justiciar"
import type { FunctionComponent, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { db } from "~/src/lib/firebase"
import type { ActualVote, Candidate, ElectionData } from "~/src/types"

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
		[`sort_candidates`, null],
		[`draw_quota_line`, null],
		[`highlight_winners`, null],
	],
	loser_selection: [
		[`show_candidates`, null],
		[`sort_candidates`, null],
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
				setSelf(candidate)
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
			console.log(ballots)
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
		<div className={scss.class}>
			<main>
				<header>{resultsView.round}</header>
				<main>
					<Phase>
						{electionRef.current ? (
							<Keyframe state={state} election={electionRef.current} />
						) : (
							<div data-keyframe="loading">
								<header>loading</header>
							</div>
						)}
					</Phase>
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
	)
}

export const Phases = {
	surplus_allocation: ({ children }) => (
		<div data-phase="surplus_allocation">
			<header>surplus allocation</header>
			<main>{children}</main>
		</div>
	),
	winner_selection: ({ children }) => (
		<div data-phase="winner_selection">
			<header>winner selection</header>
			<main>{children}</main>
		</div>
	),
	loser_selection: ({ children }) => (
		<div data-phase="loser_selection">
			<header>loser selection</header>
			<main>{children}</main>
		</div>
	),
	done: ({ children }) => (
		<div data-phase="done">
			<header>done</header>
			<main>{children}</main>
		</div>
	),
} satisfies Record<ResultsViewPhase, FunctionComponent<{ children: ReactNode }>>

export const Keyframes = {
	// surplus_allocation
	show_surplus_ratio: (_) => (
		<div data-keyframe="show_surplus_ratio">
			<header>show surplus ratio</header>
		</div>
	),
	show_alternative_consensus: (_) => (
		<div data-keyframe="show_alternative_consensus">
			<header>show alternative consensus</header>
		</div>
	),
	compress_alternative_consensus: (_) => (
		<div data-keyframe="compress_alternative_consensus">
			<header>compress alternative consensus</header>
		</div>
	),
	distribute_surplus: (_) => (
		<div data-keyframe="distribute_surplus">
			<header>distribute surplus</header>
		</div>
	),
	// winner_selection
	show_candidates: (_) => (
		<div data-keyframe="show_candidates">
			<header>show candidates</header>
		</div>
	),
	sort_candidates: (_) => (
		<div data-keyframe="sort_candidates">
			<header>sort candidates</header>
		</div>
	),
	draw_quota_line: (_) => (
		<div data-keyframe="draw_quota_line">
			<header>draw quota line</header>
		</div>
	),
	highlight_winners: (_) => (
		<div data-keyframe="highlight_winners">
			<header>highlight winners</header>
		</div>
	),
	// loser_selection
	highlight_losers: (_) => (
		<div data-keyframe="highlight_losers">
			<header>highlight losers</header>
		</div>
	),
	// done
	done: (_) => (
		<div data-keyframe="done">
			<header>done</header>
		</div>
	),
} satisfies Record<
	ResultsViewKeyframe<ResultsViewPhase>[0],
	FunctionComponent<{ state: ResultsViewKeyframe<ResultsViewPhase>[1]; election: ElectionInstance }>
>

export default SeeResults
