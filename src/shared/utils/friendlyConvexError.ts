export function friendlyConvexError(error: unknown) {
	const raw =
		error instanceof Error
			? error.message
			: "No fue posible conectar con Convex.";
	if (raw.includes("Could not find public function")) {
		return "El backend aun no termino de desplegar funciones. Ejecuta `npx convex dev --once` y recarga la pagina.";
	}
	if (raw.toLowerCase().includes("unauthorized")) {
		return "No hay sesion activa para Convex. Ejecuta `npx convex dev` para autenticar y luego recarga.";
	}
	return raw;
}
