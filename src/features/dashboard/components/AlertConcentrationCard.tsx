import { BarChart3 } from "lucide-react";

import { TopList } from "@/features/dashboard/components/TopList";

type AlertConcentrationCardProps = {
	providers: Array<{ label: string; count: number }>;
	cities: Array<{ label: string; count: number }>;
	lines: Array<{ label: string; count: number }>;
};

export function AlertConcentrationCard({
	providers,
	cities,
	lines,
}: AlertConcentrationCardProps) {
	return (
		<div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/60 transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300/40 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/25 dark:hover:shadow-black/35">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="font-semibold">Concentracion de alertas</h2>
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Top de proveedores, ciudades y coberturas con casos no verdes.
					</p>
				</div>
				<BarChart3
					className="shrink-0 text-slate-400 dark:text-slate-500"
					size={20}
				/>
			</div>
			<div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
				<TopList title="Proveedores" items={providers} />
				<TopList title="Ciudades" items={cities} />
				<TopList title="Coberturas" items={lines} />
			</div>
		</div>
	);
}
