import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"
import type { UserConfig } from "vitest/config"
import { defineConfig } from "vitest/config"

const VITE_DEVELOPMENT_PORT = Number.parseInt(process.env?.VITE_DEVELOPMENT_PORT ?? `5173`, 10)
export default ({ mode }: { mode: `development` | `production` | `test` }): UserConfig => {
	// Load app-level env vars to node-level env vars.
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

	return defineConfig({
		// @ts-expect-error vitest hates vite plugins
		plugins: [react(), tsConfigPaths({ projects: [`./tsconfig.json`] })],
		test: {
			globals: true,
			environment: `jsdom`,
			setupFiles: `./src/setupTests.js`,
		},
		server: {
			cors: false,
			headers: {
				"Access-Control-Allow-Origin": `*`, // Allow CORS
			},
			host: `0.0.0.0`,
			port: VITE_DEVELOPMENT_PORT,
		},
		build: {
			minify: mode === `production`,
		},
	})
}
