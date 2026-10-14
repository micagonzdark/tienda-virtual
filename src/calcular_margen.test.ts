import { calcular_margen } from "./calcular_margen.js";

console.log("=== PRUEBAS DE LA FUNCIÓN calcular_margen ===");

let passed = 0;
let failed = 0;

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}: ${actual}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: esperado ${expected}, pero se obtuvo ${actual}`);
    failed++;
  }
}

// Caso 1: Caso Estándar calculado a mano
// Venta: 30, Costo: 10, Envio: 4, Comision: 13%, Impuestos: 10.5%, Devoluciones: 2%
// Porcentajes = 25.5% de 30 = 7.65
// Costo total = 10 + 4 + 7.65 = 21.65
// Ganancia = 30 - 21.65 = 8.35
// Margen = (8.35 / 30) * 100 = 27.83%
const res1 = calcular_margen(30, 10, 4, 13, 10.5, 2);
assertEqual(res1.valido, true, "Caso 1 - Valido");
assertEqual(res1.ganancia_por_unidad, 8.35, "Caso 1 - Ganancia por unidad");
assertEqual(res1.margen_porcentual, 27.83, "Caso 1 - Margen porcentual");

// Caso 2: Producto a pérdida (Costo mayor a venta)
// Venta: 15, Costo: 18, Envio: 3, Comision: 13%, Impuestos: 5%, Devoluciones: 2%
// Porcentajes = 20% de 15 = 3
// Costo total = 18 + 3 + 3 = 24
// Ganancia = 15 - 24 = -9
// Margen = (-9 / 15) * 100 = -60%
const res2 = calcular_margen(15, 18, 3, 13, 5, 2);
assertEqual(res2.valido, true, "Caso 2 - Valido");
assertEqual(res2.ganancia_por_unidad, -9.00, "Caso 2 - Ganancia negativa");
assertEqual(res2.margen_porcentual, -60.00, "Caso 2 - Margen negativo");

// Caso 3: Ganancia menor al mínimo (menos de USD 5)
// Venta: 12, Costo: 5, Envio: 2, Comision: 15%, Impuestos: 5%, Devoluciones: 2%
// Porcentajes = 22% de 12 = 2.64
// Costo total = 5 + 2 + 2.64 = 9.64
// Ganancia = 12 - 9.64 = 2.36
// Margen = (2.36 / 12) * 100 = 19.67%
const res3 = calcular_margen(12, 5, 2, 15, 5, 2);
assertEqual(res3.valido, true, "Caso 3 - Valido");
assertEqual(res3.ganancia_por_unidad, 2.36, "Caso 3 - Ganancia menor a 5");
assertEqual(res3.margen_porcentual, 19.67, "Caso 3 - Margen porcentual");

// Caso 4: Datos faltantes o nulos (debe fallar limpiamente y no calcular)
const res4 = calcular_margen(20, null as any, 3, 13, 10, 2);
assertEqual(res4.valido, false, "Caso 4 - Nulo produce valido=false");
assertEqual(res4.ganancia_por_unidad, null, "Caso 4 - Ganancia es null");

// Caso 5: Precio de venta 0 o inválido
const res5 = calcular_margen(0, 5, 2, 13, 10, 2);
assertEqual(res5.valido, false, "Caso 5 - Precio cero produce valido=false");

console.log(`\nResumen: ${passed} pasados, ${failed} fallados.`);
if (failed > 0) {
  process.exit(1);
}
