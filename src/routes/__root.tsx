import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import ConvexProvider from "../integrations/convex/provider";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Detector IA de Siniestros",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/Logo_aseguradora.png",
				type: "image/png",
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
			<div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					404
				</p>
				<h2 className="mt-2 text-2xl font-semibold">Ruta no encontrada</h2>
				<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
					La pagina que buscas no existe o fue movida.
				</p>
				<Link
					className="mt-4 inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
					to="/"
				>
					Volver al dashboard
				</Link>
			</div>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		const storedTheme = window.localStorage.getItem("theme");
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		const initialIsDark = storedTheme ? storedTheme === "dark" : prefersDark;
		document.documentElement.classList.toggle("dark", initialIsDark);
	}, []);

	return (
		<html lang="es">
			<head>
				<HeadContent />
			</head>
			<body>
				<ConvexProvider>
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				</ConvexProvider>
				<Scripts />
			</body>
		</html>
	);
}
