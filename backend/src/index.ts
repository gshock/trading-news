import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import emailRoutes from "./routes/emailRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import { TableStorageService } from "./services/tableStorageService.js";

// Load environment variables FIRST
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS: use allowlist from env if provided, otherwise allow all (current behavior)
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Always allow non-browser or same-origin requests without an Origin header
    if (!origin) {
      return callback(null, true);
    }

    // If no allowlist is configured, preserve existing behavior (allow all origins)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
};

app.use(cors(corsOptions));
// Routes
app.get("/", (req, res) => {
  res.send("Trading News Backend is running!");
});

app.use("/api/v1", emailRoutes);
app.use("/api/v1", subscriptionRoutes);

// Initialize table storage and start server
async function startServer() {
  try {
    // Ensure Azure Table Storage is set up
    const tableService = new TableStorageService();
    await tableService.ensureTableExists();
    console.log("Azure Table Storage initialized");

    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

startServer();
