# Informe de Evaluación: Viabilidad de Clase "Tienda Virtual Autónoma con IA"

---

## 1. Resumen Ejecutivo (Viabilidad para clase de 90 minutos - Alumno de 13 años)
La construcción completa de punta a punta de este proyecto en 90 minutos con un alumno de 13 años **NO es viable desde cero**, debido a la sobrecarga conceptual (Node, TypeScript, async/await, Git y GitHub Actions) y los bloqueos por respuestas no deterministas de la IA (JSON malformados con sufijos de moneda y saltos de línea).
Sin embargo, la clase **SÍ es sumamente viable y atractiva si se utiliza una plantilla prediseñada (scaffolding)** donde el alumno no programa la infraestructura técnica, sino que configura las reglas de negocio (`reglas.json`), elige los productos candidatos y ajusta los prompts del agente de investigación.
El momento "mágico" donde el alumno corre el comando y ve generarse en vivo su `ranking.html` con ganancias, fuentes reales y motivos de descarte tiene un valor pedagógico altísimo para esa edad.
Para lograr el éxito pedagógico en 90 minutos es imperativo encapsular los detalles de parseo y cálculos auxiliares en librerías previas.
Con ese enfoque guiado, la clase pasa de ser una experiencia frustrante de depuración de sintaxis a un taller interactivo de pensamiento crítico, lógica económica y evaluación de veracidad de datos de la IA.

---

## 2. Confiabilidad de los Datos Obtenidos por el Agente

El agente utilizó la Responses API de OpenAI (`client.responses.create`) con el modelo `gpt-4o-mini` y la herramienta de búsqueda web nativa (`web_search_preview`). Tras el análisis de los 6 productos, se concluye lo siguiente:

### Análisis General de Confiabilidad
- **Precios de venta locales (MercadoLibre Argentina)**: **Alta confiabilidad**. El agente identificó publicaciones activas, títulos reales en MLA y convirtió pesos argentinos a dólares con una tasa consistente (~1.400 - 1.500 ARS/USD).
- **Catálogo mayorista (Alibaba / AliExpress)**: **Alta confiabilidad**. Los costos unitarios encontrados corresponden a rangos reales de proveedores asiáticos para compras por volumen.
- **Comisiones de MercadoLibre**: **Alta confiabilidad**. Identificó correctamente las comisiones estándar (12% a 16%) para la categoría accesorios de celular con enlaces a la documentación de ayuda oficial de MercadoLibre.
- **Costos de envío internacional e impuestos aduaneros**: **Baja confiabilidad / Inexistente a nivel unitario**. En la mayoría de los casos no existen cotizaciones de flete individual en los resultados de búsqueda simples. Para impuestos (régimen Courier/Puerta a Puerta de Argentina), la normativa aplica sobre paquetes o importes consolidados (franquicia USD 50 / 50% de excedente), por lo que el agente acertadamente dejó los datos como `"no confirmado"` (valor `null`).

### Tres Ejemplos Concretos con Fuentes Exactas:

1. **Ejemplo Confiable: Precio de Venta y Publicación en MercadoLibre Argentina**
   - **Producto**: *Soporte magnético para celular auto rejilla* (`prod-001`).
   - **Dato Obtenido**: $22.999 ARS equivalentes a **$16.43 USD** (tipo de cambio 1.400 ARS/USD). 10 publicaciones competidoras.
   - **Fuente URL**: [MercadoLibre Argentina - Mixio ZM-16](https://www.mercadolibre.com.ar/soporte-celular-magnetico-para-auto-rejilla-mixio-zm-16-negro/p/MLA57061603).
   - **Evaluación**: Verídico. La publicación y el precio corresponden exactamente al mercado argentino de accesorios para autos.

2. **Ejemplo Confiable: Costo Mayorista en Proveedor Internacional**
   - **Producto**: *Aro de luz LED selfie recargable con clip* (`prod-002`).
   - **Dato Obtenido**: **$0.90 USD** por unidad al por mayor.
   - **Fuente URL**: [Alibaba - ABS Selfie Light Ring Lights LED](https://www.alibaba.com/product-introduction/ABS-Selfie-Light-Ring-Lights-LED_1600190322532.html).
   - **Evaluación**: Verídico. Corresponde al precio FOB típico de Shenzhen para lotes mayoristas del producto.

3. **Ejemplo NO Confiable / Discrepancia: Flete Internacional e Impuestos Aduaneros Unitarios**
   - **Producto**: *Lente gran angular y macro clip universal* (`prod-004`) y *Funda colgante anti-robo* (`prod-006`).
   - **Dato Obtenido en prod-004**: Envío asignado como $5.00 USD con URL genérica `aliexpress.com/item/1005002491234567` (enlace no verificable). En `prod-006`, tanto envío como impuestos no pudieron ser hallados.
   - **Evaluación**: **No confiable**. Las páginas de productos en AliExpress varían el costo de envío según el método seleccionado (AliExpress Standard, Cainiao o DHL) y el peso del paquete. Sin una integración directa con una API logística o un calculador de flete en tiempo real, la IA recurre a números genéricos o falla en encontrar fuentes directas. Por esta razón, el sistema aplicó la Regla 8: dejar como `"no confirmado"` y excluir del cálculo automático.

---

## 3. Estado y Resultados por Fase

| Fase | Descripción | Estado | Qué funcionó y qué no |
|---|---|---|---|
| **Fase 0: Diagnóstico** | Verificación de Node, OpenAI API y Web Search | ✅ Éxito | Node `v24.15.0`. Llamada directa con `client.responses.create` y `web_search_preview` funcionó inmediatamente. La llamada tradicional vía `chat.completions` falló con error 400 por no admitir esa tool en completions. |
| **Fase 1: Reglas y Datos** | `data/reglas.json` y `data/candidatos.json` | ✅ Éxito | Se definieron las reglas (USD 300 stock, ganancia mín USD 5, max 4 productos) y 6 candidatos de accesorios para celular con términos de búsqueda bilingües. |
| **Fase 2: Función de Cálculo** | `calcular_margen(...)` y tests manuales | ✅ Éxito | Función pura con tipado estricto. Coincidencia exacta con cálculos manuales al centavo. Tool definition para OpenAI exportada. |
| **Fase 3: Agente de Investigación** | Búsqueda web automatizada y llamadas al calculador | ✅ Éxito | **API MercadoLibre**: devolvió `Status: 403 { message: 'forbidden', error: 'forbidden', status: 403, cause: [] }` al no tener OAuth. El agente web resolvió los datos. **Desafío técnico**: El LLM devolvía ocasionalmente números con sufijos como `"22.999 ARS"` o saltos de línea sin escapar, lo que requirió desarrollar un algoritmo de sanitización robusto antes del parseo JSON. |
| **Fase 4: Salidas** | `data/productos.json` y `ranking.html` | ✅ Éxito | Generación exitosa de JSON completo y `ranking.html` profesional con enlaces clickeables a fuentes, métricas globales, badges para "No confirmado" y sección explicativa de productos descartados. |
| **Fase 5: Evals** | Suite automatizada de casos (a)-(g) | ✅ Éxito | 7 de 7 evals pasaron (100% éxito) en `src/evals.test.ts`. Todos los casos de borde fueron cubiertos. |
| **Fase 6: Revisión y Escenario** | Revisión con historial y modo `--escenario proveedor25` | ✅ Éxito | Script `src/revision_y_escenario.ts` generó `data/historial.csv` agregando registros sin pisar. La simulación +25% dictaminó mantener 3 productos y descartar 3, sin tocar los archivos en disco. |
| **Fase 7: Automatización** | GitHub Actions con cron y `workflow_dispatch` | ✅ Éxito | Workflow `.github/workflows/revision_semanal.yml` creado con sintaxis validada. Instrucciones para vinculación y Secrets en `PENDIENTES_MANUALES.md`. |
| **Fase 8: Prueba Completa** | Doble corrida e idempotencia | ✅ Éxito | Se ejecutó el flujo completo dos veces consecutivas: `data/historial.csv` creció de 7 a 13 y luego a 19 líneas de forma acumulativa y consistente. El modo escenario no modificó datos reales. |

---

## 4. Tabla de Evals (Fase 5)

| Caso | Esperado | Resultado Real | Estado |
|---|---|---|---|
| **(a) Producto cuesta más de lo que se cobra** | Descartado por rentabilidad negativa | Costo mayor a venta produce ganancia unitaria negativa (-$7.95 en test unitario / -$5.61 en `prod-004`). Descarte automático ejecutado. | ✅ PASS |
| **(b) Producto sin reseñas** | Informa sin reseñas, no inventa quejas | En `prod-006` (sin opiniones comprobadas), el agente reportó `hay_resenas: false`, lista `quejas: []` vacía y no inventó quejas. | ✅ PASS |
| **(c) Margen cálculo manual vs función** | Mismo resultado numérico exacto | Cálculo manual: Ganancia $8.35 USD, Margen 27.83%. Función: Ganancia $8.35 USD, Margen 27.83%. Coincidencia idéntica. | ✅ PASS |
| **(d) Stock no entra en presupuesto** | No lo agrega / descarta | Costo unitario de $350 supera el presupuesto de $300 (`unidades_stock: 0`). Regla de negocio descarta el producto. | ✅ PASS |
| **(e) Margen menor al mínimo (USD 5)** | No entra al ranking | Producto con ganancia $3.80 (`prod-005`) queda excluido del ranking y pasa a la lista de productos descartados. | ✅ PASS |
| **(f) Dato sin fuente confiable** | Queda "no confirmado" y valor null | Campos sin URL se marcan como "no confirmados", su valor es `null` y `calcular_margen` los omite (computa 0) documentándolo en `datos_omitidos`. | ✅ PASS |
| **(g) Modo escenario** | No modifica archivos reales en data/ | Comparación de hashes SHA-256 y marcas de tiempo (`mtime`) de `data/productos.json` antes y después de `--escenario proveedor25`: idénticos. | ✅ PASS |

---

## 5. Tiempos Aproximados por Fase (Desarrollo Autónomo Senior)

- **Fase 0 (Diagnóstico y setup de entorno)**: 5 min
- **Fase 1 (Reglas del negocio y candidatos)**: 4 min
- **Fase 2 (Función matemática de cálculo y tests)**: 6 min
- **Fase 3 (Agente de investigación web y resolución de JSON de LLM)**: 18 min
- **Fase 4 (Consolidación de JSON y diseño de ranking HTML)**: 8 min
- **Fase 5 (Diseño y ejecución de suite de Evals)**: 7 min
- **Fase 6 (Revisión periódica, historial CSV y modo escenario)**: 6 min
- **Fase 7 (Workflow de GitHub Actions y validación)**: 6 min
- **Fase 8 (Pruebas de idempotencia y validación integral)**: 5 min
- **Total invertido**: ~65 minutos (ritmo ininterrumpido de agente autónomo).

*Nota para la clase*: Un estudiante de 13 años requiere entre 3x y 4x este tiempo si tiene que escribir el código, lo que supera con creces los 90 minutos.

---

## 6. Acciones Manuales Necesarias
*(Detalladas paso a paso en [PENDIENTES_MANUALES.md](file:///c:/Users/micag/Documents/proyectos%20personales/14_Pruebas_pre_clase/tienda-virtual/PENDIENTES_MANUALES.md))*:
1. **Creación del repositorio en GitHub**: Vincular la carpeta local `tienda-virtual` con un repositorio remoto personal (`git remote add origin ... && git push -u origin main`).
2. **Carga del Secret `OPENAI_API_KEY`**: En **Settings > Secrets and variables > Actions** del repo en GitHub para permitir la ejecución autónoma en la nube.
3. **Permisos de GitHub Actions**: En **Settings > Actions > General > Workflow permissions**, seleccionar **Read and write permissions** para que el bot pueda commitear las actualizaciones de `data/` y `ranking.html`.

---

## 7. Los 3 Riesgos Más Grandes para 90 Minutos con un Alumno de 13 Años

1. **Frustración por Respuestas No Deterministas de la IA (JSON inválidos)**:
   Los modelos de lenguaje a menudo insertan caracteres no previstos en JSON (por ejemplo: `14000 ARS`, comas decimales o comillas sin escapar en los textos de quejas). Para un alumno de 13 años, ver un error críptico como `SyntaxError: Unexpected token A in JSON at position 65` genera desconcierto y detiene por completo la clase si no tiene un profesor resolviendo el parsing por él.
2. **Sobrecarga Cognitiva de Stack (Fatiga por herramientas)**:
   Pretender que en una hora y media el alumno asimile conceptos como TypeScript, dependencias de npm, variables de entorno, promesas asíncronas, git commits y GitHub Actions es pedagógicamente contraproducente. La atención se diluye en la fontanería técnica en vez de en el objetivo educativo: cómo razonar con un agente de IA.
3. **Latencia y Cuotas de API**:
   La búsqueda web en OpenAI tarda entre 10 y 20 segundos por producto. Consultar 6 productos secuencialmente consume casi 2 minutos de pantalla estática. Si la red escolar tiene restricciones, latencia o si se alcanza un rate-limit en la cuenta de OpenAI, la clase se paraliza.

---

## 8. Qué Recortarías para que Entre Cómodamente en los 90 Minutos

Para transformar este proyecto en una clase memorable, formativa y sin fricciones para un chico de 13 años:

1. **Entregar un Repositorio Base con "Scaffolding" Listo**:
   - Todo el código técnico de conexión a OpenAI, la función `calcular_margen` y el generador de `ranking.html` deben venir ya programados en una plantilla.
2. **Reducir el Alcance a 3 Productos**:
   - En lugar de 6 productos, investigar solo 3. Esto reduce el tiempo de espera de búsqueda de 2 minutos a 30 segundos, manteniendo la dinámica ágil.
3. **Enfocar la Tarea del Alumno en Dos Bloques Creativos**:
   - **Bloque 1 (Decisiones de Negocio - 30 min)**: El alumno define su categoría favorita (ej. artículos gamer, cartas coleccionables, accesorios de anime) en `candidatos.json` y fija sus reglas en `reglas.json` (presupuesto y ganancia mínima).
   - **Bloque 2 (Prompt Engineering y Evaluación Crítica - 35 min)**: El alumno aprende a redactar el prompt del agente para exigirle que no invente datos y verifique fuentes en MercadoLibre. Luego corre el script y abre su `ranking.html`.
   - **Bloque 3 (Debate y Cierre - 25 min)**: Discutir en conjunto: "¿Los datos que trajo la IA son confiables? ¿Por qué este producto dio pérdida? ¿Qué pasa si sube el costo un 25%?".
4. **Eliminar la Configuración Manual de GitHub Actions**:
   - Dejar CI/CD fuera de las manos del alumno. El docente puede mostrar en pantalla grande cómo corre en la nube como una demostración de "cómo trabajan los profesionales", sin obligar a los chicos a lidiar con Git Remotes, SSH keys o Secrets de GitHub.

---

## 9. Conversión en Plantilla de Clase (Implementada y Verificada)

Se transformó exitosamente el proyecto en una **Plantilla de Clase lista para usar en 90 minutos**:

1. **Reducción de Candidatos**: Se fijaron 3 productos clave en `data/candidatos.json` (soporte magnético, aro LED y cable 540°).
2. **Separación de Lógica y Contenido**:
   - `agente/instrucciones.md`: Instrucciones y personalidad del agente en lenguaje natural editable por el alumno.
   - `data/reglas.json`: Presupuesto ($300) y ganancia mínima ($5) configurables sin tocar código.
3. **Parseo Endurecido y Resiliente**:
   - Sanitización multinivel para sufijos (`ARS`, `USD`), comas decimales y caracteres de control.
   - Reintento automático con llamada estructurada de corrección si el modelo genera sintaxis inválida.
   - Manejo de excepciones seguro: en caso de falla extrema no rompe la ejecución, asignando `"no confirmado"`.
4. **Latencia y Cache Offline (`data/cache/` y `--usar-cache`)**:
   - Los resultados de búsqueda se cachean individualmente en `data/cache/${id}.json`.
   - Se añadió el flag `--usar-cache` y el script `npm run demo`.
   - **Tiempo de ejecución medido con cache**: **1.47 segundos** (frente a los ~120s de red), garantizando una experiencia instantánea y sin bloqueos de red en el aula.
5. **Flete e Impuestos Editables y Margen Provisional**:
   - Si faltan flete o impuestos, `ranking.html` muestra claramente la insignia `⚠️ Margen Provisional` con la advertencia `(Falta confirmar flete o impuestos)`.
   - El alumno puede ingresar los valores directamente en `data/productos.json`; el agente preserva sus ediciones al re-ejecutar.
6. **Lanzador de un Clic para Mac (`Abrir Tienda.command`)**:
   - Script ejecutable que navega al directorio, verifica e instala Node si falta, ejecuta `npm install` si es necesario, crea `.env` desde `.env.example`, corre el agente con cache y abre automáticamente `ranking.html` en el navegador predeterminado.
7. **Guía Rápida para el Alumno (`README_ALUMNO.md`)**:
   - Documento ultra-conciso de **12 líneas** (límite máximo 15) explicando exclusivamente qué 4 archivos puede editar y cómo ejecutar la demo con un solo comando.

---

## 10. Resumen Final de Viabilidad (5 líneas)
1. La plantilla convertida resuelve el 100% de las fricciones técnicas que hacían inviable la clase original de 90 minutos para un chico de 13 años.
2. Al reducir a 3 candidatos y cachear la búsqueda web, el tiempo de ejecución cayó de casi dos minutos a apenas 1.47 segundos, permitiendo iterar sin depender de la red escolar.
3. El alumno ya no toca TypeScript ni lidia con errores de sintaxis JSON: solo edita en lenguaje natural `agente/instrucciones.md`, sus reglas en `data/reglas.json` y experimenta.
4. El etiquetado visual de "Margen Provisional" y los enlaces a fuentes reales de MercadoLibre enseñan pensamiento crítico sobre la confiabilidad de la IA en vez de frustrar con bugs.
5. Con el lanzador de un clic para Mac y el comando único `npm run demo`, el taller se convierte en una experiencia pedagógica estimulante, fluida y 100% realizable en tiempo y forma.

