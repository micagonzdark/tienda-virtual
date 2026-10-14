import fs from "fs";
import path from "path";
import { FichaProducto } from "./agente_investigacion.js";

export function generarRankingHtml(): void {
  const reglasPath = path.resolve("./data/reglas.json");
  const productosPath = path.resolve("./data/productos.json");
  const outputPath = path.resolve("./ranking.html");

  if (!fs.existsSync(productosPath)) {
    throw new Error(`No se encontró el archivo ${productosPath}`);
  }

  const reglas = JSON.parse(fs.readFileSync(reglasPath, "utf-8"));
  const productos: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));

  // Separar productos que cumplen reglas y los descartados
  const elegibles = productos
    .filter(p => p.cumple_reglas && p.calculo_margen.valido && p.calculo_margen.ganancia_por_unidad !== null)
    .sort((a, b) => (b.calculo_margen.ganancia_por_unidad || 0) - (a.calculo_margen.ganancia_por_unidad || 0));

  // Aplicar máximo de 4 productos
  const ranking = elegibles.slice(0, reglas.max_productos || 4);
  const descartadosPorCupo = elegibles.slice(reglas.max_productos || 4).map(p => ({
    ...p,
    motivo_descarte: `Excede el cupo máximo de ${reglas.max_productos} productos permitidos simultáneamente`
  }));

  const descartados = [
    ...productos.filter(p => !p.cumple_reglas),
    ...descartadosPorCupo
  ];

  // Helper para renderizar celda de dato
  const renderDato = (campo: any, esMoneda = false, esPct = false) => {
    if (!campo || campo.valor === null || campo.valor === undefined || campo.estado === "no confirmado") {
      return `<span class="badge badge-unconfirmed">No confirmado</span>`;
    }
    const valorFormateado = esMoneda ? `$${Number(campo.valor).toFixed(2)}` : (esPct ? `${Number(campo.valor).toFixed(1)}%` : campo.valor);
    const link = campo.url ? `<a href="${campo.url}" target="_blank" class="source-link" title="Ver fuente">🔗 Fuente</a>` : "";
    return `<div class="dato-box"><span class="valor-dato">${valorFormateado}</span> ${link}</div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ranking Tienda Virtual Dropshipping - Argentina</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 2rem 1rem; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { margin-bottom: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 1.5rem; }
    h1 { font-size: 1.875rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
    p.subtitle { color: var(--text-muted); font-size: 1rem; }

    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card-bg); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.25rem; }
    .card-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }

    .table-container { background: var(--card-bg); border-radius: 0.75rem; border: 1px solid var(--border); overflow-x: auto; margin-bottom: 2.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th { background: #f1f5f9; padding: 0.85rem 1rem; font-weight: 600; color: #334155; border-bottom: 2px solid var(--border); }
    td { padding: 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #f8fafc; }

    .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; font-size: 0.85rem; }
    .rank-1 { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .rank-2 { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .rank-3 { background: #fed7aa; color: #c2410c; border: 1px solid #fdba74; }
    .rank-other { background: #e2e8f0; color: #64748b; }

    .prod-name { font-weight: 600; color: #1e293b; font-size: 0.95rem; }
    .prod-cat { font-size: 0.75rem; color: var(--text-muted); }
    .dato-box { display: flex; align-items: center; gap: 0.4rem; }
    .valor-dato { font-weight: 500; }
    .source-link { font-size: 0.75rem; color: var(--primary); text-decoration: none; padding: 2px 5px; background: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe; }
    .source-link:hover { text-decoration: underline; background: #dbeafe; }

    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-unconfirmed { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-confirmed { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-discarded { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

    .profit-pill { font-weight: 700; color: var(--success); font-size: 1.05rem; }
    .margin-pct { font-size: 0.8rem; color: var(--text-muted); }

    .quejas-list { font-size: 0.8rem; color: #475569; padding-left: 1.1rem; margin-top: 0.25rem; }
    .quejas-list li { margin-bottom: 2px; }

    .discarded-section { margin-top: 2rem; }
    .discarded-section h2 { font-size: 1.35rem; margin-bottom: 1rem; color: #475569; }
    .discard-reason { font-size: 0.85rem; color: var(--danger); font-weight: 600; }

    footer { text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-top: 3rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Tienda Virtual: Ranking de Oportunidades Dropshipping</h1>
      <p class="subtitle">Evaluación de viabilidad económica para comercio electrónico en Argentina | MercadoLibre + Proveedores Internacionales</p>
    </header>

    <div class="summary-cards">
      <div class="card">
        <div class="card-label">Presupuesto Virtual</div>
        <div class="card-value">$${reglas.presupuesto_stock_usd} USD</div>
      </div>
      <div class="card">
        <div class="card-label">Ganancia Mínima Requerida</div>
        <div class="card-value">$${reglas.ganancia_minima_unidad_usd} USD / ud.</div>
      </div>
      <div class="card">
        <div class="card-label">Productos en Ranking</div>
        <div class="card-value">${ranking.length} / ${reglas.max_productos}</div>
      </div>
      <div class="card">
        <div class="card-label">Descartados por Regla</div>
        <div class="card-value">${descartados.length}</div>
      </div>
    </div>

    <h2>Top Productos Seleccionados (Ordenados por Ganancia Unitaria)</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Producto</th>
            <th>Precio Venta (ML)</th>
            <th>Costo Proveedor</th>
            <th>Envío a Arg.</th>
            <th>Comisión ML</th>
            <th>Ganancia / Ud</th>
            <th>Margen %</th>
            <th>Stock con $300</th>
            <th>Quejas más repetidas</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.map((p, idx) => {
            const rankClass = idx === 0 ? "rank-1" : (idx === 1 ? "rank-2" : (idx === 2 ? "rank-3" : "rank-other"));
            return `
            <tr>
              <td><span class="rank-badge ${rankClass}">${idx + 1}</span></td>
              <td>
                <div class="prod-name">${p.nombre}</div>
                <div class="prod-cat">${p.categoria} (ID: ${p.id})</div>
              </td>
              <td>${renderDato(p.precio_venta, true)}</td>
              <td>${renderDato(p.costo_proveedor, true)}</td>
              <td>${renderDato(p.costo_envio, true)}</td>
              <td>${renderDato(p.comision_ml_pct, false, true)}</td>
              <td>
                <div class="profit-pill">+$${p.calculo_margen.ganancia_por_unidad?.toFixed(2)}</div>
              </td>
              <td>
                <span class="valor-dato">${p.calculo_margen.margen_porcentual?.toFixed(1)}%</span>
              </td>
              <td>
                <strong>${p.unidades_stock_posibles ?? "N/A"} uds</strong><br>
                <small class="prod-cat">($${p.inversion_stock_estimada ?? 0})</small>
              </td>
              <td>
                ${p.resenas.hay_resenas ? `
                  <ul class="quejas-list">
                    ${p.resenas.quejas.map(q => `<li>${q}</li>`).join("")}
                  </ul>
                  ${p.resenas.url ? `<a href="${p.resenas.url}" target="_blank" class="source-link" style="margin-top:4px;display:inline-block;">Opiniones ML</a>` : ""}
                ` : `<span class="badge badge-unconfirmed">Sin reseñas comprobadas</span>`}
              </td>
            </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="discarded-section">
      <h2>Productos Descartados (No cumplen con los criterios de negocio)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Precio Venta</th>
              <th>Costo Proveedor</th>
              <th>Ganancia Estimada</th>
              <th>Motivo del Descarte</th>
            </tr>
          </thead>
          <tbody>
            ${descartados.map(p => `
              <tr>
                <td><code>${p.id}</code></td>
                <td>
                  <div class="prod-name">${p.nombre}</div>
                  <div class="prod-cat">${p.categoria}</div>
                </td>
                <td>${renderDato(p.precio_venta, true)}</td>
                <td>${renderDato(p.costo_proveedor, true)}</td>
                <td>${p.calculo_margen.valido && p.calculo_margen.ganancia_por_unidad !== null ? `$${p.calculo_margen.ganancia_por_unidad.toFixed(2)}` : '<span class="badge badge-unconfirmed">N/C</span>'}</td>
                <td><span class="discard-reason">${p.motivo_descarte || "No cumple reglas de negocio"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <footer>
      Generado automáticamente por el Agente de Tienda Virtual | Fecha de reporte: ${new Date().toISOString().split("T")[0]} | Cumple con Regla 8: Datos no confirmados marcados explícitamente.
    </footer>
  </div>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`Página ranking.html generada exitosamente en ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith("generar_ranking.ts")) {
  generarRankingHtml();
}
