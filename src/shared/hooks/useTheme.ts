import { useEffect, useState } from "react";

export function useTheme() {
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		const storedTheme = window.localStorage.getItem("theme");
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		const initialIsDark = storedTheme ? storedTheme === "dark" : prefersDark;
		setIsDarkMode(initialIsDark);
		document.documentElement.classList.toggle("dark", initialIsDark);
	}, []);

	const toggleTheme = () => {
		setIsDarkMode((prev) => {
			const next = !prev;
			document.documentElement.classList.toggle("dark", next);
			window.localStorage.setItem("theme", next ? "dark" : "light");
			return next;
		});
	};

	return { isDarkMode, toggleTheme };
}
