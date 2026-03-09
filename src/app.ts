import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';
import dashboardRoutes from './routes/dashboard.route';
import expenseRoutes from './routes/expense.route';
import groupRoutes from './routes/group.route';
import settlementRoutes from './routes/settlement.route';
import adminRoutes from './routes/admin.route';

// Load environment variables FIRST
dotenv.config();

console.log('='.repeat(50));
console.log('🚀 SERVER STARTUP');
console.log('='.repeat(50));
console.log('📧 Email User:', process.env.EMAIL_USER ? '✅ Loaded' : '❌ Missing');
console.log('📧 Email Pass:', process.env.EMAIL_PASS ? '✅ Loaded' : '❌ Missing');
console.log('📧 Email Pass length:', process.env.EMAIL_PASS?.length || 0);
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('🗄️ MongoDB URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Missing');

const app = express();

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://192.168.1.115:3000"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/splito';

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    email: process.env.EMAIL_USER ? 'configured' : 'not configured'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📧 Email configured for: ${process.env.EMAIL_USER || 'Not set'}`);
  console.log('='.repeat(50));
});