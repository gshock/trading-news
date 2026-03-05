import express from "express";
import rateLimit from "express-rate-limit";
import { EmailController } from "../controllers/emailController.js";
import { BlobStorageService } from "../services/blobStorageService.js";
import { EmailService } from "../services/emailService.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// Lazy initialization - services created on first request
let blobStorageService: BlobStorageService;
let emailService: EmailService;
let emailController: EmailController;

function initializeServices() {
  if (!emailController) {
    blobStorageService = new BlobStorageService();
    emailService = new EmailService();
    emailController = new EmailController(blobStorageService, emailService);
  }
  return emailController;
}

// Allow at most 10 send-mail requests per hour per IP
const sendMailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// POST /send-mail – requires a valid API key and is rate-limited
router.post("/send-mail", apiKeyAuth, sendMailLimiter, (req, res) => {
  const controller = initializeServices();
  return controller.sendMail(req, res);
});

export default router;
