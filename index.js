const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para que tu app Neutralino pueda acceder
app.use(cors());

// Cache: guardar tasa por 6 horas (21600000 ms)
let cache = {
  tasaEURtoCOP: null,
  fechaOficial: null,
  ultimaActualizacion: null
};

// Función para obtener tasa del BCE
async function obtenerTasaBCE() {
  try {
    const response = await axios.get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const cubes = result["gesmes:Envelope"].Cube.Cube[0].Cube;
    let tasaEURtoCOP = null;
    
    for (const cube of cubes) {
      if (cube.$.currency === "COP") {
        tasaEURtoCOP = parseFloat(cube.$.rate);
        break;
      }
    }
    
    if (tasaEURtoCOP) {
      const fecha = result["gesmes:Envelope"].Cube.Cube[0].$.time;
      return {
        tasaEURtoCOP: tasaEURtoCOP,
        fechaOficial: fecha,
        timestamp: new Date().toISOString()
      };
    }
    throw new Error("No se encontró tasa para COP");
  } catch (error) {
    console.error("Error al obtener tasa del BCE:", error.message);
    return null;
  }
}

// Endpoint principal - devuelve tasa EUR → COP
app.get("/api/tasa", async (req, res) => {
  // Verificar caché (6 horas = 21600000 ms)
  const ahora = Date.now();
  if (cache.tasaEURtoCOP && cache.ultimaActualizacion && (ahora - cache.ultimaActualizacion) < 21600000) {
    return res.json({
      success: true,
      source: "BCE (cache)",
      base: "EUR",
      target: "COP",
      rate: cache.tasaEURtoCOP,
      officialDate: cache.fechaOficial,
      consultedAt: new Date().toISOString()
    });
  }
  
  // Obtener tasa nueva
  const data = await obtenerTasaBCE();
  if (data) {
    cache = {
      tasaEURtoCOP: data.tasaEURtoCOP,
      fechaOficial: data.fechaOficial,
      ultimaActualizacion: Date.now()
    };
    return res.json({
      success: true,
      source: "BCE (actualizado)",
      base: "EUR",
      target: "COP",
      rate: data.tasaEURtoCOP,
      officialDate: data.fechaOficial,
      consultedAt: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    success: false,
    error: "No se pudo obtener la tasa del BCE"
  });
});

// Endpoint de salud
app.get("/", (req, res) => {
  res.json({
    status: "API funcionando",
    endpoints: ["/api/tasa"],
    source: "Banco Central Europeo (BCE)",
    description: "Devuelve tasa EUR → COP"
  });
});

app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
  console.log(`Endpoint: /api/tasa - tasa EUR → COP`);
});