import dotenv from "dotenv";
import express from "express";
import emailRoutes from "./routes/emailRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import { TableStorageService } from "./services/tableStorageService.js";
import { SchedulerService } from "./services/schedulerService.js";

// Load environment variables FIRST
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
app.use("/api/v1", subscriptionRoutes);
app.use("/api/v1", agentRoutes);

// Initialize table storage and start server
async function startServer() {
  try {
    // Ensure Azure Table Storage is set up
    const tableService = new TableStorageService();
    await tableService.ensureTableExists();
    console.log("Azure Table Storage initialized");

    // Start the pre-market briefing scheduler (9:00 AM EST, Mon-Fri)
    if (process.env.ENABLE_SCHEDULER !== "false") {
      const scheduler = new SchedulerService();
      scheduler.start();
    }

    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

startServer();
