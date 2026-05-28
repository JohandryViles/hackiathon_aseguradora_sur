import { Bot, Brain, ClipboardList, Gauge, LayoutDashboard } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export type NavItem = {
	href: string;
	label: string;
	icon: IconComponent;
};

export const navItems: NavItem[] = [
	{ href: "#resumen", label: "Resumen", icon: LayoutDashboard },
	{ href: "/ML_AGENTE", label: "ML + Agente", icon: Brain },
	{ href: "#modelo", label: "Datos demo", icon: Gauge },
	{ href: "/casos", label: "Casos", icon: ClipboardList },
	{ href: "#agente", label: "Agente", icon: Bot },
];
