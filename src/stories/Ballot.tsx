import "~/src/font-face.scss"

import { atomFamily, selectorFamily, setState } from "atom.io"
import { findState } from "atom.io/ephemeral"
import { useO } from "atom.io/react"
import { motion } from "framer-motion"
import type { ElectionConfig } from "justiciar"
import { useEffect, useState } from "react"

import scss from "./Ballot.module.scss"
import { Bubble } from "./Bubble"

type BallotElectionProps = {
	displayName: string
	id: string
	candidates: {
		displayName: string
		id: string
	}[]
	config: ElectionConfig
}
export type BallotProps = {
	title: string
	elections: BallotElectionProps[]
}

const checkboxAtoms = atomFamily<boolean, { election: string; candidate: string; tier: number }>({
	key: `ballot`,
	default: false,
})

const electionConfigAtoms = atomFamily<ElectionConfig, string>({
	key: `electionConfig`,
	default: { numberOfWinners: 1n, votingTiers: [1n] },
})

const electionCandidatesAtoms = atomFamily<{ id: string; displayName: string }[], string>({
	key: `electionCandidates`,
	default: [],
})

const tiersByCandidateSelectors = selectorFamily<bigint[], { election: string; candidate: string }>(
	{
		key: `tiersByCandidate`,
		get:
			(keys) =>
			({ get }) => {
				const electionConfig = get(electionConfigAtoms, keys.election)
				const votesForCandidate = electionConfig.votingTiers.filter((_, tier) =>
					get(checkboxAtoms, {
						election: keys.election,
						candidate: keys.candidate,
						tier: Number(tier),
					}),
				)
				return votesForCandidate
			},
	},
)

const candidatesByTierSelectors = selectorFamily<
	{ id: string; displayName: string }[],
	{ election: string; tier: number }
>({
	key: `candidatesByTier`,
	get:
		(keys) =>
		({ get }) => {
			const electionCandidates = get(electionCandidatesAtoms, keys.election)
			const votesInTier = electionCandidates.filter((candidate) =>
				get(checkboxAtoms, {
					election: keys.election,
					candidate: candidate.id,
					tier: keys.tier,
				}),
			)
			return votesInTier
		},
})

export const transposedRankingsSelectors = selectorFamily<
	{ candidateKey: string; written: number; actual: number }[],
	string
>({
	key: `transposedRankings`,
	get:
		(electionKey) =>
		({ get, find }) => {
			const electionTiers = get(find(electionConfigAtoms, electionKey)).votingTiers
			console.log({ electionTiers })
			const candidatesVotedFor: string[] = []
			const skippedTiers: number[] = []
			const transposedRankings: { candidateKey: string; written: number; actual: number }[] = []
			for (const [idx] of electionTiers.entries()) {
				const candidates = get(
					find(candidatesByTierSelectors, {
						election: electionKey,
						tier: idx,
					}),
				)
				if (candidates.length !== 1 || candidatesVotedFor.includes(candidates[0].id)) {
					skippedTiers.push(idx)
				} else {
					candidatesVotedFor.push(candidates[0].id)
					if (skippedTiers.length > 0) {
						transposedRankings.push({
							candidateKey: candidates[0].id,
							written: idx,
							actual: idx - skippedTiers.length,
						})
					}
				}
			}
			console.log({ transposedRankings, skippedTiers, candidatesVotedFor })
			return transposedRankings
		},
})

type Overvote =
	| {
			on: `candidate`
			id: string
			description: string
	  }
	| {
			on: `tier`
			idx: number
			description: string
	  }
const overvotesSelectors = selectorFamily<Overvote[], string>({
	key: `overvote`,
	get:
		(electionKey) =>
		({ get, find }) => {
			const overvotes: Overvote[] = []
			const electionCandidates = get(find(electionCandidatesAtoms, electionKey))
			for (const candidate of electionCandidates) {
				const tiers = get(
					find(tiersByCandidateSelectors, {
						election: electionKey,
						candidate: candidate.id,
					}),
				)
				if (tiers.length > 1) {
					overvotes.push({
						on: `candidate`,
						id: candidate.id,
						description: `${candidate.displayName} cannot be listed in more than one tier`,
					})
				}
			}
			const electionTiers = get(find(electionConfigAtoms, electionKey)).votingTiers
			for (const [idx] of electionTiers.entries()) {
				const candidates = get(
					find(candidatesByTierSelectors, {
						election: electionKey,
						tier: idx,
					}),
				)
				if (candidates.length > 1) {
					overvotes.push({
						on: `tier`,
						idx: idx,
						description: `More than one candidate was listed in tier ${idx + 1}`,
					})
				}
			}
			return overvotes
		},
})

export function BallotSheet({ title, elections }: BallotProps): JSX.Element {
	return (
		<article className={scss.class}>
			<header>
				<h1>{title}</h1>
			</header>
			<span />
			<main>
				{elections.map((election) => (
					<BallotElection key={election.id} {...election} />
				))}
			</main>
		</article>
	)
}

function BallotElection({ id, displayName, candidates, config }: BallotElectionProps): JSX.Element {
	useEffect(() => {
		setState(electionCandidatesAtoms, id, candidates)
		setState(electionConfigAtoms, id, config)
	}, [])
	return (
		<>
			<section key={displayName}>
				<h2>{displayName}</h2>
				<ul>
					<li data-description>
						<header>Name</header>
						<main>
							{config.votingTiers.map((_, idx) => (
								<span key={idx} id={`${id}-tier-${idx}-A`}>
									{idx + 1}
								</span>
							))}
						</main>
					</li>
					{candidates.map((candidate, idx) => {
						const isLastCandidate = idx === candidates.length - 1
						return (
							<li key={candidate.id}>
								<header id={`${id}-candidate-${candidate.id}-A`}>{candidate.displayName}</header>
								<main>
									{config.votingTiers.map((_, i) => {
										const isLastTier = i === config.votingTiers.length - 1
										return (
											<span
												key={i}
												id={isLastTier ? `${id}-candidate-${candidate.id}-Z` : undefined}
											>
												<span id={isLastCandidate ? `${id}-tier-${i}-Z` : undefined}>
													<Bubble
														checkedState={findState(checkboxAtoms, {
															election: id,
															candidate: candidate.id,
															tier: i,
														})}
														color="#05f"
														id={`${id}-${candidate.id}-${i}`}
													/>
												</span>
											</span>
										)
									})}
								</main>
							</li>
						)
					})}
				</ul>
			</section>
			<Overvotes electionKey={id} />
			<TransposedRankings electionKey={id} />
		</>
	)
}

function Overvotes({ electionKey }: { electionKey: string }) {
	const overvotes = useO(overvotesSelectors, electionKey)
	return (
		<aside data-overvotes>
			{overvotes.map((issue) => (
				<OvervoteSpotlight
					key={`id` in issue ? issue.id : issue.idx}
					electionKey={electionKey}
					issue={issue}
				/>
			))}
		</aside>
	)
}

function OvervoteSpotlight({ electionKey, issue }: { electionKey: string; issue: Overvote }) {
	const key = `id` in issue ? issue.id : issue.idx
	return (
		<Spotlight
			elementIds={[`${electionKey}-${issue.on}-${key}-A`, `${electionKey}-${issue.on}-${key}-Z`]}
			updateSignals={[issue]}
			padding={1}
		/>
	)
}

export type ElementPosition = Pick<DOMRect, `height` | `left` | `top` | `width`>
export type SpotlightProps = {
	elementIds: string[] | null
	startingPosition?: ElementPosition
	padding?: number
	updateSignals?: any[]
}

export function Spotlight({
	elementIds,
	startingPosition = {
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	},
	padding = 0,
	updateSignals = [],
}: SpotlightProps): JSX.Element | null {
	const [position, setPosition] = useState(startingPosition)

	useEffect(() => {
		if (!elementIds || elementIds.length === 0) {
			setPosition(startingPosition)
			return
		}
		const elements = elementIds.map((id) => document.getElementById(id)).filter(Boolean)
		if (elements.length > 0) {
			const updatePosition = () => {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				const rects = elements.map((el) => el!.getBoundingClientRect())
				const combinedRect = rects.reduce<Pick<DOMRect, `height` | `left` | `top` | `width`>>(
					(acc, rect) => ({
						top: Math.min(acc.top, rect.top),
						left: Math.min(acc.left, rect.left),
						width:
							Math.max(acc.left + acc.width, rect.left + rect.width) -
							Math.min(acc.left, rect.left),
						height:
							Math.max(acc.top + acc.height, rect.top + rect.height) - Math.min(acc.top, rect.top),
					}),
					rects[0],
				)
				setPosition(combinedRect)
			}
			for (const el of elements) {
				el?.addEventListener(`resize`, updatePosition)
			}
			updatePosition()
			addEventListener(`resize`, updatePosition)
			return () => {
				removeEventListener(`resize`, updatePosition)
				for (const el of elements) {
					el?.removeEventListener(`resize`, updatePosition)
				}
			}
		}
		setPosition(startingPosition)
	}, [elementIds, ...updateSignals])

	return position.width === 0 ? null : (
		<motion.data
			initial={{ opacity: 0, transform: `scale(0.96)` }}
			animate={{ opacity: 1, transform: `scale(1)` }}
			exit={{ opacity: 0, transform: `scale(2)` }}
			transition={{
				type: `spring`,
				stiffness: 500,
				damping: 30,
				duration: 0.1,
			}}
			style={{
				position: `fixed`,
				top: position.top - padding,
				left: position.left - padding,
				width: position.width + padding * 2,
				height: position.height + padding * 2,
			}}
		/>
	)
}

function TransposedRankings({ electionKey }: { electionKey: string }) {
	const transposedRankings = useO(transposedRankingsSelectors, electionKey)
	return (
		<aside data-transposed-rankings>
			{transposedRankings.map(({ candidateKey, written, actual }) => (
				<TransposedRankingsArrow
					key={candidateKey}
					electionKey={electionKey}
					candidateKey={candidateKey}
					written={written}
					actual={actual}
				/>
			))}
		</aside>
	)
}

function TransposedRankingsArrow({
	electionKey,
	candidateKey,
	written,
	actual,
}: { electionKey: string; candidateKey: string; written: number; actual: number }) {
	return (
		<Arrow
			elementIds={[
				`${electionKey}-${candidateKey}-${written}`,
				`${electionKey}-${candidateKey}-${actual}`,
			]}
		/>
	)
}

export type ArrowProps = {
	elementIds: [originId: string, targetId: string]
	originPadding?: number
	targetPadding?: number
	updateSignals?: any[]
}
export type DomPoint = { top: number; left: number }
export function Arrow({
	elementIds,
	originPadding = 0,
	targetPadding = 0,
	updateSignals = [],
}: ArrowProps): JSX.Element | null {
	const [originId, targetId] = elementIds
	const [originPoint, setOriginPoint] = useState<DomPoint>({ top: 0, left: 0 })
	const [targetPoint, setTargetPoint] = useState<DomPoint>({ top: 0, left: 0 })

	useEffect(() => {
		const originElement = document.getElementById(originId)
		const targetElement = document.getElementById(targetId)
		if (originElement && targetElement) {
			const updatePosition = () => {
				const originRect = originElement.getBoundingClientRect()
				const targetRect = targetElement.getBoundingClientRect()

				const originCenterT = originRect.top + originRect.height / 2
				const originCenterL = originRect.left + originRect.width / 2
				const targetCenterT = targetRect.top + targetRect.height / 2
				const targetCenterL = targetRect.left + targetRect.width / 2

				const angle = Math.atan2(targetCenterT - originCenterT, targetCenterL - originCenterL)

				setOriginPoint({
					top: originCenterT + 0.5 - Math.sin(angle) * originPadding,
					left: originCenterL - 0.25 - Math.cos(angle) * originPadding,
				})
				setTargetPoint({
					top: targetCenterT + 0.5 + Math.sin(angle) * targetPadding,
					left: targetCenterL - 0.25 + Math.cos(angle) * targetPadding,
				})
			}
			originElement.addEventListener(`resize`, updatePosition)
			targetElement.addEventListener(`resize`, updatePosition)
			updatePosition()
			addEventListener(`resize`, updatePosition)
			return () => {
				removeEventListener(`resize`, updatePosition)
				originElement.removeEventListener(`resize`, updatePosition)
				targetElement.removeEventListener(`resize`, updatePosition)
			}
		}
	}, [elementIds, ...updateSignals])

	return [originPoint.top, originPoint.left, targetPoint.top, targetPoint.left].includes(
		0,
	) ? null : (
		<svg
			style={{
				position: `fixed`,
				pointerEvents: `none`,
				top: 0,
				left: 0,
				width: `100svw`,
				height: `100svh`,
			}}
		>
			<title>arrow</title>
			<motion.g
				initial={{ opacity: 0, transform: `scale(0.96)` }}
				animate={{ opacity: 1, transform: `scale(1)` }}
				transition={{
					type: `spring`,
					stiffness: 500,
					damping: 30,
					duration: 0.1,
				}}
			>
				<path
					d={`M${originPoint.left},${originPoint.top} L${targetPoint.left},${targetPoint.top}`}
				/>
				<circle cx={targetPoint.left} cy={targetPoint.top} r={3} />
			</motion.g>
		</svg>
	)
}
