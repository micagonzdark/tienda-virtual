# Diario de Trabajo - Tienda Virtual (Prueba de Viabilidad de Clase)

## Inicio del Experimento
- **Fecha y Hora**: 2026-10-14 16:58
- **Objetivo**: Desarrollar de punta a punta una "tienda virtual" autónoma con Node + TypeScript y evaluar con honestidad la viabilidad de una clase de 90 minutos para un estudiante de 13 años.

## Decisiones Iniciales y Setup
1. **Ubicación y Repositorio**: Se creó la carpeta `tienda-virtual` dentro del directorio de trabajo actual. Se inicializó un repositorio git independiente dentro de `tienda-virtual`.
2. **Entorno**: Node detectado en versión `v24.15.0`, npm `11.12.1`. No se requirió instalación manual de Node.
3. **Manejo de Secretos**: Se configuró `.gitignore` para ignorar `.env` y archivos temporales. Se creó `.env.example`. Se extrajo la clave `OPENAI_API_KEY` del entorno local sin imprimirla en consola ni incluirla en commits. Se configuró `OPENAI_MODEL=gpt-4o-mini` por defecto por costo y velocidad para una clase educativa.
4. **Dependencias**: Se instalaron `typescript`, `@types/node`, `tsx`, `dotenv`, y `openai` para mantener el stack mínimo y sin librerías superfluas (Regla 2).

## Fase 0: Diagnóstico (Completada)
- **Node**: `v24.15.0` verificado correctamente.
- **OpenAI API**: Conexión validada con `OPENAI_API_KEY` y modelo `gpt-4o-mini`.
- **Búsqueda Web**:
  - Se probó inicialmente `client.chat.completions.create` con `web_search_preview`, la cual arrojó error 400 (`Invalid value: 'web_search_preview'. Supported values are: 'function' and 'custom'`).
  - Siguiendo la regla de intentar enfoques alternativos, se probó la Responses API (`client.responses.create({ model: "gpt-4o-mini", tools: [{ type: "web_search_preview" }] })`), la cual funcionó de manera inmediata y nativa, retornando eventos `web_search_call` con queries y anotaciones `url_citation` con enlaces y títulos reales de la web argentina.
- **Resultado de prueba**: Consulta de prueba exitosa sobre cotización del dólar con fuentes oficiales de Argentina.

## Fase 1: Reglas y Datos (Completada)
- Se creó `data/reglas.json` con presupuesto USD 300, ganancia mínima por unidad USD 5, máximo 4 productos a la vez, y criterios de descarte explícitos.
- Se creó `data/candidatos.json` con 6 productos representativos de la categoría "Accesorios para celulares", incluyendo términos de búsqueda tanto para MercadoLibre Argentina como para proveedores internacionales (AliExpress/Alibaba).
- Verificación ejecutada con script de lectura de JSON: 6 candidatos cargados, reglas validadas.

## Fase 2: Función de Cálculo (Completada)
- Se implementó `calcular_margen(precio_venta, costo_producto, envio, comision_pct, impuestos_pct, devoluciones_pct)` en `src/calcular_margen.ts`.
- La función valida de forma estricta todos los parámetros: si algún parámetro es `null`, `undefined` o no numérico, retorna `{ valido: false, ganancia_por_unidad: null, margen_porcentual: null }`.
- Se implementó la definición de herramienta (`calcularMargenToolDefinition`) para permitir el uso directo del modelo como Tool/Function calling.
- Se verificó con suite de pruebas manuales (`src/calcular_margen.test.ts`):
  - Caso 1 (Estándar): Ganancia calculada a mano USD 8.35, margen 27.83% coinciden exactamente.
  - Caso 2 (Pérdida): Ganancia negativa (-9.00 USD) y margen (-60.00%).
  - Caso 3 (Menor a mínimo USD 5): Ganancia 2.36 USD.
  - Casos 4 y 5 (Valores nulos o cero): Rechazo limpio sin crashear.

## Fase 3: Agente de Investigación (Completada)
- Se desarrolló `src/agente_investigacion.ts` integrando la Responses API de OpenAI (`client.responses.create`) con la herramienta nativa `web_search_preview`.
- **Prueba en paralelo de API pública de MercadoLibre**:
  - Se probó el endpoint público de búsqueda `https://api.mercadolibre.com/sites/MLA/search?q=soporte+celular` sin token.
  - Resultado: Devolvió HTTP 403 Forbidden: `{ message: 'forbidden', error: 'forbidden', status: 403, cause: [] }`. Como indicaba la consigna, se anotó el error exacto en `PRUEBA_TIENDA.md` y no se insistió.
- **Investigación de los 6 productos candidatos**:
  - Se ejecutó la búsqueda web automatizada para los 6 candidatos de la categoría accesorios de celular.
  - Se implementó un algoritmo de sanitización robusto para lidiar con formatos de respuesta de LLMs (como sufijos de moneda "ARS", "USD" o caracteres de control en strings).
  - Cada dato almacena `valor`, `url`, `fecha_consulta`, `estado` ("confirmado" | "no confirmado") y `detalles`.
  - Cuando faltaban datos (ej. tasas de devoluciones específicas o impuestos sin fuente confirmada), se marcaron estrictamente como `null` y "no confirmado", omitiéndose en el cálculo de margen conforme a la Regla 8 y el criterio de evals.
  - Las quejas y reseñas se extrajeron fielmente: cuando no existieron reseñas verificadas (prod-006), se reportó `hay_resenas: false` con lista vacía sin inventar nada.

## Fase 4: Salidas (Completada)
- Se consolidó `data/productos.json` con la ficha completa de los 6 productos investigados, conteniendo datos estructurados, fuentes con URLs, estados de confirmación, cálculo de margen y motivos de descarte.
- Se implementó `src/generar_ranking.ts` y se generó `ranking.html`.
- Características de `ranking.html`:
  - Diseño responsive y prolijo con métricas de cabecera (presupuesto $300, ganancia mínima $5, cantidad seleccionada vs descartada).
  - Tabla superior con los productos aprobados ordenados descendentemente por ganancia unitaria (Top 3: prod-001 con $11.86, prod-003 con $10.60, prod-002 con $8.34).
  - Enlaces directos a las fuentes originales de MercadoLibre y AliExpress/Alibaba.
  - Insignias visuales destacadas para los datos "No confirmados".
  - Tabla inferior de "Productos Descartados" detallando el motivo exacto de exclusión de negocio (prod-004 por pérdida, prod-005 por margen inferior a $5, prod-006 por falta de datos confirmados).
- Verificación ejecutada: `npx tsx src/generar_ranking.ts` genera el HTML sin errores y respeta todas las reglas de negocio.

## Fase 5: Evals (Completada)
- Se programó primero la suite de evals en `src/evals.test.ts` cubriendo los 7 casos requeridos:
  - (a) Descarte de producto con costo mayor a venta (evaluado con caso unitario y verificado con `prod-004`).
  - (b) Verificación de no invención de reseñas/quejas (verificado con `prod-006`: `hay_resenas: false`, quejas vacías).
  - (c) Comparación matemática contra cálculo manual ($8.35 USD y 27.83% idénticos al centavo).
  - (d) Control de presupuesto para stock ($350 unitario vs $300 presupuesto produce 0 unidades y rechazo).
  - (e) Exclusión del ranking para ganancias inferiores a USD 5 ($3.80 unitario excluido).
  - (f) Manejo estricto de datos sin fuente: permanecen "no confirmados", `null` y excluidos del cálculo.
  - (g) Inmutabilidad del modo escenario: hashes SHA-256 de archivos en `data/` idénticos antes y después.
- Se corrió la suite: 7/7 casos superados exitosamente sin fallos.

## Fase 6: Revisión Semanal y Escenario (Completada)
- Se desarrolló `src/revision_y_escenario.ts`.
- **Modo normal (revisión periódica)**:
  - Lee `data/productos.json`, evalúa cumplimiento y agrega nuevas observaciones a `data/historial.csv` con formato `fecha,producto,ganancia_por_unidad`.
  - No sobrescribe historial previo (hace append cronológico).
- **Modo escenario (`--escenario proveedor25`)**:
  - Simula un aumento del 25% en costos de proveedor y costos de envío.
  - Recalcula la viabilidad con el presupuesto fijo de USD 300 y el umbral de USD 5.
  - Dictamen:
    - Mantener: `prod-001` (ganancia baja de $11.86 a $11.21), `prod-002` (baja de $8.34 a $7.98) y `prod-003` (baja de $10.60 a $10.17). Los 3 siguen superando holgadamente los $5 de ganancia.
    - Descartar: `prod-004` (profundiza pérdida a -$9.30), `prod-005` (ganancia cae a $2.55, por debajo del mínimo de $5), y `prod-006` (faltan datos).
  - Comprobado que el modo escenario corre exclusivamente en memoria y no altera ningún archivo en disco.

## Fase 7: Automatización (Completada)
- Se creó el workflow de GitHub Actions en `.github/workflows/revision_semanal.yml`.
- **Configuración del workflow**:
  - Cron semanal: `0 9 * * 1` (Lunes 09:00 UTC).
  - Disparador manual: `workflow_dispatch` con parámetro opcional `ejecutar_escenario` (boolean).
  - Permisos de escritura (`contents: write`).
  - Utiliza `OPENAI_API_KEY` inyectada como secret de GitHub.
  - Ejecuta la revisión periódica, regeneración del ranking HTML, suite de evals, y realiza commit y push automático de los cambios en `data/` y `ranking.html`.
- Se validó la sintaxis YAML.
- Dado que el repositorio no tiene un origen remoto configurado localmente, se preparó todo en el repo git local y se detallaron los pasos exactos y concisos en `PENDIENTES_MANUALES.md`.

## Fase 8: Prueba Completa e Idempotencia (Completada)
- Se ejecutó el flujo completo (`npm run revision`, `npm run ranking`, `npm test`) dos veces consecutivas.
- Verificación de no-sobreescritura:
  - Antes de la primera corrida, `data/historial.csv` tenía 7 líneas (1 cabecera + 6 registros).
  - Tras la corrida 1, alcanzó 13 líneas (se anexaron 6 registros sin pisar los anteriores).
  - Tras la corrida 2, alcanzó 19 líneas (se anexaron 6 registros más de forma cronológica y limpia).
- Se ejecutó la simulación en modo escenario (`npm run escenario`):
  - Corrió 100% en memoria.
  - Se verificó que `data/historial.csv` permaneció intacto con 19 líneas y `data/productos.json` no sufrió modificaciones.
- Todos los entregables (`PRUEBA_TIENDA.md`, `DIARIO_TRABAJO.md`, `PENDIENTES_MANUALES.md`, `IDEAS.md`) están actualizados y consolidados.
