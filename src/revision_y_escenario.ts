import fs from "fs";
import path from "path";
import { FichaProducto } from "./agente_investigacion.js";
import { calcular_margen } from "./calcular_margen.js";

export interface ResultadoEscenario {
  id: string;
  nombre: string;
  costo_original: number | null;
  costo_simulado: number | null;
  envio_original: number | null;
  envio_simulado: number | null;
  ganancia_original: number | null;
  ganancia_simulada: number | null;
  conviene_mantener: boolean;
  motivo: string;
  unidades_stock_simuladas: number | null;
}

export function ejecutarEscenarioProveedor25(productos: FichaProducto[], presupuesto = 300, gananciaMinima = 5): ResultadoEscenario[] {
  console.log("\n=======================================================");
  console.log(" MODO ESCENARIO: proveedor25 (+25% costo y flete)");
  console.log(" (Simulación en memoria - No altera archivos reales)");
  console.log("=======================================================\n");

  const resultados: ResultadoEscenario[] = [];

  for (const p of productos) {
    const costoOrig = p.costo_proveedor.valor;
    const envioOrig = p.costo_envio.valor;
    const pVenta = p.precio_venta.valor;

    if (costoOrig === null || pVenta === null) {
      resultados.push({
        id: p.id,
        nombre: p.nombre,
        costo_original: costoOrig,
        costo_simulado: null,
        envio_original: envioOrig,
        envio_simulado: null,
        ganancia_original: p.calculo_margen.ganancia_por_unidad,
        ganancia_simulada: null,
        conviene_mantener: false,
        motivo: "Faltan datos de precio o costo de compra",
        unidades_stock_simuladas: null
      });
      continue;
    }

    // Aumento del 25% en proveedor y envío
    const costoSim = Math.round(costoOrig * 1.25 * 100) / 100;
    const envioSim = envioOrig !== null ? Math.round(envioOrig * 1.25 * 100) / 100 : null;

    const calculoSim = calcular_margen(
      pVenta,
      costoSim,
      envioSim,
      p.comision_ml_pct.valor,
      p.impuestos_pct.valor,
      p.tasa_devoluciones_pct.valor
    );

    const costoDirectoSim = costoSim + (envioSim || 0);
    const stockSim = costoDirectoSim > 0 ? Math.floor(presupuesto / costoDirectoSim) : 0;

    let conviene = true;
    const motivos: string[] = [];

    if (!calculoSim.valido || calculoSim.ganancia_por_unidad === null) {
      conviene = false;
      motivos.push(calculoSim.error || "Cálculo inválido");
    } else if (calculoSim.ganancia_por_unidad < gananciaMinima) {
      conviene = false;
      motivos.push(`Ganancia simulada ($${calculoSim.ganancia_por_unidad}) inferior al mínimo de $${gananciaMinima}`);
    }

    if (stockSim < 1) {
      conviene = false;
      motivos.push("Costo supera el presupuesto total de USD 300");
    }

    resultados.push({
      id: p.id,
      nombre: p.nombre,
      costo_original: costoOrig,
      costo_simulado: costoSim,
      envio_original: envioOrig,
      envio_simulado: envioSim,
      ganancia_original: p.calculo_margen.ganancia_por_unidad,
      ganancia_simulada: calculoSim.ganancia_por_unidad,
      conviene_mantener: conviene,
      motivo: conviene ? "Mantiene rentabilidad y margen sobre el umbral" : motivos.join("; "),
      unidades_stock_simuladas: stockSim
    });
  }

  // Imprimir reporte por consola
  console.table(
    resultados.map(r => ({
      ID: r.id,
      Producto: r.nombre.slice(0, 30),
      "Costo Orig -> +25%": `$${r.costo_original ?? "N/C"} -> $${r.costo_simulado ?? "N/C"}`,
      "Ganancia Orig -> Sim": `$${r.ganancia_original ?? "N/C"} -> $${r.ganancia_simulada ?? "N/C"}`,
      "Stock ($300)": `${r.unidades_stock_simuladas ?? 0} uds`,
      Decisión: r.conviene_mantener ? "MANTENER" : "DESCARTAR",
      Motivo: r.motivo
    }))
  );

  return resultados;
}

export function ejecutarRevisionSemanal(): void {
  const productosPath = path.resolve("./data/productos.json");
  const historialPath = path.resolve("./data/historial.csv");

  if (!fs.existsSync(productosPath)) {
    throw new Error(`No se encontró ${productosPath}`);
  }

  const productos: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));
  const fechaHoy = new Date().toISOString().split("T")[0];

  // Crear o actualizar historial.csv
  let contenidoPrevio = "";
  if (!fs.existsSync(historialPath)) {
    contenidoPrevio = "fecha,producto,ganancia_por_unidad\n";
  } else {
    contenidoPrevio = fs.readFileSync(historialPath, "utf-8");
    if (!contenidoPrevio.endsWith("\n") && contenidoPrevio.length > 0) {
      contenidoPrevio += "\n";
    }
  }

  const nuevasLineas: string[] = [];
  for (const p of productos) {
    const ganancia = p.calculo_margen.valido && p.calculo_margen.ganancia_por_unidad !== null
      ? p.calculo_margen.ganancia_por_unidad.toFixed(2)
      : "N/C";
    // Escapar nombre si tiene comas
    const nombreLimpio = p.nombre.includes(",") ? `"${p.nombre}"` : p.nombre;
    nuevasLineas.push(`${fechaHoy},${nombreLimpio},${ganancia}`);
  }

  fs.writeFileSync(historialPath, contenidoPrevio + nuevasLineas.join("\n") + "\n", "utf-8");
  console.log(`Revisión semanal completada. ${nuevasLineas.length} registros agregados a ${historialPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const esModoEscenario = args.includes("--escenario") || args.some(a => a.includes("escenario"));

  const productosPath = path.resolve("./data/productos.json");
  if (!fs.existsSync(productosPath)) {
    console.error("No se encontró data/productos.json");
    process.exit(1);
  }

  const productos: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));

  if (esModoEscenario) {
    ejecutarEscenarioProveedor25(productos);
  } else {
    ejecutarRevisionSemanal();
  }
}

if (process.argv[1] && process.argv[1].endsWith("revision_y_escenario.ts")) {
  main().catch(console.error);
}
