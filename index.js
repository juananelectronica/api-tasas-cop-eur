const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

let cache = {
  tasaEURtoCOP: null,
  fechaOficial: null,
  ultimaActualizacion: null
};

async function obtenerTasaBCE() {
  try {
    const response = await axios.get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    // Navegar por la estructura del XML
    const envelope = result["gesmes:Envelope"];
    if (!envelope) throw new Error("No se encontró el envelope");
    
    const cube = envelope.Cube;
    if (!cube || !cube[0]) throw new Error("No se encontró Cube");
    
    const timeCube = cube[0];
    const currencies = timeCube.Cube;
    if (!currencies) throw new Error("No se encontraron monedas");
    
    let tasaEURtoCOP = null;
    for (const currency of currencies) {
      if (currency.$.currency === "COP") {
        tasaEURtoCOP = parseFloat(currency.$.rate);
        break;
      }
    }
    
    if (tasaEURtoCOP) {
      const fecha = timeCube.$.time;
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

app.get("/api/tasa", async (req, res) => {
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

app.get("/", (req, res) => {
  res.json({
    status: "API funcionando",
    endpoints: ["/api/tasa"],
    source: "Banco Central Europeo (BCE)"
  });
});

app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
});