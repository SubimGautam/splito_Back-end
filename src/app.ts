import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import dashboardRoutes from "./routes/dashboard.route";
import expenseRoutes from "./routes/expense.route";
import groupRoutes from "./routes/group.route";
import settlementRoutes from './routes/settlement.route';
import adminRoutes from './routes/admin.route';

dotenv.config();
const app = express();

// ✅ FIX 1: Updated CORS to allow your phone's IP
app.use(cors({
  origin: ["http://localhost:3000", "http://192.168.1.115:3000"], // Add your phone's network
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Test route (before MongoDB connection)
app.get('/api/test-direct', (req, res) => {
  res.json({ message: 'Direct test route works!' });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Routes
console.log('🔄 Loading routes...');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Routes loaded');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
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

// ✅ FIX 2: Listen on all network interfaces
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}/api/test`);
  console.log(`🌐 Network: http://192.168.1.115:${PORT}/api/health`);
  console.log(`💊 Health: http://localhost:${PORT}/api/health`);
});