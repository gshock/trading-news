import express from "express";
import { EmailController } from "../controllers/emailController.js";
import { BlobStorageService } from "../services/blobStorageService.js";
import { EmailService } from "../services/emailService.js";

const router = express.Router();

// Create service instances once
const blobStorageService = new BlobStorageService();
const emailService = new EmailService();

// Inject services into controller
const emailController = new EmailController(blobStorageService, emailService);

// POST /send-mail
router.post("/send-mail", emailController.sendMail);

export default router;
