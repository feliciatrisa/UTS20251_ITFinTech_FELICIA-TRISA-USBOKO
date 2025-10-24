import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "../../../lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // If we reach here, the token is valid (verified by withAuth middleware)
    res.status(200).json({
      user: {
        userId: req.user!.userId,
        phone: req.user!.phone,
        role: req.user!.role
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

export default withAuth(handler);