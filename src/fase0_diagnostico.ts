import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

async function main() {
  console.log("=== FASE 0: DIAGNÓSTICO ===");
  console.log(`Node version: ${process.version}`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  
  console.log(`OPENAI_MODEL configurado: ${model}`);
  console.log(`OPENAI_API_KEY presente: ${apiKey ? "Sí (longitud: " + apiKey.length + ")" : "No"}`);

  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY no encontrada en .env");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // 1. Probar llamada simple de completions
  try {
    console.log("\nProbando llamada básica a OpenAI Chat Completions...");
    const completion = await client.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "Responde únicamente: 'OK'" }],
      max_tokens: 10,
    });
    console.log("Respuesta básica:", completion.choices[0]?.message?.content?.trim());
  } catch (err: any) {
    console.error("Error en llamada básica a OpenAI:", err.message);
  }

  // 2. Probar herramienta de búsqueda web en la API de OpenAI
  console.log("\nProbando herramientas de búsqueda web disponibles en OpenAI...");
  
  // Enfoque A: Responses API con web_search_preview (si está disponible en el SDK)
  try {
    console.log("Intentando Enfoque A: client.responses.create con web_search_preview...");
    if ((client as any).responses && typeof (client as any).responses.create === "function") {
      const resp = await (client as any).responses.create({
        model: model,
        tools: [{ type: "web_search_preview" }],
        input: "¿Cuál es la cotización del dólar oficial en Argentina hoy? Incluí fuentes o URLs si las tenés.",
      });
      console.log("Enfoque A exitoso! Respuesta status:", resp.status);
      console.log("Output items:", JSON.stringify(resp.output, null, 2));
    } else {
      console.log("client.responses no está disponible en esta versión del SDK.");
    }
  } catch (err: any) {
    console.log("Enfoque A falló:", err.message);
  }

  // Enfoque B: Chat completions con web_search_preview tool
  try {
    console.log("\nIntentando Enfoque B: chat.completions con tool web_search_preview...");
    const comp = await client.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "¿Cuál es el precio promedio de un soporte para celular en MercadoLibre Argentina?" }],
      tools: [
        {
          type: "web_search_preview" as any,
        }
      ] as any,
    });
    console.log("Enfoque B exitoso! Respuesta:", comp.choices[0]?.message);
  } catch (err: any) {
    console.log("Enfoque B falló:", err.message);
  }

  // Enfoque C: Verificación de modelos disponibles
  try {
    console.log("\nVerificando modelos disponibles en la cuenta...");
    const models = await client.models.list();
    const modelIds = models.data.map(m => m.id).filter(id => id.includes("gpt-4") || id.includes("search") || id.includes("o1") || id.includes("o3"));
    console.log("Modelos relevantes encontrados:", modelIds.slice(0, 10));
  } catch (err: any) {
    console.log("Error listando modelos:", err.message);
  }
}

main().catch(console.error);
