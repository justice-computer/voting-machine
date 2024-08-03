import { disposeState, setState } from "atom.io"
import { beforeAll, expect } from "vitest"

import type { Candidate } from "~/src/types"

import {
	checkboxAtoms,
	electionCandidatesAtoms,
	electionConfigAtoms,
	prepareBallot,
} from "./Ballot"

function vote(electionId: string, candidate: Candidate, tier: number): Disposable {
	setState(
		checkboxAtoms,
		{
			election: electionId,
			candidate,
			tier: tier,
		},
		true,
	)
	return {
		[Symbol.dispose]: () => {
			disposeState(checkboxAtoms, { election: electionId, candidate, tier: tier })
		},
	}
}

const jonathanJimble: Candidate = {
	id: `jonathan-jimble`,
	heading: ``,
	details: ``,
	label: ``,
	name: `Jonathan Jimble`,
	avatar: `./avatar.png`,
}
const squigglyMiggly: Candidate = {
	heading: ``,
	details: ``,
	label: ``,
	id: `squiggly-miggly`,
	name: `Squiggly Miggly`,
}
const mrFrog: Candidate = {
	heading: ``,
	details: ``,
	label: ``,
	id: `mr-frog`,
	name: `Mr. Frog`,
}
const mrDog: Candidate = {
	heading: ``,
	details: ``,
	label: ``,
	id: `mr-dog`,
	name: `Mr. Dog`,
}
const mrSpock: Candidate = {
	heading: ``,
	details: ``,
	label: ``,
	id: `mr-spock`,
	name: `Mr. Spock`,
}
const mrRogers: Candidate = {
	heading: ``,
	details: ``,
	label: ``,
	id: `mr-rogers`,
	name: `Mr. Rogers`,
}

beforeAll(() => {
	// clearStore(IMPLICIT.STORE)
	setState(electionConfigAtoms, `potus`, { numberOfWinners: 1, votingTiers: [1, 1, 1, 1, 1, 1] })
	setState(electionCandidatesAtoms, `potus`, [
		jonathanJimble,
		squigglyMiggly,
		mrFrog,
		mrDog,
		mrSpock,
		mrRogers,
	])
})

describe(`Ballot`, () => {
	test(`vote for mister frog`, () => {
		using _v0 = vote(`potus`, mrFrog, 0)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`]])
	})
	test(`vote for mister frog upgrade position`, () => {
		using _v0 = vote(`potus`, mrFrog, 1)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`]])
	})
	test(`vote two and they both move up`, () => {
		using _v0 = vote(`potus`, mrFrog, 1)
		using _v1 = vote(`potus`, squigglyMiggly, 2)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-frog`], [`squiggly-miggly`]])
	})
	test(`fully voted golden path`, () => {
		using _v0 = vote(`potus`, mrFrog, 0)
		using _v1 = vote(`potus`, squigglyMiggly, 1)
		using _v2 = vote(`potus`, jonathanJimble, 2)
		using _v3 = vote(`potus`, mrDog, 3)
		using _v4 = vote(`potus`, mrSpock, 4)
		using _v5 = vote(`potus`, mrRogers, 5)
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
		using _v0 = vote(`potus`, mrFrog, 0)
		using _v1 = vote(`potus`, squigglyMiggly, 0)
		using _v2 = vote(`potus`, mrDog, 1)
		const ballot = prepareBallot(`potus`)
		expect(ballot).toStrictEqual([[`mr-dog`]])
	})
})
