export function formatNumber(value: number | string, locale = "en-US") {
	if (typeof value === "number") {
		return value.toLocaleString(locale);
	}

	return value;
}
