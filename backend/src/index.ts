import express from "express";
import dotenv from "dotenv";
import emailRoutes from "./routes/emailRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.send("Trading News Backend is running!");
});

app.use("/api/v1", emailRoutes);

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
