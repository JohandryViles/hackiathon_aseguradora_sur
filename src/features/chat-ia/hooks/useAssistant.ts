import { useAction } from "convex/react";
import { type FormEvent, useState } from "react";

import { api } from "@/shared/services/convexApi";
import type { AssistantResponse } from "@/features/chat-ia/types";
import { friendlyConvexError } from "@/shared/utils/friendlyConvexError";

export function useAssistant() {
	const [nlQuestion, setNlQuestion] = useState("");
	const [assistantResponse, setAssistantResponse] =
		useState<AssistantResponse | null>(null);
	const [assistantLoading, setAssistantLoading] = useState(false);
	const [assistantError, setAssistantError] = useState<string | null>(null);
	const askAssistant = useAction(api.claims.askAnalystAssistantWithLLM);

	const runAssistant = async (question: string) => {
		const trimmed = question.trim();
		if (!trimmed) return;
		setAssistantLoading(true);
		setAssistantError(null);
		try {
			const response = await askAssistant({ question: trimmed });
			setAssistantResponse(response);
		} catch (error) {
			setAssistantError(friendlyConvexError(error));
		} finally {
			setAssistantLoading(false);
		}
	};

	const onAsk = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void runAssistant(nlQuestion);
	};

	const askQuickQuestion = (question: string) => {
		setNlQuestion(question);
		void runAssistant(question);
	};

	return {
		nlQuestion,
		setNlQuestion,
		assistantResponse,
		assistantLoading,
		assistantError,
		onAsk,
		askQuickQuestion,
	};
}
