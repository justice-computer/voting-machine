import "~/src/font-face.scss"

import { atomFamily, getState, selectorFamily, setState } from "atom.io"
import { findState } from "atom.io/ephemeral"
import { fromEntries } from "atom.io/json"
import { useI, useO } from "atom.io/react"
import { motion } from "framer-motion"
import { Fragment, useEffect, useState } from "react"

import { candidateDetailViewAtom, modalViewAtom } from "~/src/lib/view"
import type { Candidate } from "~/src/types"

import scss from "./Ballot.module.scss"
import { Bubble } from "./Bubble"

export type BallotSheetElection = {
	name: string
	id: string
	candidates: Candidate[]
	users: string[]
	config: {
		numberOfWinners: number
		votingTiers: number[]
	}
}
export type BallotSheetProps = {
	title: string
	elections: BallotSheetElection[]
}

export const checkboxAtoms = atomFamily<
	boolean,
	[[`election`, string], [`candidate`, string], [`tier`, number]]
>({
	key: `ballotSheetCheckbox`,
	default: false,
})

export const electionConfigAtoms = atomFamily<
	{ numberOfWinners: number; votingTiers: number[] },
	string
>({
	key: `ballotSheetElectionConfig`,
	default: { numberOfWinners: 1, votingTiers: [1] },
})

export const electionCandidatesAtoms = atomFamily<Candidate[], string>({
	key: `ballotSheetElectionCandidates`,
	default: [],
})

const candidatesByTierSelectors = selectorFamily<
	Candidate[],
	[[`election`, string], [`tier`, number]]
>({
	key: `ballotSheetCandidatesByTier`,
	get:
		(electionTier) =>
		({ get, find }) => {
			const keys = fromEntries(electionTier)
			const electionCandidates = get(find(electionCandidatesAtoms, keys.election))
			const votesInTier = electionCandidates.filter((candidate) =>
				get(checkboxAtoms, [
					[`election`, keys.election],
					[`candidate`, candidate.id],
					[`tier`, keys.tier],
				]),
			)
			return votesInTier
		},
})

export const transposedRankingsSelectors = selectorFamily<
	{ candidateKey: string; written: number; actual: number }[],
	string
>({
	key: `ballotSheetTransposedRankings`,
	get:
		(electionKey) =>
		({ get, find }) => {
			const transposedRankings: { candidateKey: string; written: number; actual: number }[] = []
			const candidatesVotedFor: string[] = []
			const skippedTiers: number[] = []

			const { votingTiers } = get(find(electionConfigAtoms, electionKey))

			for (const [idx] of votingTiers.entries()) {
				const candidatesAtThisTier = get(candidatesByTierSelectors, [
					[`election`, electionKey],
					[`tier`, idx],
				])
				if (
					candidatesAtThisTier.length !== 1 ||
					candidatesVotedFor.includes(candidatesAtThisTier[0].id)
				) {
					skippedTiers.push(idx)
				} else {
					candidatesVotedFor.push(candidatesAtThisTier[0].id)
					if (skippedTiers.length > 0) {
						transposedRankings.push({
							candidateKey: candidatesAtThisTier[0].id,
							written: idx,
							actual: idx - skippedTiers.length,
						})
					}
				}
			}
			return transposedRankings
		},
})

type Overvote = {
	tierIdx: number
	candidateKeys: string[]
}
const overvotesSelectors = selectorFamily<Overvote[], string>({
	key: `ballotSheetOvervote`,
	get:
		(electionKey) =>
		({ get, find }) => {
			const overvotes: Overvote[] = []
			const electionTiers = get(find(electionConfigAtoms, electionKey)).votingTiers
			for (const [idx] of electionTiers.entries()) {
				const candidates = get(candidatesByTierSelectors, [
					[`election`, electionKey],
					[`tier`, idx],
				])
				if (candidates.length > 1) {
					overvotes.push({
						tierIdx: idx,
						candidateKeys: candidates.map((candidate) => candidate.id),
					})
				}
			}
			return overvotes
		},
})

export const repeatRankingsSelectors = selectorFamily<
	{ candidateKey: string; tier: number }[],
	string
>({
	key: `ballotSheetRepeatRankings`,
	get:
		(electionKey) =>
		({ get, find }) => {
			const repeatRankings: { candidateKey: string; tier: number }[] = []
			const candidatesVotedFor: string[] = []

			const { votingTiers } = get(find(electionConfigAtoms, electionKey))

			for (const [idx] of votingTiers.entries()) {
				const candidates = get(candidatesByTierSelectors, [
					[`election`, electionKey],
					[`tier`, idx],
				])
				if (candidatesVotedFor.includes(candidates[0]?.id)) {
					repeatRankings.push({
						candidateKey: candidates[0].id,
						tier: idx,
					})
				}
				if (candidates.length === 1) {
					candidatesVotedFor.push(candidates[0].id)
				}
			}
			return repeatRankings
		},
})

export function prepareBallot(electionId: string): string[][] {
	const cleanBallot: string[][] = []

	const candidatesVotedFor: string[] = []
	// BUG HERE: votingTiers is default
	const { votingTiers } = getState(electionConfigAtoms, electionId)

	for (const [idx, allowedCandidates] of votingTiers.entries()) {
		const candidatesAtThisTier = getState(candidatesByTierSelectors, [
			[`election`, electionId],
			[`tier`, idx],
		])
		const shouldSkipVote =
			candidatesAtThisTier.length === 0 ||
			candidatesVotedFor.includes(candidatesAtThisTier[0].id) ||
			candidatesAtThisTier.length > allowedCandidates
		if (shouldSkipVote === false) {
			candidatesVotedFor.push(candidatesAtThisTier[0].id)
			cleanBallot.push(candidatesAtThisTier.map((candidate) => candidate.id))
		}
	}

	return cleanBallot
}

export function BallotSheet({ title, elections }: BallotSheetProps): JSX.Element {
	return (
		<article className={scss.class}>
			<header>
				<h1>{title}</h1>
			</header>
			<main>
				{elections.map((election) => (
					<Fragment key={election.id}>
						<span />
						<BallotElection key={election.id} {...election} />
					</Fragment>
				))}
				<span />
			</main>
		</article>
	)
}

function BallotElection({ id, name, candidates, config }: BallotSheetElection): JSX.Element {
	const setSelectedCandidate = useI(candidateDetailViewAtom)
	const setModalView = useI(modalViewAtom)

	useEffect(() => {
		setState(electionCandidatesAtoms, id, candidates)
		setState(electionConfigAtoms, id, config)
	}, [candidates, config])
	return (
		<>
			<section key={name}>
				<h2>{name}</h2>
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
								<header style={{ color: `green` }} id={`${id}-candidate-${candidate.id}-A`}>
									<button
										onClick={() => {
											setSelectedCandidate(candidate)
											setModalView(`candidate-detail`)
										}}
										type="button"
									>
										<img src="./info-icon.svg" alt="info" />
										{candidate.name}
									</button>
								</header>
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
														checkedState={findState(checkboxAtoms, [
															[`election`, id],
															[`candidate`, candidate.id],
															[`tier`, i],
														])}
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
			<RepeatRankings electionKey={id} />
		</>
	)
}

function Overvotes({ electionKey }: { electionKey: string }) {
	const overvotes = useO(overvotesSelectors, electionKey)
	return (
		<aside data-overvotes>
			{overvotes.map((overvote) => (
				<Fragment key={overvote.tierIdx}>
					<Spotlight
						elementIds={[
							`${electionKey}-tier-${overvote.tierIdx}-A`,
							`${electionKey}-tier-${overvote.tierIdx}-Z`,
						]}
						updateSignals={[overvote]}
						padding={1}
					/>
					{overvote.candidateKeys.map((candidateKey) => {
						const elementId = `${electionKey}-${candidateKey}-${overvote.tierIdx}`
						return <XOut key={candidateKey} elementId={elementId} updateSignals={[candidateKey]} />
					})}
				</Fragment>
			))}
		</aside>
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
		const elements = elementIds.map((id) => document.getElementById(id)).filter((el) => el !== null)
		if (elements.length > 0) {
			const updatePosition = () => {
				const rects = elements.map((el) => el.getBoundingClientRect())
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
			data-spotlight
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
				<Arrow
					key={candidateKey}
					elementIds={[
						`${electionKey}-${candidateKey}-${written}`,
						`${electionKey}-${candidateKey}-${actual}`,
					]}
					originOffset={-12}
				/>
			))}
		</aside>
	)
}

export type ArrowProps = {
	elementIds: [originId: string, targetId: string]
	originOffset?: number
	targetOffset?: number
	updateSignals?: any[]
}
export type DomPoint = { top: number; left: number }
export function Arrow({
	elementIds,
	originOffset = 0,
	targetOffset = 0,
	updateSignals = [],
}: ArrowProps): JSX.Element | null {
	const [originId, targetId] = elementIds
	const [originPoint, setOriginPoint] = useState<DomPoint>({ top: Number.NaN, left: Number.NaN })
	const [targetPoint, setTargetPoint] = useState<DomPoint>({ top: Number.NaN, left: Number.NaN })

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
					top: originCenterT + 0.5 - Math.sin(angle) * originOffset,
					left: originCenterL - 0.25 - Math.cos(angle) * originOffset,
				})
				setTargetPoint({
					top: targetCenterT + 0.5 + Math.sin(angle) * targetOffset,
					left: targetCenterL - 0.25 + Math.cos(angle) * targetOffset,
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
		Number.NaN,
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
				data-arrow
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
				<circle cx={targetPoint.left} cy={targetPoint.top} r={4} />
			</motion.g>
		</svg>
	)
}

function RepeatRankings({ electionKey }: { electionKey: string }) {
	const repeatRankings = useO(repeatRankingsSelectors, electionKey)
	return (
		<aside data-repeat-rankings>
			{repeatRankings.map(({ candidateKey, tier }) => (
				<XOut
					key={candidateKey}
					elementId={`${electionKey}-${candidateKey}-${tier}`}
					updateSignals={[candidateKey]}
				/>
			))}
		</aside>
	)
}

export type XOutProps = {
	elementId: string
	updateSignals?: any[]
}
export function XOut({ elementId, updateSignals = [] }: XOutProps): JSX.Element | null {
	const [originPoint, setOriginPoint] = useState<DomPoint>({ top: 0, left: 0 })

	useEffect(() => {
		const originElement = document.getElementById(elementId)
		if (originElement) {
			const updatePosition = () => {
				const originRect = originElement.getBoundingClientRect()

				const originCenterT = originRect.top + originRect.height / 2
				const originCenterL = originRect.left + originRect.width / 2

				setOriginPoint({
					top: originCenterT + 0.5,
					left: originCenterL - 0.25,
				})
			}
			originElement.addEventListener(`resize`, updatePosition)
			updatePosition()
			addEventListener(`resize`, updatePosition)
			return () => {
				removeEventListener(`resize`, updatePosition)
				originElement.removeEventListener(`resize`, updatePosition)
			}
		}
	}, [elementId, ...updateSignals])

	return [originPoint.top, originPoint.left].includes(0) ? null : (
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
			<title>x-out</title>
			<motion.g
				data-x-out
				initial={{ opacity: 0, transform: `scale(0.5)` }}
				animate={{ opacity: 1, transform: `scale(1)` }}
				transition={{
					type: `spring`,
					stiffness: 500,
					damping: 30,
					duration: 0.1,
				}}
			>
				<path
					d={`M${originPoint.left - 8},${originPoint.top - 8} L${originPoint.left + 8},${originPoint.top + 8}`}
				/>
				<path
					d={`M${originPoint.left - 8},${originPoint.top + 8} L${originPoint.left + 8},${originPoint.top - 8}`}
				/>
			</motion.g>
		</svg>
	)
}
