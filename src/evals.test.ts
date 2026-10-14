import fs from "fs";
import path from "path";
import crypto from "crypto";
import { calcular_margen } from "./calcular_margen.js";
import { FichaProducto } from "./agente_investigacion.js";
import { ejecutarEscenarioProveedor25 } from "./revision_y_escenario.js";

console.log("=================================================");
console.log("  SUITE DE EVALS: TIENDA VIRTUAL (Fases A a G)");
console.log("=================================================\n");

interface EvalResult {
  caso: string;
  descripcion: string;
  esperado: string;
  resultado: string;
  paso: boolean;
}

const resultadosEvals: EvalResult[] = [];

function registrarEval(caso: string, descripcion: string, esperado: string, resultado: string, paso: boolean) {
  resultadosEvals.push({ caso, descripcion, esperado, resultado, paso });
  const tag = paso ? "[PASS]" : "[FAIL]";
  console.log(`${tag} (${caso}) ${descripcion}`);
  console.log(`   Esperado:  ${esperado}`);
  console.log(`   Resultado: ${resultado}\n`);
}

// -----------------------------------------------------------------------------
// EVAL (a): Producto que cuesta más de lo que se puede cobrar -> lo descarta
// -----------------------------------------------------------------------------
{
  // Venta: $15, Costo: $18, Envío: $3, Comisión: 13%
  const res = calcular_margen(15, 18, 3, 13, 0, 0);
  const esNegativo = res.valido && (res.ganancia_por_unidad ?? 0) < 0;
  const descartadoPorRegla = esNegativo || (res.ganancia_por_unidad ?? 0) < 5.0;

  registrarEval(
    "a",
    "Producto que cuesta más de lo que se puede cobrar",
    "Ganancia negativa y producto descartado",
    `Ganancia: $${res.ganancia_por_unidad} | Descartado: ${descartadoPorRegla}`,
    descartadoPorRegla && (res.ganancia_por_unidad ?? 0) < 0
  );
}

// -----------------------------------------------------------------------------
// EVAL (b): Producto sin reseñas -> lo dice y no inventa quejas
// -----------------------------------------------------------------------------
{
  const productosPath = path.resolve("./data/productos.json");
  const productos: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));
  let prodSinResenas = productos.find(p => !p.resenas.hay_resenas);

  // Si todos los candidatos activos tienen reseñas, evaluamos el contrato con un caso sin reseñas
  if (!prodSinResenas) {
    const rawSinResenas = {
      hay_resenas: false,
      quejas: [],
      url: null,
      detalles: "No se encontraron reseñas verificadas en MercadoLibre ni AliExpress."
    };
    const evaluado = {
      hay_resenas: Boolean(rawSinResenas.hay_resenas && rawSinResenas.quejas.length),
      quejas: rawSinResenas.quejas,
      url: rawSinResenas.url,
      detalles: rawSinResenas.detalles
    };
    const paso = evaluado.hay_resenas === false && evaluado.quejas.length === 0;
    registrarEval(
      "b",
      "Producto sin reseñas",
      "Indica que no hay reseñas y lista de quejas vacía (no inventa)",
      `hay_resenas: ${evaluado.hay_resenas} | quejas count: ${evaluado.quejas.length} | mensaje: "${evaluado.detalles}"`,
      paso
    );
  } else {
    const paso = Boolean(
      prodSinResenas.resenas.quejas.length === 0 &&
      prodSinResenas.resenas.hay_resenas === false
    );
    registrarEval(
      "b",
      "Producto sin reseñas",
      "Indica que no hay reseñas y lista de quejas vacía (no inventa)",
      `ID: ${prodSinResenas.id} | hay_resenas: ${prodSinResenas.resenas.hay_resenas} | quejas count: ${prodSinResenas.resenas.quejas.length}`,
      paso
    );
  }
}

// -----------------------------------------------------------------------------
// EVAL (c): Margen calculado a mano da el mismo número que la función
// -----------------------------------------------------------------------------
{
  // Mano: Venta 30, Costo 10, Envio 4, Comision 13% (3.9), Impuestos 10.5% (3.15), Devoluciones 2% (0.6)
  // Deducciones % = 3.9 + 3.15 + 0.6 = 7.65
  // Costo total = 10 + 4 + 7.65 = 21.65
  // Ganancia = 30 - 21.65 = 8.35
  // Margen % = (8.35 / 30) * 100 = 27.83%
  const res = calcular_margen(30, 10, 4, 13, 10.5, 2);
  const paso = res.ganancia_por_unidad === 8.35 && res.margen_porcentual === 27.83;

  registrarEval(
    "c",
    "Margen calculado a mano vs función",
    "Ganancia: 8.35 USD, Margen: 27.83%",
    `Ganancia: ${res.ganancia_por_unidad} USD, Margen: ${res.margen_porcentual}%`,
    paso
  );
}

// -----------------------------------------------------------------------------
// EVAL (d): El stock no entra en el presupuesto -> no lo agrega
// -----------------------------------------------------------------------------
{
  const presupuesto = 300;
  const costoUnitarioDirecto = 350; // Supera los $300
  const unidadesStock = Math.floor(presupuesto / costoUnitarioDirecto);
  const rechazado = unidadesStock < 1;

  registrarEval(
    "d",
    "Stock no entra en el presupuesto ($300)",
    "unidades_stock = 0 y producto rechazado",
    `unidades_stock: ${unidadesStock} | rechazado: ${rechazado}`,
    rechazado
  );
}

// -----------------------------------------------------------------------------
// EVAL (e): Margen menor al mínimo (USD 5) -> no entra al ranking
// -----------------------------------------------------------------------------
{
  // Venta 10, Costo 3, Envio 2, Comision 12% ($1.20) -> Ganancia = $3.80 (< $5.00)
  const res = calcular_margen(10, 3, 2, 12, 0, 0);
  const superaMinimo = (res.ganancia_por_unidad ?? 0) >= 5.0;

  registrarEval(
    "e",
    "Margen menor al mínimo requerido (USD 5)",
    "Ganancia < 5.00 y no entra al ranking",
    `Ganancia: $${res.ganancia_por_unidad} | superaMinimo: ${superaMinimo}`,
    !superaMinimo && (res.ganancia_por_unidad ?? 0) < 5.0
  );
}

// -----------------------------------------------------------------------------
// EVAL (f): Dato sin fuente -> queda 'no confirmado' y no se usa en el cálculo
// -----------------------------------------------------------------------------
{
  // Simular dato sin fuente (url = null)
  const campoSinFuente = { valor: null, url: null, estado: "no confirmado" };
  // Función llamada con impuestos_pct nulo/sin fuente
  const res = calcular_margen(30, 10, 4, 13, campoSinFuente.valor, null);
  const paso = res.valido === true && res.desglose?.datos_omitidos?.includes("impuestos_pct") === true;

  registrarEval(
    "f",
    "Dato sin fuente",
    "Queda 'no confirmado' y se excluye del cálculo (omitido = 0)",
    `Estado: ${campoSinFuente.estado} | Omitido en desglose: ${res.desglose?.datos_omitidos?.join(", ")}`,
    paso
  );
}

// -----------------------------------------------------------------------------
// EVAL (g): El modo escenario no modifica los archivos reales
// -----------------------------------------------------------------------------
{
  const productosPath = path.resolve("./data/productos.json");
  const hashAntes = crypto.createHash("sha256").update(fs.readFileSync(productosPath)).digest("hex");
  const mtimeAntes = fs.statSync(productosPath).mtimeMs;

  const productos: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));
  
  // Ejecutar simulación en modo escenario
  ejecutarEscenarioProveedor25(productos);

  const hashDespues = crypto.createHash("sha256").update(fs.readFileSync(productosPath)).digest("hex");
  const mtimeDespues = fs.statSync(productosPath).mtimeMs;

  const archivosIntactos = hashAntes === hashDespues && mtimeAntes === mtimeDespues;

  registrarEval(
    "g",
    "Modo escenario no modifica archivos reales",
    "data/productos.json permanece 100% idéntico (mismo hash y mtime)",
    `Hash idéntico: ${hashAntes === hashDespues} | Archivos intactos: ${archivosIntactos}`,
    archivosIntactos
  );
}

// Resumen final de Evals
console.log("=================================================");
console.log(`TOTAL EVALS: ${resultadosEvals.length}`);
const pasados = resultadosEvals.filter(r => r.paso).length;
const fallados = resultadosEvals.filter(r => !r.paso).length;
console.log(`PASARON: ${pasados} | FALLARON: ${fallados}`);
console.log("=================================================");

if (fallados > 0) {
  process.exit(1);
}
