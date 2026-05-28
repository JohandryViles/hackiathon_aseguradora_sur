import { friendlyConvexError } from "@/shared/utils/friendlyConvexError";

type FriendlyRouteErrorProps = {
	error: unknown;
};

export function FriendlyRouteError({ error }: FriendlyRouteErrorProps) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
			<div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
				<h2 className="text-xl font-semibold">
					No se pudo cargar el dashboard
				</h2>
				<p className="mt-2 text-sm">{friendlyConvexError(error)}</p>
				<button
					className="mt-4 inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
					onClick={() => window.location.reload()}
					type="button"
				>
					Reintentar
				</button>
			</div>
		</div>
	);
}
