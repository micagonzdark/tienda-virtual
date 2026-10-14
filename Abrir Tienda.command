#!/bin/bash
# ==============================================================================
# Script de Inicio Rápido para Mac - Tienda Virtual (Plantilla 90 Minutos)
# Doble clic para ejecutar la demo completa sin configuraciones complejas.
# ==============================================================================

# 1. Entrar en la carpeta del proyecto
cd "$(dirname "$0")" || exit 1
clear

echo "========================================================"
echo "   🚀 INICIANDO TIENDA VIRTUAL (MODO DEMO RÁPIDA)"
echo "========================================================"
echo ""

# 2. Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js no está instalado en tu Mac."
    echo "Instalando Node.js automáticamente vía Homebrew..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "❌ Homebrew no está instalado."
        echo "Por favor descargá e instalá Node.js desde https://nodejs.org/"
        read -p "Presioná Enter para salir..."
        exit 1
    fi
fi

echo "✅ Node.js detectado: $(node -v)"

# 3. Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del proyecto (npm install)..."
    npm install
fi

# 4. Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "🔑 Creando archivo .env inicial desde .env.example..."
    cp .env.example .env
fi

# 5. Ejecutar el agente con cache para máxima velocidad
echo ""
echo "🔍 Ejecutando el agente de investigación (con cache activado)..."
npx tsx src/agente_investigacion.ts --usar-cache

# 6. Generar el ranking HTML
echo ""
echo "📊 Generando ranking visual de productos..."
npx tsx src/generar_ranking.ts

# 7. Abrir ranking.html en el navegador web
echo ""
echo "🎉 ¡Listo! Abriendo el ranking en tu navegador..."
if command -v open &> /dev/null; then
    open ranking.html
elif command -v xdg-open &> /dev/null; then
    xdg-open ranking.html
fi

echo ""
echo "========================================================"
echo " Proceso terminado con éxito. Podés cerrar esta ventana."
echo "========================================================"
