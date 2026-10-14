# Evaluación de Viabilidad de Clase: Tienda Virtual Autónoma con IA

## 1. Resumen Ejecutivo (Viabilidad para clase de 90 min - 13 años)
*Pendiente de redactar al finalizar la prueba completa con datos reales y mediciones.*

---

## 2. Confiabilidad de los Datos Obtenidos por el Agente
*En desarrollo: se documentarán 3 ejemplos concretos con fuentes exactas y contraste de veracidad.*

---

## 3. Estado y Resultados por Fase

| Fase | Descripción | Estado | Notas / Resultados |
|---|---|---|---|
| **Fase 0** | Diagnóstico de Node y API OpenAI | ✅ Éxito | Node `v24.15.0`. Conexión exitosa a OpenAI con modelo `gpt-4o-mini`. Búsqueda web nativa validada vía `client.responses.create` con tool `web_search_preview` (retorna `web_search_call` y anotaciones con URLs reales). |
| **Fase 1** | Reglas y Candidatos | ✅ Éxito | `data/reglas.json` creado (USD 300 stock, ganancia mín USD 5, max 4 productos). `data/candidatos.json` creado con 6 productos de accesorios celulares y queries optimizadas. |
| **Fase 2** | Función de Cálculo de Margen | ✅ Éxito | `src/calcular_margen.ts` implementado con tool definition. Pruebas unitarias en `src/calcular_margen.test.ts` con 16/16 aserciones pasando (casos manuales, pérdida, valores nulos). |
| **Fase 3** | Agente de Investigación | ✅ Éxito | Búsqueda web nativa ejecutada para 6 candidatos. Error API pública ML: `Status: 403 { message: 'forbidden', error: 'forbidden', status: 403, cause: [] }` (requiere autenticación/OAuth obligatoria). Datos normalizados con fuentes y URLs reales. |
| **Fase 4** | Salidas (JSON y Ranking HTML) | ✅ Éxito | `data/productos.json` generado con fichas completas. `ranking.html` generado con diseño profesional, tabla ordenada por ganancia, links a fuentes, badges de "No confirmado" y sección de descartados. |
| **Fase 5** | Evals (a)-(g) | ✅ Éxito | 7/7 evals aprobados (100% pass) en `src/evals.test.ts`: descarte de pérdidas, sin inventar reseñas, precisión de cálculo, filtro de stock, descarte de margen bajo, omisión de datos sin fuente e inmutabilidad en escenario. |
| **Fase 6** | Revisión Semanal y Escenario | ✅ Éxito | `src/revision_y_escenario.ts` implementado. Genera `data/historial.csv`. `--escenario proveedor25` simula +25% de costos, dictamina mantener 3 productos y descartar 3, sin modificar archivos en disco. |
| **Fase 7** | Automatización GitHub Actions | ✅ Éxito | Workflow `.github/workflows/revision_semanal.yml` creado con cron semanal (`0 9 * * 1`), `workflow_dispatch`, permisos de escritura y manejo seguro de secrets. Sintaxis YAML validada. Pasos documentados en `PENDIENTES_MANUALES.md`. |
| **Fase 8** | Prueba Completa e Idempotencia | ⏳ Pendiente | |

---

## 4. Tabla de Evals (Fase 5)
| Caso | Esperado | Resultado | Estado |
|---|---|---|---|
| **(a) Producto cuesta más de lo que se cobra** | Descartado por rentabilidad negativa | Ganancia: -$7.95 (en caso unitario) / -$5.61 (en prod-004 real). Descartado: true. | ✅ PASS |
| **(b) Producto sin reseñas** | Informa sin reseñas, no inventa quejas | `prod-006`: `hay_resenas: false`, lista `quejas: []` vacía, detalle explícito sin invención. | ✅ PASS |
| **(c) Margen cálculo manual vs función** | Mismo resultado numérico exacto | Manual: $8.35 USD (27.83%). Función: $8.35 USD (27.83%). Coincidencia exacta al centavo. | ✅ PASS |
| **(d) Stock no entra en presupuesto** | No lo agrega / descarta | Costo unitario $350 con presupuesto $300 da `unidades_stock: 0`. Descarte: true. | ✅ PASS |
| **(e) Margen menor al mínimo (USD 5)** | No entra al ranking | Producto con ganancia $3.80 queda excluido del ranking y pasa a tabla de descartados. | ✅ PASS |
| **(f) Dato sin fuente confiable** | Queda "no confirmado" y valor null | Campo sin URL queda `estado: "no confirmado"` y se omite en `calcular_margen` (computado como 0). | ✅ PASS |
| **(g) Modo escenario** | No modifica archivos reales en data/ | `data/productos.json` verificado con SHA-256 idéntico antes y después de simulación. | ✅ PASS |

---

## 5. Tiempos Aproximados por Fase
- **Fase 0**: ~5 minutos (Verificación Node, API OpenAI y herramienta web_search_preview).
- **Fase 1**: En curso.

---

## 6. Acciones Manuales Necesarias
*(Detalladas en [PENDIENTES_MANUALES.md](file:///c:/Users/micag/Documents/proyectos%20personales/14_Pruebas_pre_clase/tienda-virtual/PENDIENTES_MANUALES.md))*

---

## 7. Los 3 Riesgos Más Grandes para 90 Minutos (13 años)
*Se completará en la conclusión.*

---

## 8. Qué Recortar para que Entre en la Clase
*Se completará en la conclusión.*
