import fs from "node:fs";
import { ConvexHttpClient } from "convex/browser";

function readConvexUrl() {
	const envText = fs.readFileSync(".env.local", "utf8");
	const match = envText.match(/^VITE_CONVEX_URL=(.+)$/m);
	if (!match) {
		throw new Error("VITE_CONVEX_URL no encontrada en .env.local");
	}
	return match[1].trim();
}

function parseCsvLine(line) {
	return line
		.split(",")
		.map((cell) => cell.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
}

function csvToRows(path) {
	const csv = fs.readFileSync(path, "utf8").trim();
	const lines = csv.split(/\r?\n/).filter(Boolean);
	if (lines.length < 2) return [];
	const headers = parseCsvLine(lines[0]);
	return lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
	});
}

async function main() {
	const url = readConvexUrl();
	const rows = csvToRows("data/import_ready/evento/06_vehiculos_import.csv");
	const client = new ConvexHttpClient(url);
	const result = await client.mutation("claims:importVehicles", { rows });
	console.log(JSON.stringify(result, null, 2));
}

void main();
