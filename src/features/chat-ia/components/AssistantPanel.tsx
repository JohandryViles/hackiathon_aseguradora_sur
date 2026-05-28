import { Send } from "lucide-react";
import type { FormEvent } from "react";

import type { AssistantResponse } from "@/features/chat-ia/types";

type AssistantPanelProps = {
	nlQuestion: string;
	assistantLoading: boolean;
	assistantError: string | null;
	assistantResponse: AssistantResponse | null;
	onAsk: (event: FormEvent<HTMLFormElement>) => void;
	onQuestionChange: (value: string) => void;
	quickQuestions: string[];
	claimNumbers: string[];
	riskLevelText: (level: string) => string;
};

function normalizeText(value: string) {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

export function AssistantPanel({
	nlQuestion,
	assistantLoading,
	assistantError,
	assistantResponse,
	onAsk,
	onQuestionChange,
	quickQuestions,
	claimNumbers,
	riskLevelText,
}: AssistantPanelProps) {
	const normalizedQuery = normalizeText(nlQuestion);
	const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
	const relatedSuggestions =
		queryParts.length === 0
			? []
			: quickQuestions
					.filter((question) => {
						const normalizedQuestion = normalizeText(question);
						return (
							normalizedQuestion !== normalizedQuery &&
							queryParts.every((part) => normalizedQuestion.includes(part))
						);
					})
					.slice(0, 5);
	const claimSuggestions =
		queryParts.length === 0
			? []
			: claimNumbers
					.filter((claimNumber) => {
						const normalizedClaimNumber = normalizeText(claimNumber);
						return queryParts.every((part) => normalizedClaimNumber.includes(part));
					})
					.slice(0, 8);
	const hasSuggestions =
		relatedSuggestions.length > 0 || claimSuggestions.length > 0;

	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
			<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
				<form className="space-y-3" onSubmit={onAsk}>
					<input
						aria-autocomplete="list"
						aria-expanded={hasSuggestions}
						aria-label="Consulta para el agente"
						autoComplete="off"
						className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none placeholder:text-slate-500 focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-400"
						onChange={(event) => onQuestionChange(event.target.value)}
						placeholder="Ej: por que CLM-00001 fue marcado"
						spellCheck={false}
						type="text"
						value={nlQuestion}
					/>
					{relatedSuggestions.length > 0 ? (
						<div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
							<p className="mb-1 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
								Sugerencias relacionadas
							</p>
							<div className="flex flex-wrap gap-2" role="listbox">
								{relatedSuggestions.map((suggestion) => (
									<button
										className="inline-flex min-h-11 items-center rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 transition-colors duration-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:bg-indigo-100 dark:border-indigo-700 dark:bg-slate-950 dark:text-indigo-300 dark:hover:bg-slate-800 dark:active:bg-slate-700"
										key={suggestion}
										onClick={() => onQuestionChange(suggestion)}
										role="option"
										type="button"
									>
										{suggestion}
									</button>
								))}
							</div>
						</div>
					) : null}
					{claimSuggestions.length > 0 ? (
						<div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
							<p className="mb-1 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
								Siniestros existentes
							</p>
							<div className="flex flex-wrap gap-2" role="listbox">
								{claimSuggestions.map((claimNumber) => (
									<button
										className="inline-flex min-h-11 items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-slate-800 dark:active:bg-slate-700"
										key={claimNumber}
										onClick={() => onQuestionChange(claimNumber)}
										role="option"
										type="button"
									>
										{claimNumber}
									</button>
								))}
							</div>
						</div>
					) : null}
					<button
						className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-400 dark:disabled:bg-indigo-500/60"
						disabled={assistantLoading || !nlQuestion.trim()}
						type="submit"
					>
						<Send aria-hidden size={16} />
						{assistantLoading ? "Consultando" : "Consultar"}
					</button>
				</form>
			</div>

			<div
				aria-live="polite"
				className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80"
			>
				<h2 className="font-semibold">Respuesta</h2>
				{assistantError ? (
					<p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
						{assistantError}
					</p>
				) : null}
				{assistantLoading ? (
					<p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
						Analizando consulta...
					</p>
				) : null}
				{assistantResponse && !assistantLoading ? (
					<div className="mt-3 space-y-3">
						<p className="text-sm text-slate-800 dark:text-slate-200">
							{assistantResponse.answer}
						</p>
						{assistantResponse.model ? (
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								{assistantResponse.usedLLM
									? `IA generativa: ${assistantResponse.model}`
									: "Agente local basado en reglas"}
							</p>
						) : null}
						<div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-900/40 dark:text-indigo-100">
							<strong>Siguiente accion:</strong> {" "}
							{assistantResponse.recommendedAction}
						</div>
						{assistantResponse.claims.length > 0 ? (
							<ul className="grid gap-2 text-sm md:grid-cols-2">
								{assistantResponse.claims.slice(0, 6).map((claim) => (
									<li
										className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
										key={claim._id}
									>
										<p className="font-semibold">{claim.claimNumber}</p>
										<p className="text-xs text-slate-600 dark:text-slate-300">
											Score {claim.riskScore} - {riskLevelText(claim.riskLevel)}
										</p>
									</li>
								))}
							</ul>
						) : null}
					</div>
				) : !assistantLoading && !assistantError ? (
					<p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
						Escribe una consulta para ver sugerencias y obtener casos relacionados.
					</p>
				) : null}
			</div>
		</div>
	);
}
