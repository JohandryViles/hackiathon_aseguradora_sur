import { createFileRoute } from "@tanstack/react-router";

import { MlAgentePage } from "@/features/fraude/pages/MlAgentePage";

export const Route = createFileRoute("/ML_AGENTE")({
	component: MlAgentePage,
});
