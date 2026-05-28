import { Link } from "@tanstack/react-router";
import { Download, Moon, Sun, Upload } from "lucide-react";

type TopBarProps = {
	canExport: boolean;
	isDarkMode: boolean;
	onExport: () => void;
	onToggleTheme: () => void;
};

export function TopBar({
	canExport,
	isDarkMode,
	onExport,
	onToggleTheme,
}: TopBarProps) {
	return (
		<div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8 dark:border-slate-800 dark:bg-slate-950/80">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Aseguradora del Sur
					</p>
					<h1 className="text-2xl font-bold tracking-tight">
						Deteccion de posibles fraudes en siniestros con IA
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Link
						className="inline-flex h-11 items-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 active:bg-slate-900"
						to="/importacion_csv"
					>
						<Upload aria-hidden size={16} />
						Importacion
					</Link>
					<button
						className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 active:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:disabled:border-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-200"
						disabled={!canExport}
						onClick={onExport}
						type="button"
					>
						<Download aria-hidden size={16} />
						Exportar
					</button>
					<button
						aria-label={
							isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
						}
						className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 active:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
						onClick={onToggleTheme}
						type="button"
					>
						{isDarkMode ? (
							<Sun aria-hidden size={18} />
						) : (
							<Moon aria-hidden size={18} />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
