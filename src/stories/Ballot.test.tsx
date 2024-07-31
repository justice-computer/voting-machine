import { disposeState, setState } from "atom.io"
import { beforeAll, expect } from "vitest"

import {
	checkboxAtoms,
	electionCandidatesAtoms,
	electionConfigAtoms,
	prepareBallot,
} from "./Ballot"

function vote(electionId: string, candidateId: string, tier: number): Disposable {
	setState(
		checkboxAtoms,
		{
			election: electionId,
			candidate: candidateId,
			tier: tier,
		},
		true,
	)
	return {
		[Symbol.dispose]: () => {
			disposeState(checkboxAtoms, { election: electionId, candidate: candidateId, tier: tier })
		},
	}
}

beforeAll(() => {
	// clearStore(IMPLICIT.STORE)
	setState(electionConfigAtoms, `potus`, { numberOfWinners: 1, votingTiers: [1, 1, 1, 1, 1, 1] })
	setState(electionCandidatesAtoms, `potus`, [
		{ id: `jonathan-jimble`, name: `Jonathan Jimble` },
		{ id: `squiggly-miggly`, name: `Squiggly Miggly` },
		{ id: `mr-frog`, name: `Mr. Frog` },
		{ id: `mr-dog`, name: `Mr. Dog` },
		{ id: `mr-spock`, name: `Mr. Spock` },
		{ id: `mr-rogers`, name: `Mr. Rogers` },
	])
})

describe(`Ballot`, () => {
	test(`vote for mister frog`, () => {
		using _v0 = vote(`potus`, `mr-frog`, 0)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`]])
	})
	test(`vote for mister frog upgrade position`, () => {
		using _v0 = vote(`potus`, `mr-frog`, 1)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`]])
	})
	test(`vote two and they both move up`, () => {
		using _v0 = vote(`potus`, `mr-frog`, 1)
		using _v1 = vote(`potus`, `squiggly-miggly`, 2)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`], [`squiggly-miggly`]])
	})
	test(`fully voted golden path`, () => {
		using _v0 = vote(`potus`, `mr-frog`, 0)
		using _v1 = vote(`potus`, `squiggly-miggly`, 1)
		using _v2 = vote(`potus`, `jonathan-jimble`, 2)
		using _v3 = vote(`potus`, `mr-dog`, 3)
		using _v4 = vote(`potus`, `mr-spock`, 4)
		using _v5 = vote(`potus`, `mr-rogers`, 5)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([
			[`mr-frog`],
			[`squiggly-miggly`],
			[`jonathan-jimble`],
			[`mr-dog`],
			[`mr-spock`],
			[`mr-rogers`],
		])
	})
	test(`two votes get eliminated if they vote in the same tier`, () => {
		using _v0 = vote(`potus`, `mr-frog`, 0)
		using _v1 = vote(`potus`, `squiggly-miggly`, 0)
		using _v2 = vote(`potus`, `mr-dog`, 1)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-dog`]])
	})
})
