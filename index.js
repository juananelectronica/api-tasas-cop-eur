const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

let cache = {
  tasaEURtoCOP: null,
  fechaOficial: null,
  ultimaActualizacion: null
};

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

app.get("/api/tasa", async (req, res) => {
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

app.get("/", (req, res) => {
  res.json({
    status: "API funcionando",
    endpoints: ["/api/tasa"],
    source: "ExchangeRate-API"
  });
});

app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
});