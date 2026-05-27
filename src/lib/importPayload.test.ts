import { describe, expect, it } from "vitest";

import { parseCsvRows, parsePayload } from "./importPayload";

describe("import payload parsing", () => {
	it("parses csv values with quoted separators", () => {
		const rows = parseCsvRows(
			'claim_amount,claim_type,description\n1200,theft,"Robo, con denuncia"',
		);

		expect(rows).toEqual([
			{
				claim_amount: 1200,
				claim_type: "theft",
				description: "Robo, con denuncia",
			},
		]);
	});

	it("requires json arrays", () => {
		expect(() => parsePayload("json", '{"claim_amount": 1200}')).toThrow(
			"El JSON debe ser un arreglo de objetos",
		);
	});
});
