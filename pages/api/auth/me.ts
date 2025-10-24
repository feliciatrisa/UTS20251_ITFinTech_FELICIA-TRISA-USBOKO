import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "../../../lib/auth";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const user = await User.findById(req.user!.userId).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

export default withAuth(handler);