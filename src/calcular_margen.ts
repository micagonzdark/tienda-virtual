/**
 * Función y herramienta de cálculo de margen financiero para tienda virtual.
 */

export interface ResultadoMargen {
  valido: boolean;
  ganancia_por_unidad: number | null;
  margen_porcentual: number | null;
  desglose?: {
    precio_venta: number;
    costo_producto: number;
    envio: number;
    costos_porcentuales: number;
    costo_total: number;
  };
  error?: string;
}

/**
 * Calcula la ganancia por unidad y el margen porcentual de un producto.
 * 
 * Fórmula:
 * - Deducciones porcentuales = precio_venta * ((comision_pct + impuestos_pct + devoluciones_pct) / 100)
 * - Costo total = costo_producto + envio + deducciones_porcentuales
 * - Ganancia por unidad = precio_venta - costo_total
 * - Margen porcentual = (ganancia_por_unidad / precio_venta) * 100
 */
export function calcular_margen(
  precio_venta: number | null | undefined,
  costo_producto: number | null | undefined,
  envio: number | null | undefined,
  comision_pct: number | null | undefined,
  impuestos_pct: number | null | undefined,
  devoluciones_pct: number | null | undefined
): ResultadoMargen {
  // Validación estricta: si falta algún dato clave o no es número válido, no calcula
  const valores = [precio_venta, costo_producto, envio, comision_pct, impuestos_pct, devoluciones_pct];
  if (valores.some(v => v === null || v === undefined || typeof v !== "number" || isNaN(v))) {
    return {
      valido: false,
      ganancia_por_unidad: null,
      margen_porcentual: null,
      error: "Faltan datos clave confiables para calcular el margen"
    };
  }

  const pVenta = Number(precio_venta);
  const cProd = Number(costo_producto);
  const cEnvio = Number(envio);
  const pComision = Number(comision_pct);
  const pImpuestos = Number(impuestos_pct);
  const pDevoluciones = Number(devoluciones_pct);

  if (pVenta <= 0) {
    return {
      valido: false,
      ganancia_por_unidad: null,
      margen_porcentual: null,
      error: "El precio de venta debe ser mayor a cero"
    };
  }

  const sumaPct = pComision + pImpuestos + pDevoluciones;
  const costosPorcentuales = pVenta * (sumaPct / 100);
  const costoTotal = cProd + cEnvio + costosPorcentuales;
  const ganancia = pVenta - costoTotal;
  const margen = (ganancia / pVenta) * 100;

  return {
    valido: true,
    ganancia_por_unidad: Math.round(ganancia * 100) / 100,
    margen_porcentual: Math.round(margen * 100) / 100,
    desglose: {
      precio_venta: Math.round(pVenta * 100) / 100,
      costo_producto: Math.round(cProd * 100) / 100,
      envio: Math.round(cEnvio * 100) / 100,
      costos_porcentuales: Math.round(costosPorcentuales * 100) / 100,
      costo_total: Math.round(costoTotal * 100) / 100
    }
  };
}

/**
 * Definición de la herramienta compatible con OpenAI Function Calling
 */
export const calcularMargenToolDefinition = {
  type: "function" as const,
  function: {
    name: "calcular_margen",
    description: "Calcula la ganancia neta por unidad y el margen porcentual a partir de los costos directos y comisiones de venta.",
    parameters: {
      type: "object",
      properties: {
        precio_venta: {
          type: "number",
          description: "Precio de venta al público en USD"
        },
        costo_producto: {
          type: "number",
          description: "Costo unitario de compra al proveedor en USD"
        },
        envio: {
          type: "number",
          description: "Costo de envío internacional/nacional por unidad en USD"
        },
        comision_pct: {
          type: "number",
          description: "Porcentaje de comisión de la plataforma de venta (ej: 13.0 para 13%)"
        },
        impuestos_pct: {
          type: "number",
          description: "Porcentaje estimado de impuestos e ingresos brutos (ej: 10.5)"
        },
        devoluciones_pct: {
          type: "number",
          description: "Porcentaje de provisión por devoluciones o fallas (ej: 2.0)"
        }
      },
      required: ["precio_venta", "costo_producto", "envio", "comision_pct", "impuestos_pct", "devoluciones_pct"]
    }
  }
};
