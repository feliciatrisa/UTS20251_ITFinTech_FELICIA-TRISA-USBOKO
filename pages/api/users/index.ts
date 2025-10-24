import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import User from "../../../models/User";
import { withAuth, AuthenticatedRequest } from "../../../lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse): Promise<void> {
  await dbConnect();

  if (req.method === "GET") {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          ok: false, 
          error: 'Access denied. Admin privileges required.' 
        });
      }

      // Get all users (excluding password and otp fields)
      const users = await User.find({})
        .select('-password -otp')
        .sort({ createdAt: -1 })
        .lean();

      // Get user statistics
      const totalUsers = users.length;
      const adminUsers = users.filter(user => user.role === 'admin').length;
      const regularUsers = users.filter(user => user.role === 'user').length;
      const verifiedUsers = users.filter(user => user.isVerified).length;

      res.status(200).json({
        ok: true,
        users,
        stats: {
          totalUsers,
          adminUsers,
          regularUsers,
          verifiedUsers
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to fetch users' 
      });
    }
  } else {
    res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed' 
    });
  }
}

export default withAuth(handler, { requireAdmin: true });