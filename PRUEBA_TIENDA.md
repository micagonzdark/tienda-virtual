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
| **Fase 4** | Salidas (JSON y Ranking HTML) | ⏳ Pendiente | |
| **Fase 5** | Evals (a)-(g) | ⏳ Pendiente | |
| **Fase 6** | Revisión Semanal y Escenario | ⏳ Pendiente | |
| **Fase 7** | Automatización GitHub Actions | ⏳ Pendiente | |
| **Fase 8** | Prueba Completa e Idempotencia | ⏳ Pendiente | |

---

## 4. Tabla de Evals (Fase 5)
| Caso | Esperado | Resultado | Estado |
|---|---|---|---|
| (a) Producto cuesta más de lo que se cobra | Descartado | *Pendiente* | ⏳ |
| (b) Producto sin reseñas | Informa sin reseñas, no inventa quejas | *Pendiente* | ⏳ |
| (c) Margen cálculo manual vs función | Mismo resultado numérico exacto | *Pendiente* | ⏳ |
| (d) Stock no entra en presupuesto | No lo agrega / descarta | *Pendiente* | ⏳ |
| (e) Margen menor al mínimo (USD 5) | No entra al ranking | *Pendiente* | ⏳ |
| (f) Dato sin fuente confiable | Queda "no confirmado" y valor null | *Pendiente* | ⏳ |
| (g) Modo escenario | No modifica archivos reales en data/ | *Pendiente* | ⏳ |

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
