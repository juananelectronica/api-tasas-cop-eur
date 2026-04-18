const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Clave secreta - SOLO TU APP LA CONOCE
const SECRET_KEY = "xk9#mP2$vL8@qR5&wN7!tH3%jK6^yB1*zX4?cF0";

app.use(cors());

let cache = {
  tasaEURtoCOP: null,
  fechaOficial: null,
  ultimaActualizacion: null
};

// Middleware para verificar la clave secreta
function verificarClave(req, res, next) {
  const claveRecibida = req.headers['x-api-key'] || req.query.key;
  
  if (!claveRecibida || claveRecibida !== SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: "Acceso no autorizado. Clave API inválida."
    });
  }
  next();
}

async function obtenerTasaExchangeRate() {
  try {
    const response = await axios.get("https://api.exchangerate-api.com/v4/latest/EUR");
    
    if (response.data && response.data.rates && response.data.rates.COP) {
      return {
        tasaEURtoCOP: response.data.rates.COP,
        fechaOficial: response.data.date,
        timestamp: new Date().toISOString()
      };
    }
    throw new Error("No se encontró tasa para COP");
  } catch (error) {
    console.error("Error al obtener tasa:", error.message);
    return null;
  }
}

// Endpoint protegido con clave
app.get("/api/tasa", verificarClave, async (req, res) => {
  const ahora = Date.now();
  if (cache.tasaEURtoCOP && cache.ultimaActualizacion && (ahora - cache.ultimaActualizacion) < 21600000) {
    return res.json({
      success: true,
      source: "ExchangeRate-API (cache)",
      base: "EUR",
      target: "COP",
      rate: cache.tasaEURtoCOP,
      officialDate: cache.fechaOficial,
      consultedAt: new Date().toISOString()
    });
  }
  
  const data = await obtenerTasaExchangeRate();
  if (data) {
    cache = {
      tasaEURtoCOP: data.tasaEURtoCOP,
      fechaOficial: data.fechaOficial,
      ultimaActualizacion: Date.now()
    };
    return res.json({
      success: true,
      source: "ExchangeRate-API (actualizado)",
      base: "EUR",
      target: "COP",
      rate: data.tasaEURtoCOP,
      officialDate: data.fechaOficial,
      consultedAt: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    success: false,
    error: "No se pudo obtener la tasa de cambio"
  });
});

// Endpoint de salud (sin protección)
app.get("/", (req, res) => {
  res.json({
    status: "API funcionando",
    endpoints: ["/api/tasa (requiere clave API)"],
    source: "ExchangeRate-API"
  });
});

app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
  console.log(`Endpoint protegido: /api/tasa`);
});
