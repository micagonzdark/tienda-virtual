import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { calcular_margen, ResultadoMargen } from "./calcular_margen.js";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!apiKey) {
  console.error("ERROR: OPENAI_API_KEY no definida en .env");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

export interface DatoCampo<T> {
  valor: T;
  url: string | null;
  fecha_consulta: string;
  estado: "confirmado" | "no confirmado";
  detalles: string;
}

export interface FichaProducto {
  id: string;
  nombre: string;
  categoria: string;
  precio_venta: DatoCampo<number | null> & { valor_ars?: number | null };
  competencia_publicaciones: DatoCampo<number | null>;
  costo_proveedor: DatoCampo<number | null>;
  costo_envio: DatoCampo<number | null>;
  comision_ml_pct: DatoCampo<number | null>;
  impuestos_pct: DatoCampo<number | null>;
  tasa_devoluciones_pct: DatoCampo<number | null>;
  resenas: {
    hay_resenas: boolean;
    quejas: string[];
    url: string | null;
    fecha_consulta: string;
    estado: "confirmado" | "no confirmado";
    detalles: string;
  };
  calculo_margen: ResultadoMargen;
  cumple_reglas: boolean;
  motivo_descarte: string | null;
  unidades_stock_posibles: number | null;
  inversion_stock_estimada: number | null;
}

async function investigarProducto(candidato: any): Promise<FichaProducto> {
  const fechaHoy = new Date().toISOString().split("T")[0];
  console.log(`\n==================================================`);
  console.log(`Investigando: ${candidato.nombre} (${candidato.id})`);
  console.log(`==================================================`);

  const prompt = `
Sos un agente de investigación de mercado para comercio electrónico y dropshipping en Argentina.
Estás investigando el producto: "${candidato.nombre}"
Categoría: "${candidato.categoria}"
Término sugerido para MercadoLibre: "${candidato.termino_busqueda_ml}"
Término sugerido para Proveedores: "${candidato.termino_busqueda_proveedor}"

Buscá en la web información verídica, con fuentes concretas:
1. PRECIO DE VENTA EN MERCADOLIBRE ARGENTINA (MLA):
   - Buscá publicaciones activas en mercadolibre.com.ar del producto.
   - Indicá el precio en ARS y convertilo a USD (aproximadamente 1 USD = 1400-1500 ARS).
   - Medí la competencia: cuántos resultados o publicaciones parecidas aproximadas devuelve la búsqueda en ML Argentina.
   - Guardá la URL directa de la publicación o búsqueda en MercadoLibre.
2. COSTO EN PROVEEDOR (AliExpress, Alibaba o similar):
   - Buscá el costo unitario de compra en USD.
   - Guardá la URL directa de la publicación en AliExpress/Alibaba.
3. COSTO DE ENVÍO HACIA ARGENTINA:
   - Buscá el costo de envío a Argentina por unidad en USD (por ej. AliExpress Standard Shipping o Courier). Si no figura costo explícito de envío para este producto, dejalo en null y "no confirmado".
4. COMISIÓN DE MERCADOLIBRE:
   - Buscá la comisión por venta clásica vigente en MercadoLibre Argentina para la categoría (${candidato.categoria}, típicamente entre 12% y 16%).
   - Guardá la URL de ayuda/términos de MercadoLibre.
5. IMPUESTOS DE IMPORTACIÓN / RÉGIMEN ADUANERO:
   - Régimen Courier / pequeños envíos a Argentina (AFIP/ARCA o Correo Argentino). Si no encontrás un porcentaje o tasa confirmada aplicable a este producto individual, dejalo en null y "no confirmado".
6. TASA DE DEVOLUCIONES / PROBLEMAS HABITUALES:
   - Si encontrás estadísticas de tasa de retorno o porcentaje de fallas, guardalo. Si no hay dato verificable, dejalo en null y "no confirmado".
7. RESEÑAS Y QUEJAS:
   - Buscá opiniones de compradores en MercadoLibre o AliExpress sobre este producto.
   - Si encontrás opiniones reales, resumí las 3 quejas más repetidas.
   - Si NO encontrás reseñas reales verificadas, poné "hay_resenas": false, la lista de quejas vacía [], y dejá en claro que no se encontraron reseñas. ¡NUNCA inventes quejas si no hay fuentes!

REGLAS DE FORMATO CRÍTICAS:
- En los campos numéricos (valor, valor_ars, competencia, comision, etc.) escribe ÚNICAMENTE números puros (ej: 16.43 o 22999).
- NUNCA agregues sufijos como "ARS", "USD", "$" ni puntos de miles dentro de los números. Si no hay dato, poné null.
- Para cada dato, indicá la URL de donde lo sacaste, y si el dato es "confirmado" o "no confirmado".
- Si no encontrás un dato con una URL real y fuente confiable, el valor DEBE ser null y el estado "no confirmado".
- Es preferible que un campo quede null a inventar un valor falso.

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "precio_venta_usd": { "valor": number | null, "valor_ars": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "competencia_publicaciones": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "costo_proveedor_usd": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "costo_envio_usd": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "comision_ml_pct": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "impuestos_pct": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "tasa_devoluciones_pct": { "valor": number | null, "url": string | null, "estado": "confirmado" | "no confirmado", "detalles": string },
  "resenas": {
    "hay_resenas": boolean,
    "quejas": string[],
    "url": string | null,
    "estado": "confirmado" | "no confirmado",
    "detalles": string
  }
}
`;

  let rawData: any = null;
  try {
    const response = await (client as any).responses.create({
      model: model,
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    let text = "";
    for (const item of response.output || []) {
      if (item.type === "message" && item.content) {
        for (const part of item.content) {
          if (part.type === "output_text") {
            text += part.text;
          }
        }
      }
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let jsonStr = match[0];
      // Sanitización de números comunes con sufijos ARS/USD que rompen JSON estándar
      jsonStr = jsonStr.replace(/:\s*([0-9.]+)\s*(?:ARS|USD|ars|usd|\$)\b/gi, ": $1");
      jsonStr = jsonStr.replace(/:\s*([0-9]+),([0-9]{1,2})\b/g, ": $1.$2");
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
      try {
        rawData = JSON.parse(jsonStr);
      } catch (parseErr: any) {
        console.warn("Fallo primer intento de parseo JSON:", parseErr.message);
        // Segundo intento: limpiar caracteres de control / saltos de línea internos
        try {
          const sSanitized = jsonStr.replace(/[\u0000-\u001f]/g, (ch) => (ch === "\n" || ch === "\r") ? " " : "");
          rawData = JSON.parse(sSanitized);
        } catch (parseErr2: any) {
          console.warn("Fallo segundo intento de parseo JSON:", parseErr2.message);
        }
      }
    } else {
      console.warn("No se encontró JSON estructurado en la respuesta del modelo.");
    }
  } catch (err: any) {
    console.error(`Error en búsqueda web para ${candidato.nombre}:`, err.message);
  }

  // Normalizar campos con fallback seguro
  const normalizarDato = (campo: any, tipoNum = true): DatoCampo<any> => {
    if (!campo || campo.valor === undefined || campo.valor === null || campo.estado === "no confirmado" || !campo.url) {
      return {
        valor: null,
        url: campo?.url || null,
        fecha_consulta: fechaHoy,
        estado: "no confirmado",
        detalles: campo?.detalles || "Dato no confirmado o sin fuente confiable"
      };
    }
    const val = tipoNum ? Number(campo.valor) : campo.valor;
    if (tipoNum && isNaN(val)) {
      return {
        valor: null,
        url: campo.url,
        fecha_consulta: fechaHoy,
        estado: "no confirmado",
        detalles: "Valor numérico inválido"
      };
    }
    return {
      valor: val,
      url: campo.url,
      fecha_consulta: fechaHoy,
      estado: "confirmado",
      detalles: campo.detalles || ""
    };
  };

  const precioVenta = normalizarDato(rawData?.precio_venta_usd);
  const precioVentaFinal = {
    ...precioVenta,
    valor_ars: rawData?.precio_venta_usd?.valor_ars || null
  };

  const competencia = normalizarDato(rawData?.competencia_publicaciones);
  const costoProveedor = normalizarDato(rawData?.costo_proveedor_usd);
  const costoEnvio = normalizarDato(rawData?.costo_envio_usd);
  const comisionMl = normalizarDato(rawData?.comision_ml_pct);
  const impuestos = normalizarDato(rawData?.impuestos_pct);
  const tasaDevoluciones = normalizarDato(rawData?.tasa_devoluciones_pct);

  // Reseñas
  const resenasRaw = rawData?.resenas;
  const resenas = {
    hay_resenas: Boolean(resenasRaw?.hay_resenas && resenasRaw?.quejas?.length),
    quejas: Array.isArray(resenasRaw?.quejas) ? resenasRaw.quejas.slice(0, 3) : [],
    url: resenasRaw?.url || null,
    fecha_consulta: fechaHoy,
    estado: (resenasRaw?.hay_resenas && resenasRaw?.quejas?.length && resenasRaw?.url) ? "confirmado" as const : "no confirmado" as const,
    detalles: resenasRaw?.detalles || (resenasRaw?.hay_resenas ? "Reseñas encontradas" : "No se encontraron reseñas verificadas.")
  };

  // Llamada a la herramienta de cálculo de margen (el modelo no hace la cuenta)
  const calculo = calcular_margen(
    precioVentaFinal.valor,
    costoProveedor.valor,
    costoEnvio.valor,
    comisionMl.valor,
    impuestos.valor,
    tasaDevoluciones.valor
  );

  // Evaluación de reglas de negocio
  let cumpleReglas = true;
  const motivos: string[] = [];

  if (!calculo.valido || calculo.ganancia_por_unidad === null) {
    cumpleReglas = false;
    motivos.push(calculo.error || "Faltan datos confiables para calcular el margen");
  } else {
    if (calculo.ganancia_por_unidad < 5.0) {
      cumpleReglas = false;
      motivos.push(`Ganancia por unidad ($${calculo.ganancia_por_unidad}) menor al mínimo requerido ($5.00)`);
    }
  }

  // Stock y presupuesto ($300)
  let unidadesStock: number | null = null;
  let inversionStock: number | null = null;

  if (costoProveedor.valor !== null) {
    const costoDirectoUnitario = (costoProveedor.valor || 0) + (costoEnvio.valor || 0);
    if (costoDirectoUnitario > 0) {
      unidadesStock = Math.floor(300 / costoDirectoUnitario);
      inversionStock = Math.round(unidadesStock * costoDirectoUnitario * 100) / 100;
      if (unidadesStock < 1) {
        cumpleReglas = false;
        motivos.push("El costo unitario excede el presupuesto total de USD 300");
      }
    }
  }

  const ficha: FichaProducto = {
    id: candidato.id,
    nombre: candidato.nombre,
    categoria: candidato.categoria,
    precio_venta: precioVentaFinal,
    competencia_publicaciones: competencia,
    costo_proveedor: costoProveedor,
    costo_envio: costoEnvio,
    comision_ml_pct: comisionMl,
    impuestos_pct: impuestos,
    tasa_devoluciones_pct: tasaDevoluciones,
    resenas: resenas,
    calculo_margen: calculo,
    cumple_reglas: cumpleReglas,
    motivo_descarte: motivos.length > 0 ? motivos.join("; ") : null,
    unidades_stock_posibles: unidadesStock,
    inversion_stock_estimada: inversionStock
  };

  console.log(`Resultado ${candidato.id}: Venta USD ${precioVentaFinal.valor ?? "N/C"} | Proveedor USD ${costoProveedor.valor ?? "N/C"} | Ganancia USD ${calculo.ganancia_por_unidad ?? "N/C"} | Cumple: ${cumpleReglas}`);
  return ficha;
}

export async function ejecutarInvestigacionCompleta(): Promise<FichaProducto[]> {
  const candidatosPath = path.resolve("./data/candidatos.json");
  const candidatos = JSON.parse(fs.readFileSync(candidatosPath, "utf-8"));
  
  console.log(`Iniciando investigación de ${candidatos.length} productos...`);
  const productos: FichaProducto[] = [];

  for (const c of candidatos) {
    const ficha = await investigarProducto(c);
    productos.push(ficha);
  }

  const outputPath = path.resolve("./data/productos.json");
  fs.writeFileSync(outputPath, JSON.stringify(productos, null, 2), "utf-8");
  console.log(`\nInvestigación finalizada. Fichas guardadas en ${outputPath}`);
  return productos;
}

if (process.argv[1] && process.argv[1].endsWith("agente_investigacion.ts")) {
  ejecutarInvestigacionCompleta().catch(console.error);
}
