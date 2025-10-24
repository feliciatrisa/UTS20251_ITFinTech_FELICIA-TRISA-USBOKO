import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";
import { whatsappService } from "../../../lib/whatsapp";

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { phone, password, isAdmin } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ 
        message: "Nomor telepon dan password harus diisi" 
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ 
        message: "Nomor telepon atau password salah" 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: "Nomor telepon atau password salah" 
      });
    }

    // Check if admin login is requested but user is not admin
    if (isAdmin && user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // If admin, login directly
    if (user.role === "admin") {
      const token = jwt.sign(
        { 
          userId: user._id, 
          phone: user.phone, 
          role: user.role 
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        message: "Login admin berhasil",
        token,
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role
        },
        redirectTo: "/admin/dashboard"
      });
    }

    // For regular users, generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update user with OTP
    await User.findByIdAndUpdate(user._id, {
      otp,
      otpExpiry
    });

    // Send OTP via WhatsApp
    const whatsappResult = await whatsappService.sendOTP(phone, otp);
    
    if (!whatsappResult.success) {
      console.error('Failed to send WhatsApp OTP:', whatsappResult.error);
      // In production, you might want to return an error here
      // For now, we'll continue and log the OTP for development
    }

    console.log(`OTP for ${phone}: ${otp}`); // For development

    res.status(200).json({
      message: "OTP telah dikirim ke WhatsApp Anda",
      requiresOTP: true,
      userId: user._id
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}