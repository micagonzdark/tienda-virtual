# Pendientes Manuales

Este archivo contiene acciones que requieren intervención del usuario (por ejemplo, crear repositorios remotos en GitHub o configurar secretos en GitHub Actions).

## 1. Conexión del Repositorio Remoto en GitHub
Cuando desees publicar este proyecto en tu cuenta de GitHub:
1. Andá a [GitHub New Repository](https://github.com/new).
2. Creá un repositorio llamado `tienda-virtual` (público o privado).
3. En la terminal dentro de `tienda-virtual`, ejecutá:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/tienda-virtual.git
   git branch -M main
   git push -u origin main
   ```

## 2. Configuración de Secretos para GitHub Actions (Fase 7)
Para que el workflow de GitHub Actions pueda consultar OpenAI:
1. En tu repositorio de GitHub, andá a **Settings > Secrets and variables > Actions**.
2. Hacé clic en **New repository secret**.
3. Nombre: `OPENAI_API_KEY`
4. Valor: Tu clave de API de OpenAI (`sk-...`).
5. Guardá los cambios.

## 3. Ejecución Manual del Workflow en GitHub Actions
Una vez subido el repo y configurado el secreto:
1. Andá a la pestaña **Actions** en GitHub.
2. Hacé clic en el workflow **Revisión Semanal Tienda Virtual** en la barra lateral izquierda.
3. Hacé clic en el botón desplegable **Run workflow** y presioná el botón verde **Run workflow**.
4. Podés habilitar la casilla "Simular también modo escenario (+25% costos)" si querés ver la simulación en los logs.
