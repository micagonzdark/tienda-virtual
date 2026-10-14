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
