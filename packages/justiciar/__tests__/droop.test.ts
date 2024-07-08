import { describe, expect, it } from "vitest"

import { Rational } from "../src"
import { droopQuota } from "../src/droop"
describe(`droopQuota`, () => {
	it(`should return the correct quota`, () => {
		expect(droopQuota(10n, 1n)).toStrictEqual(new Rational(10n, 2n))
		expect(droopQuota(10n, 2n)).toStrictEqual(new Rational(10n, 3n))
		expect(droopQuota(10n, 3n)).toStrictEqual(new Rational(10n, 4n))
	})
})
