import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

// @ts-expect-error vitest hates vite plugins
export default defineConfig({
	// @ts-expect-error vitest hates vite plugins
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
