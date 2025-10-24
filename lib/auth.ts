import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import User from '../models/User';
import { dbConnect } from './mongodb';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string;
    phone: string;
    role: 'user' | 'admin';
  };
}

export interface JWTPayload {
  userId: string;
  phone: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

// Middleware to verify JWT token
export function authenticateToken(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token akses diperlukan' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JWTPayload;

    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid' });
  }
}

// Middleware to check if user is admin
export function requireAdmin(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Autentikasi diperlukan' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses admin diperlukan' });
  }

  next();
}

// Middleware to check if user is verified
export async function requireVerifiedUser(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Autentikasi diperlukan' });
  }

  try {
    await dbConnect();
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({ message: 'Akun belum terverifikasi' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

// Higher-order function to combine middlewares
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  options: {
    requireAdmin?: boolean;
    requireVerified?: boolean;
  } = {}
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Apply authentication middleware
      await new Promise<void>((resolve, reject) => {
        authenticateToken(req, res, () => resolve());
      });

      // Apply admin check if required
      if (options.requireAdmin) {
        await new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, () => resolve());
        });
      }

      // Apply verification check if required
      if (options.requireVerified) {
        await new Promise<void>((resolve, reject) => {
          requireVerifiedUser(req, res, () => resolve());
        });
      }

      // Call the actual handler
      await handler(req, res);
    } catch (error) {
      // Error handling is done in individual middleware functions
    }
  };
}

// Utility function to verify token on client side
export function verifyClientToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JWTPayload;
  } catch (error) {
    return null;
  }
}