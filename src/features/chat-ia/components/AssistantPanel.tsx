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
	onQuickQuestion: (question: string) => void;
	quickQuestions: string[];
	riskLevelText: (level: string) => string;
};

export function AssistantPanel({
	nlQuestion,
	assistantLoading,
	assistantError,
	assistantResponse,
	onAsk,
	onQuestionChange,
	onQuickQuestion,
	quickQuestions,
	riskLevelText,
}: AssistantPanelProps) {
	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
			<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
				<form className="space-y-3" onSubmit={onAsk}>
					<input
						className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
						onChange={(event) => onQuestionChange(event.target.value)}
						placeholder="Ej: por que CLM-00001 fue marcado"
						type="text"
						value={nlQuestion}
					/>
					<button
						className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-indigo-400"
						disabled={assistantLoading || !nlQuestion.trim()}
						type="submit"
					>
						<Send aria-hidden size={16} />
						{assistantLoading ? "Consultando" : "Consultar"}
					</button>
				</form>
				<div className="mt-4 flex flex-wrap gap-2">
					{quickQuestions.map((question) => (
						<button
							className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
							key={question}
							onClick={() => onQuickQuestion(question)}
							type="button"
						>
							{question}
						</button>
					))}
				</div>
			</div>

			<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
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
						Selecciona una pregunta rapida o escribe una consulta para obtener casos relacionados.
					</p>
				) : null}
			</div>
		</div>
	);
}
