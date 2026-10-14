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
