import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const client = new OpenAI({ apiKey });

async function probarUnaInvestigacion() {
  console.log("Probando investigación asistida con búsqueda web para 1 producto...");
  
  const prompt = `
Sos un agente de investigación de mercado para comercio electrónico en Argentina.
Estamos evaluando vender por dropshipping el siguiente producto:
Producto: "Soporte magnético para celular auto para rejilla"
Categoría: "Accesorios para celulares"

Buscá en la web información real y actual:
1. Precio de venta actual en MercadoLibre Argentina (MLA) en ARS y convertido a USD (usar aprox 1 USD = 1400-1500 ARS según la cotización actual). ¿Cuántas publicaciones parecidas hay en ML Argentina (nivel de competencia)?
2. Costo del producto en un proveedor mayorista o dropshipping (AliExpress o Alibaba) en USD.
3. Costo estimado de envío hasta Argentina en USD.
4. Comisión vigente de MercadoLibre para la categoría Accesorios de celulares (ej: clásica 13%-16%).
5. Impuestos de importación y régimen aplicable en Argentina (ej: régimen Courier o pequeños envíos).
6. Tasa de devoluciones estimada o problemas habituales.
7. Reseñas: 3 quejas más repetidas de compradores de este producto. Si no encontrás reseñas reales verificadas, decí que no hay reseñas y dejá la lista vacía; NO inventes quejas.

REGLAS CRÍTICAS:
- Para cada dato, indicá su valor, la URL de donde lo sacaste, y si el dato es "confirmado" o "no confirmado".
- Si no encontrás un dato con una fuente concreta y confiable, el valor DEBE ser null y el estado "no confirmado".
- NUNCA inventes datos. Es preferible un null con "no confirmado" a un dato inventado.

Respondé ÚNICAMENTE con un JSON válido (sin markdown adicional alrededor o dentro de un bloque \`\`\`json ... \`\`\`) con la siguiente estructura:
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

  const resp = await (client as any).responses.create({
    model: model,
    tools: [{ type: "web_search_preview" }],
    input: prompt,
  });

  console.log("Respuesta status:", resp.status);
  
  // Extraer texto
  let text = "";
  for (const item of resp.output || []) {
    if (item.type === "message" && item.content) {
      for (const part of item.content) {
        if (part.type === "output_text") {
          text += part.text;
        }
      }
    }
  }

  console.log("Texto obtenido (primeros 500 caracteres):\n", text.slice(0, 500));
  
  // Limpiar posibles bloques markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("JSON parseado con éxito:\n", JSON.stringify(parsed, null, 2));
  } else {
    console.error("No se encontró JSON en la respuesta");
  }
}

probarUnaInvestigacion().catch(console.error);
