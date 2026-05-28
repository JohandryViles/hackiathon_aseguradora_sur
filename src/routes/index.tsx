import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { FriendlyRouteError } from "@/shared/components/FriendlyRouteError";

export const Route = createFileRoute("/")({
	component: DashboardPage,
	errorComponent: FriendlyRouteError,
});


