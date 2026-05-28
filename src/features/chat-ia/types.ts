import type { ExportableClaim } from "@/shared/types/claims";

type AssistantResponse = {
	answer: string;
	recommendedAction: string;
	claims: ExportableClaim[];
	usedLLM?: boolean;
	model?: string;
};

export type { AssistantResponse };
