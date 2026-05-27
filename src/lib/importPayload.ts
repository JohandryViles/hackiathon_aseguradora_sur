export type PayloadFormat = "json" | "csv";

function parseCsvLine(line: string, separator: string) {
	const values: string[] = [];
	let current = "";
	let quoted = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		const next = line[i + 1];

		if (char === '"' && quoted && next === '"') {
			current += '"';
			i += 1;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			continue;
		}

		if (char === separator && !quoted) {
			values.push(current);
			current = "";
			continue;
		}

		current += char;
	}

	values.push(current);
	return values;
}

export function parseCsvValue(value: string): string | number | boolean {
	const trimmed = value.trim();
	if (!trimmed) return "";
	const lower = trimmed.toLowerCase();
	if (lower === "true" || lower === "si" || lower === "yes") return true;
	if (lower === "false" || lower === "no") return false;
	const maybeNumber = Number(trimmed);
	if (Number.isFinite(maybeNumber)) return maybeNumber;
	return trimmed;
}

export function parseCsvRows(input: string): Array<Record<string, unknown>> {
	const lines = input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length < 2) return [];

	const separator = lines[0].includes(";") ? ";" : ",";
	const headers = parseCsvLine(lines[0], separator).map((header) =>
		header.trim(),
	);
	const rows: Array<Record<string, unknown>> = [];

	for (let i = 1; i < lines.length; i += 1) {
		const cells = parseCsvLine(lines[i], separator);
		const row: Record<string, unknown> = {};
		for (let j = 0; j < headers.length; j += 1) {
			const header = headers[j];
			if (!header) continue;
			row[header] = parseCsvValue(cells[j] ?? "");
		}
		rows.push(row);
	}
	return rows;
}

export function parsePayload(
	payloadFormat: PayloadFormat,
	payload: string,
): Array<Record<string, unknown>> {
	if (payloadFormat === "csv") return parseCsvRows(payload);
	const parsed = JSON.parse(payload) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error("El JSON debe ser un arreglo de objetos");
	}
	return parsed
		.filter((item) => typeof item === "object" && item !== null)
		.map((item) => item as Record<string, unknown>);
}
