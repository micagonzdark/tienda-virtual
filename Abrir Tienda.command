#!/bin/bash
# ==============================================================================
# Script de Inicio Rápido para Mac - Tienda Virtual (Plantilla 90 Minutos)
# Doble clic para ejecutar la demo completa sin configuraciones complejas.
# ==============================================================================

# 1. Asegurar que PATH incluya Homebrew en Macs Apple Silicon (/opt/homebrew) e Intel (/usr/local)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# 2. Entrar en la carpeta donde reside este script
cd "$(dirname "$0")" || exit 1
clear

echo "========================================================"
echo "   🚀 INICIANDO TIENDA VIRTUAL (MODO DEMO RÁPIDA)"
echo "========================================================"
echo ""

# 3. Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js no está instalado en tu Mac."
    echo "Intentando instalar Node.js automáticamente vía Homebrew..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "❌ Ni Node.js ni Homebrew fueron encontrados."
        echo "Por favor descargá e instalá Node.js (versión LTS) desde https://nodejs.org/"
        read -p "Presioná Enter para salir..."
        exit 1
    fi
fi

echo "✅ Node.js detectado: $(node -v)"

# 4. Instalar dependencias si falta node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del proyecto (npm install)..."
    npm install
fi

# 5. Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "🔑 Creando archivo .env inicial desde .env.example..."
    cp .env.example .env
fi

# 6. Ejecutar demo (agente con cache web + modelo en vivo + ranking)
echo ""
echo "🔍 Ejecutando el agente de investigación..."
npm run demo

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
