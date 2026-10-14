# Ideas y Mejoras Fuera de Alcance (Regla 2)

Las siguientes ideas surgieron durante el diseño pero no se implementan para no agregar complejidad ni funciones no solicitadas:

1. **Dashboard Interactivo con React/Next.js o Vite**: En lugar de `ranking.html` estático, una SPA con filtros dinámicos por margen y búsqueda en tiempo real.
2. **Alertas automáticas por Telegram / Discord**: Notificar cuando un producto baje de margen o supere el 50% de ganancia.
3. **Soporte multi-moneda en vivo**: Integración con API de cotización de dólar blue / MEP en Argentina (ej. DolarApi) en vez de asumir conversión directa o valores en USD.
4. **Scraping con Puppeteer/Playwright**: Automatizar la extracción directa de HTML si las APIs públicas tienen restricciones de tasa o antibots.
5. **Cálculo de impuestos detallado por NCM/arancel de importación aduanera**: Tablas arancelarias oficiales de AFIP/ARCA según la posición arancelaria exacta del producto.
