import nodemailer from "nodemailer";
import dotenv from "dotenv";


dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Ton adresse Gmail
    pass: process.env.EMAIL_PASS, // Mot de passe d'application (16 caractères)
  },
});

export default transporter;