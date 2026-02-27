import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("Trading News Backend is running!");
});

// model sending email feature using nodemailer
app.post("/send-email", async (req, res) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: ["segundaviddev@gmail.com", "gerardo@myresumator.com"],
      subject: "Trading News Update",
      html: "<p>Hello World</p>",
    };

    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully", info });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error", details: err });
  }
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
