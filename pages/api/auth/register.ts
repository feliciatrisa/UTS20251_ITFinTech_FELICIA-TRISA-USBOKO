import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
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

    const { phone, password, role } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ 
        message: "Nomor telepon dan password harus diisi" 
      });
    }

    // Validate phone format
    if (typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({ 
        message: "Format nomor telepon tidak valid" 
      });
    }

    // Validate role
    const userRole = role && ['user', 'admin'].includes(role) ? role : 'user';

    // Check if user already exists
    const existingUser = await User.findOne({ phone: phone.trim() });
    console.log('Checking existing user for phone:', phone.trim());
    console.log('Existing user found:', existingUser);
    
    if (existingUser) {
      return res.status(400).json({ 
        message: "Nomor telepon sudah terdaftar" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = new User({
      phone: phone.trim(),
      password: hashedPassword,
      role: userRole,
      isVerified: userRole === 'admin' ? true : false // Admin users are auto-verified
    });

    await user.save();

    res.status(201).json({
      message: "Registrasi berhasil. Silakan login untuk verifikasi OTP.",
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // // Handle duplicate key error specifically
    // if (error.code === 11000) {
    //   if (error.keyPattern && error.keyPattern.phone) {
    //     return res.status(400).json({ 
    //       message: "Nomor telepon sudah terdaftar" 
    //     });
    //   } else if (error.keyPattern && error.keyPattern.phoneNumber) {
    //     return res.status(400).json({ 
    //       message: "Nomor telepon sudah terdaftar" 
    //     });
    //   }
    // }
    
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}