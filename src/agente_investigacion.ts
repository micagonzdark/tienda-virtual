import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { calcular_margen, ResultadoMargen } from "./calcular_margen.js";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

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
  calculo_margen: ResultadoMargen & { es_provisional?: boolean };
  cumple_reglas: boolean;
  motivo_descarte: string | null;
  unidades_stock_posibles: number | null;
  inversion_stock_estimada: number | null;
}

// Función auxiliar para parsear y reparar JSON
function parsearJsonRobusto(rawText: string): any {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let jsonStr = match[0];
  // 1. Limpieza de sufijos ARS, USD, etc.
  jsonStr = jsonStr.replace(/:\s*([0-9.]+)\s*(?:ARS|USD|ars|usd|\$)\b/gi, ": $1");
  jsonStr = jsonStr.replace(/:\s*([0-9]+),([0-9]{1,2})\b/g, ": $1.$2");
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(jsonStr);
  } catch (err1) {
    // 2. Limpieza de caracteres de control
    try {
      const sSanitized = jsonStr.replace(/[\u0000-\u001f]/g, (ch) => (ch === "\n" || ch === "\r") ? " " : "");
      return JSON.parse(sSanitized);
    } catch (err2) {
      return null;
    }
  }
}

async function repararConReintento(client: OpenAI, rawText: string): Promise<any> {
  console.log("   ⚠️ Intentando reparación automática de JSON con el modelo...");
  try {
    const comp = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "Sos un formateador de datos estricto. Convierte el texto siguiente en un único objeto JSON válido sin texto extra, sin markdown, sin comentarios y con números puros."
        },
        {
          role: "user",
          content: rawText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });
    const content = comp.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (e: any) {
    console.warn("   ⚠️ Falló el reintento de reparación:", e.message);
  }
  return null;
}

export async function investigarProducto(
  candidato: any,
  usarCache: boolean,
  client?: OpenAI,
  productosExistentesMap?: Map<string, FichaProducto>
): Promise<FichaProducto> {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const cachePath = path.resolve(`./data/cache/${candidato.id}.json`);

  console.log(`\n==================================================`);
  console.log(`Investigando: ${candidato.nombre} (${candidato.id})`);
  console.log(`==================================================`);

  let rawData: any = null;

  // 1. Verificar si se debe usar cache
  if (usarCache && fs.existsSync(cachePath)) {
    console.log(`⚡ Usando datos cacheados desde: data/cache/${candidato.id}.json`);
    try {
      rawData = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } catch (e: any) {
      console.warn(`Error leyendo cache ${cachePath}: ${e.message}`);
    }
  }

  // 2. Si no hay cache, ejecutar búsqueda web en vivo con OpenAI
  if (!rawData) {
    if (!client) {
      if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
      client = new OpenAI({ apiKey });
    }

    // Cargar instrucciones editables por el alumno
    const instruccionesPath = path.resolve("./agente/instrucciones.md");
    let instruccionesAlumno = "";
    if (fs.existsSync(instruccionesPath)) {
      instruccionesAlumno = fs.readFileSync(instruccionesPath, "utf-8");
    }

    const prompt = `
${instruccionesAlumno}

Investigá el siguiente producto específico:
ID: "${candidato.id}"
Producto: "${candidato.nombre}"
Categoría: "${candidato.categoria}"
Término sugerido para MercadoLibre: "${candidato.termino_busqueda_ml}"
Término sugerido para Proveedores: "${candidato.termino_busqueda_proveedor}"

Respondé con un JSON válido con esta estructura:
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
IMPORTANTE: Números como valores JSON válidos sin símbolos de moneda ni texto.
`;

    try {
      console.log("🌐 Consultando web en vivo vía OpenAI Responses API...");
      const response = await (client as any).responses.create({
        model: model,
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      });

      let text = "";
      for (const item of response.output || []) {
        if (item.type === "message" && item.content) {
          for (const part of item.content) {
            if (part.type === "output_text") text += part.text;
          }
        }
      }

      rawData = parsearJsonRobusto(text);

      // Si falló el parseo, ejecutar reintento automático con esquema
      if (!rawData) {
        rawData = await repararConReintento(client, text);
      }

      // Guardar en cache para ejecuciones futuras
      if (rawData) {
        fs.writeFileSync(cachePath, JSON.stringify(rawData, null, 2), "utf-8");
        console.log(`💾 Resultado guardado en cache: data/cache/${candidato.id}.json`);
      }
    } catch (err: any) {
      console.warn(`Aviso en búsqueda para ${candidato.nombre}: ${err.message}. Continuando de forma segura.`);
    }
  }

  // Normalizador de datos
  const normalizarDato = (campo: any, tipoNum = true): DatoCampo<any> => {
    if (!campo || campo.valor === undefined || campo.valor === null || campo.estado === "no confirmado" || !campo.url) {
      return {
        valor: null,
        url: campo?.url || null,
        fecha_consulta: fechaHoy,
        estado: "no confirmado",
        detalles: campo?.detalles || "Dato no confirmado (editable en data/productos.json)"
      };
    }
    const val = tipoNum ? Number(campo.valor) : campo.valor;
    if (tipoNum && isNaN(val)) {
      return {
        valor: null,
        url: campo.url,
        fecha_consulta: fechaHoy,
        estado: "no confirmado",
        detalles: "Valor no numérico"
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
  
  // Soporte para flete e impuestos editables por el alumno:
  // Si en el archivo data/productos.json previo el alumno ya ingresó un valor, conservarlo.
  const previo = productosExistentesMap?.get(candidato.id);
  
  let costoEnvio = normalizarDato(rawData?.costo_envio_usd);
  if (previo && previo.costo_envio && previo.costo_envio.valor !== null && typeof previo.costo_envio.valor === "number") {
    costoEnvio = previo.costo_envio;
    console.log(`✏️ Manteniendo costo de envío editado por alumno: $${costoEnvio.valor} USD`);
  }

  let impuestos = normalizarDato(rawData?.impuestos_pct);
  if (previo && previo.impuestos_pct && previo.impuestos_pct.valor !== null && typeof previo.impuestos_pct.valor === "number") {
    impuestos = previo.impuestos_pct;
    console.log(`✏️ Manteniendo impuestos editados por alumno: ${impuestos.valor}%`);
  }

  const comisionMl = normalizarDato(rawData?.comision_ml_pct);
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

  // Cálculo de margen
  const calculo = calcular_margen(
    precioVentaFinal.valor,
    costoProveedor.valor,
    costoEnvio.valor,
    comisionMl.valor,
    impuestos.valor,
    tasaDevoluciones.valor
  );

  // El margen es PROVISIONAL si falta confirmar flete o impuestos
  const esProvisional = costoEnvio.valor === null || impuestos.valor === null;
  const calculoConProvisional = {
    ...calculo,
    es_provisional: esProvisional
  };

  // Reglas de negocio desde data/reglas.json
  const reglasPath = path.resolve("./data/reglas.json");
  const reglas = JSON.parse(fs.readFileSync(reglasPath, "utf-8"));
  const gananciaMinima = reglas.ganancia_minima_unidad_usd || 5.0;
  const presupuestoStock = reglas.presupuesto_stock_usd || 300.0;

  let cumpleReglas = true;
  const motivos: string[] = [];

  if (!calculo.valido || calculo.ganancia_por_unidad === null) {
    cumpleReglas = false;
    motivos.push(calculo.error || "Faltan datos confiables para calcular el margen");
  } else {
    if (calculo.ganancia_por_unidad < gananciaMinima) {
      cumpleReglas = false;
      motivos.push(`Ganancia ($${calculo.ganancia_por_unidad}) menor al mínimo requerido ($${gananciaMinima.toFixed(2)})`);
    }
  }

  // Stock
  let unidadesStock: number | null = null;
  let inversionStock: number | null = null;

  if (costoProveedor.valor !== null) {
    const costoDirectoUnitario = (costoProveedor.valor || 0) + (costoEnvio.valor || 0);
    if (costoDirectoUnitario > 0) {
      unidadesStock = Math.floor(presupuestoStock / costoDirectoUnitario);
      inversionStock = Math.round(unidadesStock * costoDirectoUnitario * 100) / 100;
      if (unidadesStock < 1) {
        cumpleReglas = false;
        motivos.push(`El costo unitario excede el presupuesto total de USD ${presupuestoStock}`);
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
    calculo_margen: calculoConProvisional,
    cumple_reglas: cumpleReglas,
    motivo_descarte: motivos.length > 0 ? motivos.join("; ") : null,
    unidades_stock_posibles: unidadesStock,
    inversion_stock_estimada: inversionStock
  };

  console.log(`Resultado ${candidato.id}: Venta USD ${precioVentaFinal.valor ?? "N/C"} | Proveedor USD ${costoProveedor.valor ?? "N/C"} | Ganancia USD ${calculo.ganancia_por_unidad ?? "N/C"} (Provisional: ${esProvisional}) | Cumple: ${cumpleReglas}`);
  return ficha;
}

export async function ejecutarInvestigacionCompleta(): Promise<FichaProducto[]> {
  const args = process.argv.slice(2);
  const usarCache = args.includes("--usar-cache") || process.env.USAR_CACHE === "true";

  const candidatosPath = path.resolve("./data/candidatos.json");
  const productosPath = path.resolve("./data/productos.json");

  const candidatos = JSON.parse(fs.readFileSync(candidatosPath, "utf-8"));
  
  // Mapa de productos existentes para preservar ediciones del alumno
  const productosExistentesMap = new Map<string, FichaProducto>();
  if (fs.existsSync(productosPath)) {
    try {
      const exist: FichaProducto[] = JSON.parse(fs.readFileSync(productosPath, "utf-8"));
      for (const p of exist) {
        productosExistentesMap.set(p.id, p);
      }
    } catch (e) {}
  }

  console.log(`Iniciando investigación de ${candidatos.length} productos (Modo cache: ${usarCache ? "ACTIVADO" : "DESACTIVADO"})...`);
  
  let client: OpenAI | undefined;
  if (!usarCache && apiKey) {
    client = new OpenAI({ apiKey });
  }

  const productos: FichaProducto[] = [];

  for (const c of candidatos) {
    const ficha = await investigarProducto(c, usarCache, client, productosExistentesMap);
    productos.push(ficha);
  }

  fs.writeFileSync(productosPath, JSON.stringify(productos, null, 2), "utf-8");
  console.log(`\nInvestigación finalizada. Fichas guardadas en ${productosPath}`);
  return productos;
}

if (process.argv[1] && process.argv[1].endsWith("agente_investigacion.ts")) {
  ejecutarInvestigacionCompleta().catch(console.error);
}
