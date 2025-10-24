import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { userId, otp } = req.body;

    // Validate input
    if (!userId || !otp) {
      return res.status(400).json({ 
        message: "User ID dan OTP harus diisi" 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: "User tidak ditemukan" 
      });
    }

    // Check if OTP exists and not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ 
        message: "OTP tidak valid atau sudah kedaluwarsa" 
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ 
        message: "OTP sudah kedaluwarsa. Silakan login ulang." 
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({ 
        message: "OTP tidak valid" 
      });
    }

    // Clear OTP and mark as verified
    await User.findByIdAndUpdate(userId, {
      otp: null,
      otpExpiry: null,
      isVerified: true
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        phone: user.phone, 
        role: user.role 
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Verifikasi OTP berhasil",
      token,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}