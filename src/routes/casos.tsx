import { createFileRoute } from "@tanstack/react-router";

import { CasosPage } from "@/features/siniestros/pages/CasosPage";

export const Route = createFileRoute("/casos")({
	component: CasosPage,
});
