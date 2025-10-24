import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Checkout from '../../models/Checkout';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    phone: string;
    role: string;
  };
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await dbConnect();
    const { period = 'daily' } = req.query;

    // Get orders with LUNAS status (completed payments)
    const orders = await Checkout.find({ status: 'LUNAS' })
      .sort({ createdAt: 1 })
      .lean();

    let analyticsData;

    if (period === 'daily') {
      // Group by day for the last 30 days
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const dailyRevenue = new Map();
      
      // Initialize last 30 days with 0 revenue
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyRevenue.set(dateKey, 0);
      }

      // Calculate daily revenue from orders
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        if (orderDate >= last30Days) {
          const dateKey = orderDate.toISOString().split('T')[0];
          const currentRevenue = dailyRevenue.get(dateKey) || 0;
          dailyRevenue.set(dateKey, currentRevenue + (order.total || 0));
        }
      });

      analyticsData = Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
        date,
        revenue,
        formattedDate: new Date(date).toLocaleDateString('id-ID', { 
          day: '2-digit', 
          month: 'short' 
        })
      }));

    } else if (period === 'monthly') {
      // Group by month for the last 12 months
      const last12Months = new Date();
      last12Months.setMonth(last12Months.getMonth() - 12);

      const monthlyRevenue = new Map();
      
      // Initialize last 12 months with 0 revenue
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue.set(monthKey, 0);
      }

      // Calculate monthly revenue from orders
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        if (orderDate >= last12Months) {
          const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          const currentRevenue = monthlyRevenue.get(monthKey) || 0;
          monthlyRevenue.set(monthKey, currentRevenue + (order.total || 0));
        }
      });

      analyticsData = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
        month,
        revenue,
        formattedMonth: new Date(month + '-01').toLocaleDateString('id-ID', { 
          month: 'short', 
          year: 'numeric' 
        })
      }));
    }

    // Calculate summary statistics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.status(200).json({
      ok: true,
      data: analyticsData,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        period
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}