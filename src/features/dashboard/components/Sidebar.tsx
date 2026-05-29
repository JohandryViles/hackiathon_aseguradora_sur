import { AlertTriangle } from "lucide-react";

import { navItems } from "@/shared/constants/navigation";

export function Sidebar() {
	return (
		<aside className="hidden border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
			<div className="sticky top-0 flex h-screen flex-col p-4 xl:p-5">
				<div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
						<img
							alt="Logo Aseguradora del Sur"
							className="h-full w-full object-contain"
							src="/Logo_aseguradora.png"
						/>
					</div>
					<div>
						<p className="text-sm font-bold">Aseguradora del Sur</p>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Analisis de siniestros
						</p>
					</div>
				</div>

				<nav className="mt-6 space-y-1">
					{navItems.map((item) => (
						<a
							className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
							href={item.href}
							key={item.href}
						>
							<item.icon aria-hidden size={17} />
							{item.label}
						</a>
					))}
				</nav>

				<div className="ui-surface mt-auto p-4">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<AlertTriangle aria-hidden className="text-amber-600" size={16} />
						Importante
					</div>
					<p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
						Detector de Posibles Fraudes en Siniestros usando Inteligencia Artificial
					</p>
				</div>
			</div>
		</aside>
	);
}
