const express = require("express");
const cors = require("cors");
require("dotenv").config();
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(5000, () => console.log("Server running on port 5000"));