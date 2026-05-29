# Deploy del frontend en Railway

Esta guia describe como desplegar este frontend en Railway y dejarlo listo para produccion.

## 1) Prerrequisitos

- Railway CLI instalado.
- Sesion iniciada en Railway (`railway login`).
- Proyecto en Railway (nuevo o existente).

## 2) Comandos base

Desde la raiz del repo:

```bash
railway init --name "aseguradora-sur-convex"
railway up --detach -m "Deploy frontend inicial"
```

Si hay mas de un servicio en el proyecto:

```bash
railway service list --json
railway service link "aseguradora-sur-convex"
railway up --service "<SERVICE_ID>" --detach -m "Deploy frontend"
```

## 3) Variables necesarias en Railway

Configura estas variables en el servicio frontend:

- `VITE_CONVEX_URL`
- `CONVEX_DEPLOYMENT` (opcional para frontend, util para referencia operativa)
- `VITE_CONVEX_SITE_URL` (si aplica en tu flujo)
- `AI_ENABLED` (`true` o `false`, segun entorno)

> Nota: No expongas secretos del backend en variables `VITE_*`.  
> `OPENAI_API_KEY` y variables de LLM deben quedarse en Convex/backend, no en el frontend.

## 4) Verificacion

Revisa estado, logs y dominio:

```bash
railway service status --json
railway logs --lines 200 --json
railway domain --json
```

Si el estado es `SUCCESS` y el dominio responde, el deploy quedo operativo.

## 5) Detalle importante de este proyecto

El repositorio incluye `requirements.txt` por compatibilidad documental. Para evitar autodeteccion de Python en Railway y asegurar deploy de frontend, este proyecto usa `Dockerfile` en la raiz.

## 6) Error comun: "Blocked request. This host is not allowed"

Si Railway responde con ese mensaje, `vite preview` esta bloqueando el dominio externo.

Este proyecto ya contempla el ajuste en `vite.config.ts` usando:

- `preview.host = "0.0.0.0"`
- `preview.port = PORT`
- `preview.allowedHosts` con `RAILWAY_PUBLIC_DOMAIN` y `.up.railway.app`

Si vuelve a aparecer, verifica que el nuevo deployment incluya ese cambio y redeploya.

## 7) Error comun: `500 HTTPError` por Convex URL faltante

Si en logs aparece:

- `missing envar VITE_CONVEX_URL`
- `TypeError: Cannot read properties of undefined (reading 'url')`

entonces el bundle se construyo sin `VITE_CONVEX_URL`.

En este repositorio el `Dockerfile` ya define `ARG`/`ENV` para:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `AI_ENABLED`

Eso garantiza que los valores esten disponibles en `npm run build` durante el deploy.

