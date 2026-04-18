const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({ mensaje: 'Bienvenido a la API de tasas COP-EUR' });
});

app.get('/api/tasa', (req, res) => {
  // Aquí irá la lógica para obtener las tasas
  res.json({ 
    cop: 1,
    eur: 0.00021,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
