import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

function normalizeHost(value: string | undefined) {
	if (!value) return undefined;
	return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const railwayDomain = normalizeHost(
	process.env.RAILWAY_PUBLIC_DOMAIN ?? process.env.RAILWAY_STATIC_URL,
);

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	preview: {
		host: "0.0.0.0",
		port: Number(process.env.PORT ?? 3000),
		allowedHosts: railwayDomain
			? [railwayDomain, ".up.railway.app", "localhost", "127.0.0.1"]
			: [".up.railway.app", "localhost", "127.0.0.1"],
	},
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
