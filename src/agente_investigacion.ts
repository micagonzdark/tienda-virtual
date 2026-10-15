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

// Limpieza y parseo resiliente de JSON
function parsearJsonRobusto(rawText: string): any {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let jsonStr = match[0];
  // 1. Eliminar sufijos comunes que rompen JSON
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

  if (!client) {
    if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
    client = new OpenAI({ apiKey });
  }

  // Cargar instrucciones editables por el alumno en vivo
  const instruccionesPath = path.resolve("./agente/instrucciones.md");
  let instruccionesAlumno = "";
  if (fs.existsSync(instruccionesPath)) {
    instruccionesAlumno = fs.readFileSync(instruccionesPath, "utf-8");
  }

  let evidenciaBusqueda: any = null;

  // 1. Obtención de Evidencia de Búsqueda Web (desde cache o búsqueda en vivo)
  if (usarCache && fs.existsSync(cachePath)) {
    console.log(`⚡ Usando evidencia de búsqueda web en cache: data/cache/${candidato.id}.json`);
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      // Si el cache guardaba evidencia_web lo usamos, de lo contrario usamos el objeto directamente
      evidenciaBusqueda = cacheData.evidencia_web || cacheData;
    } catch (e: any) {
      console.warn(`Error leyendo cache ${cachePath}: ${e.message}`);
    }
  }

  if (!evidenciaBusqueda) {
    console.log("🌐 Realizando búsqueda web en vivo con OpenAI Responses API...");
    try {
      const webPrompt = `Buscá en MercadoLibre Argentina y proveedores como AliExpress/Alibaba información sobre: "${candidato.nombre}". Traé precios en ARS, cotización aproximada, URLs y opiniones reales de compradores.`;
      const response = await (client as any).responses.create({
        model: model,
        tools: [{ type: "web_search_preview" }],
        input: webPrompt,
      });

      let text = "";
      for (const item of response.output || []) {
        if (item.type === "message" && item.content) {
          for (const part of item.content) {
            if (part.type === "output_text") text += part.text;
          }
        }
      }

      evidenciaBusqueda = {
        busqueda_en_vivo_texto: text,
        fecha_captura: fechaHoy
      };

      // Guardar evidencia en cache para uso futuro
      fs.writeFileSync(cachePath, JSON.stringify({ id: candidato.id, nombre: candidato.nombre, evidencia_web: evidenciaBusqueda }, null, 2), "utf-8");
      console.log(`💾 Evidencia de búsqueda guardada en cache: data/cache/${candidato.id}.json`);
    } catch (err: any) {
      console.warn(`Aviso en búsqueda en vivo para ${candidato.nombre}: ${err.message}.`);
      evidenciaBusqueda = { error: err.message };
    }
  }

  // 2. EJECUCIÓN DEL MODELO EN VIVO:
  // El modelo corre SIEMPRE en vivo aplicando las instrucciones actuales del alumno
  // sobre la evidencia de búsqueda (cacheada o en vivo).
  console.log("🧠 Ejecutando modelo en vivo con instrucciones actuales de agente/instrucciones.md...");

  const promptModelo = `
${instruccionesAlumno}

A continuación tenés la información obtenida de la búsqueda web para el producto:
ID: "${candidato.id}"
Nombre: "${candidato.nombre}"
Categoría: "${candidato.categoria}"

EVIDENCIA DE BÚSQUEDA WEB:
${JSON.stringify(evidenciaBusqueda, null, 2)}

Tu tarea es analizar esta evidencia y generar la ficha estructurada respetando RIGUROSAMENTE las instrucciones y reglas de estilo arriba indicadas.

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
IMPORTANTE: Números como valores JSON puros sin texto como 'ARS' ni '$'.
`;

  let rawData: any = null;
  try {
    const comp = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: promptModelo
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const rawContent = comp.choices[0]?.message?.content || "";
    rawData = parsearJsonRobusto(rawContent);

    if (!rawData) {
      rawData = await repararConReintento(client, rawContent);
    }
  } catch (err: any) {
    console.warn(`Error en llamada al modelo para ${candidato.nombre}: ${err.message}`);
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
  // Si en data/productos.json previo el alumno ya cargó un número válido, conservarlo.
  const previo = productosExistentesMap?.get(candidato.id);
  
  let costoEnvio = normalizarDato(rawData?.costo_envio_usd);
  if (previo && previo.costo_envio && previo.costo_envio.valor !== null && typeof previo.costo_envio.valor === "number") {
    costoEnvio = {
      ...previo.costo_envio,
      detalles: previo.costo_envio.detalles || "Costo de envío cargado manualmente por el alumno"
    };
    console.log(`✏️ Manteniendo flete editado por alumno: $${costoEnvio.valor} USD`);
  }

  let impuestos = normalizarDato(rawData?.impuestos_pct);
  if (previo && previo.impuestos_pct && previo.impuestos_pct.valor !== null && typeof previo.impuestos_pct.valor === "number") {
    impuestos = {
      ...previo.impuestos_pct,
      detalles: previo.impuestos_pct.detalles || "Impuestos cargados manualmente por el alumno"
    };
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
  const gananciaMinima = reglas.ganancia_minima_unidad_usd ?? 5.0;
  const presupuestoStock = reglas.presupuesto_stock_usd ?? 300.0;

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

  console.log(`Iniciando investigación de ${candidatos.length} productos (Modo cache web: ${usarCache ? "ACTIVADO" : "DESACTIVADO"})...`);
  
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY no configurada en .env");
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

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
