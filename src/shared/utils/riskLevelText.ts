export function riskLevelText(level: string) {
	if (level === "red") return "Alto";
	if (level === "yellow") return "Medio";
	if (level === "green") return "Bajo";
	return level;
}
