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
    comision_pct: number;
    impuestos_pct: number;
    devoluciones_pct: number;
    costos_porcentuales: number;
    costo_total: number;
    datos_omitidos?: string[];
  };
  error?: string;
}

/**
 * Calcula la ganancia por unidad y el margen porcentual de un producto.
 * 
 * Regla:
 * - Datos clave indispensables: precio_venta y costo_producto. Si alguno falta, no calcula.
 * - Datos sin fuente ("no confirmados" o null): no se usan en el cálculo (se consideran 0) y se anotan.
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
  envio?: number | null,
  comision_pct?: number | null,
  impuestos_pct?: number | null,
  devoluciones_pct?: number | null
): ResultadoMargen {
  // Validación de datos clave indispensables
  if (precio_venta === null || precio_venta === undefined || isNaN(Number(precio_venta))) {
    return {
      valido: false,
      ganancia_por_unidad: null,
      margen_porcentual: null,
      error: "Falta dato clave: precio de venta no confirmado"
    };
  }

  if (costo_producto === null || costo_producto === undefined || isNaN(Number(costo_producto))) {
    return {
      valido: false,
      ganancia_por_unidad: null,
      margen_porcentual: null,
      error: "Falta dato clave: costo de producto no confirmado"
    };
  }

  const pVenta = Number(precio_venta);
  const cProd = Number(costo_producto);

  if (pVenta <= 0) {
    return {
      valido: false,
      ganancia_por_unidad: null,
      margen_porcentual: null,
      error: "El precio de venta debe ser mayor a cero"
    };
  }

  // Si un dato no tiene fuente confiable (null/undefined), NO se usa en el cálculo (se computa como 0)
  const datosOmitidos: string[] = [];
  
  const cEnvio = (envio !== null && envio !== undefined && !isNaN(Number(envio))) 
    ? Number(envio) 
    : (datosOmitidos.push("envio"), 0);

  const pComision = (comision_pct !== null && comision_pct !== undefined && !isNaN(Number(comision_pct))) 
    ? Number(comision_pct) 
    : (datosOmitidos.push("comision_pct"), 0);

  const pImpuestos = (impuestos_pct !== null && impuestos_pct !== undefined && !isNaN(Number(impuestos_pct))) 
    ? Number(impuestos_pct) 
    : (datosOmitidos.push("impuestos_pct"), 0);

  const pDevoluciones = (devoluciones_pct !== null && devoluciones_pct !== undefined && !isNaN(Number(devoluciones_pct))) 
    ? Number(devoluciones_pct) 
    : (datosOmitidos.push("devoluciones_pct"), 0);

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
      comision_pct: Math.round(pComision * 100) / 100,
      impuestos_pct: Math.round(pImpuestos * 100) / 100,
      devoluciones_pct: Math.round(pDevoluciones * 100) / 100,
      costos_porcentuales: Math.round(costosPorcentuales * 100) / 100,
      costo_total: Math.round(costoTotal * 100) / 100,
      datos_omitidos: datosOmitidos.length > 0 ? datosOmitidos : undefined
    }
  };
}

/**
 * Definición de herramienta para OpenAI Function Calling
 */
export const calcularMargenToolDefinition = {
  type: "function" as const,
  function: {
    name: "calcular_margen",
    description: "Calcula la ganancia neta por unidad y el margen porcentual. Si un dato no tiene fuente confiable, se omite.",
    parameters: {
      type: "object",
      properties: {
        precio_venta: { type: "number", description: "Precio de venta al público en USD" },
        costo_producto: { type: "number", description: "Costo unitario de compra al proveedor en USD" },
        envio: { type: "number", description: "Costo de envío en USD (opcional, 0 si no se conoce)" },
        comision_pct: { type: "number", description: "Porcentaje de comisión de venta (opcional)" },
        impuestos_pct: { type: "number", description: "Porcentaje de impuestos de importación (opcional)" },
        devoluciones_pct: { type: "number", description: "Porcentaje de provisión por devoluciones (opcional)" }
      },
      required: ["precio_venta", "costo_producto"]
    }
  }
};
