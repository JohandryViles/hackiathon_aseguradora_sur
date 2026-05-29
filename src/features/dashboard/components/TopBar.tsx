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
		<div className="sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur sm:px-5 md:px-8 dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-black/25">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Aseguradora del Sur
					</p>
					<h1 className="mt-0.5 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
						Deteccion de posibles fraudes en siniestros con IA
					</h1>
				</div>
				<div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap">
					<Link className="ui-btn-primary px-3 sm:px-4" to="/importacion_csv">
						<Upload aria-hidden size={16} />
						Importacion
					</Link>
					<button
						className="ui-btn-secondary px-3 sm:px-4"
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
						className="ui-btn-secondary h-11 w-11 p-0"
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
