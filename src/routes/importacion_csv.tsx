import { createFileRoute } from "@tanstack/react-router";

import { ImportacionCsvPage } from "@/features/importacion/pages/ImportacionCsvPage";

export const Route = createFileRoute("/importacion_csv")({
	component: ImportacionCsvPage,
});
