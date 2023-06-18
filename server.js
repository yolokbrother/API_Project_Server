// backend/server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const swaggerSetup = require("./swagger");


const app = express();

swaggerSetup(app);
app.use(cors());
app.use(express.json());
app.use("/api", routes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Export the app instance