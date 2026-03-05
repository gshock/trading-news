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

// POST /send-mail
router.post("/send-mail", (req, res) => {
  const controller = initializeServices();

  // Support reading folder timestamp `f` from the request body (preferred)
  // while still honoring the query parameter for backward compatibility.
  const bodyF = (req.body as any)?.f;
  const queryF = (req.query as any)?.f;
  const folderTimestamp = bodyF ?? queryF;

  if (folderTimestamp !== undefined && folderTimestamp !== null) {
    (req.query as any).f = folderTimestamp;
  }
  return controller.sendMail(req, res);
});

export default router;
