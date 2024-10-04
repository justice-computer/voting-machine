import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
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
