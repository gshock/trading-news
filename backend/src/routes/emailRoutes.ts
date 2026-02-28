import express from "express";
import { EmailController } from "../controllers/emailController.js";
import { BlobStorageService } from "../services/blobStorageService.js";
import { EmailService } from "../services/emailService.js";

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

// GET /send-mail
router.get("/send-mail", (req, res) => {
  const controller = initializeServices();
  return controller.sendMail(req, res);
});

export default router;
