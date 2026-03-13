import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import https from "node:https";
import http from "node:http";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import emailRoutes from "./routes/emailRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import orbRoutes from "./routes/orbRoutes.js";
import { TableStorageService } from "./services/tableStorageService.js";
import { SchedulerService } from "./services/schedulerService.js";

// Load environment variables FIRST
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Trust the reverse proxy (Azure Container Apps) so express-rate-limit reads the real client IP
app.set("trust proxy", 1);

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
app.use("/api/v1", agentRoutes);
app.use("/api/v1", orbRoutes);

// Initialize table storage and start server
async function startServer() {
  try {
    // Ensure Azure Table Storage is set up
    const tableService = new TableStorageService();
    await tableService.ensureTableExists();
    console.log("Azure Table Storage initialized");

    // Start the pre-market briefing scheduler (5:30 AM EST, Mon-Fri)
    if (process.env.ENABLE_SCHEDULER !== "false") {
      const scheduler = new SchedulerService();
      scheduler.start();
    }

    const certPath = "localhost+1.pem";
    const keyPath = "localhost+1-key.pem";
    if (existsSync(certPath) && existsSync(keyPath)) {
      const sslOptions = {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      };
      https.createServer(sslOptions, app).listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
      });
    } else {
      http.createServer(app).listen(port, () => {
        console.log(`Server is running on http://localhost:${port} (no SSL certs found)`);
      });
    }
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

startServer();
