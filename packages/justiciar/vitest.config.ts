import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

// @ts-expect-error vite is having a bad week
export default defineConfig({
	// @ts-expect-error vite is having a bad week
	plugins: [tsconfigPaths()],

	test: {
		globals: true,
		coverage: {
			reporter: [`text`, `lcov`, `html`],
			include: [`**/src`],
			exclude: [`__unstable__`],
		},
	},
})
