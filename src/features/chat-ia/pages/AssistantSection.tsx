import { Bot } from "lucide-react";
import type { FormEvent } from "react";

import { AssistantPanel } from "@/features/chat-ia/components/AssistantPanel";
import type { AssistantResponse } from "@/features/chat-ia/types";
import { SectionHeader } from "@/features/dashboard/components/SectionHeader";

type AssistantSectionProps = {
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

export function AssistantSection({
	nlQuestion,
	assistantLoading,
	assistantError,
	assistantResponse,
	onAsk,
	onQuestionChange,
	onQuickQuestion,
	quickQuestions,
	riskLevelText,
}: AssistantSectionProps) {
	return (
		<section className="space-y-4" id="agente">
			<SectionHeader
				icon={Bot}
				kicker="Consultas"
				title="Agente para analistas"
				description="Responde preguntas frecuentes sobre riesgo, proveedores, ciudades, documentos, clientes y resumen ejecutivo."
			/>
			<AssistantPanel
				assistantError={assistantError}
				assistantLoading={assistantLoading}
				assistantResponse={assistantResponse}
				nlQuestion={nlQuestion}
				onAsk={onAsk}
				onQuestionChange={onQuestionChange}
				onQuickQuestion={onQuickQuestion}
				quickQuestions={quickQuestions}
				riskLevelText={riskLevelText}
			/>
		</section>
	);
}
