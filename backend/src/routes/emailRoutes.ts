import express from "express";
import { EmailController } from "../controllers/emailController.js";

const router = express.Router();
const emailController = new EmailController();

// POST /send-mail
router.post("/send-mail", emailController.sendMail);

export default router;
