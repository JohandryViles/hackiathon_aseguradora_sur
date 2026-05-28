export function riskLevelText(level: string) {
	if (level === "red") return "Rojo Alto";
	if (level === "yellow") return "Amarillo Medio";
	if (level === "green") return "Verde Bajo";
	return level;
}
