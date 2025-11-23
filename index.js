import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// ✅ Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ DETAILED REQUEST LOGGING
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(60));
  console.log(`📥 INCOMING REQUEST`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`Body:`, JSON.stringify(req.body));
  console.log('='.repeat(60));
  next();
});

// ✅ INLINE ROUTES FOR TESTING (bypass import issues)
const authRouter = express.Router();

// Test route
authRouter.get('/forgot-password/test', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({
    success: true,
    message: 'Forgot password routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Send OTP route
authRouter.post('/forgot-password/send-otp', async (req, res) => {
  console.log('🔥 Send OTP endpoint hit!');
  console.log('Body:', req.body);
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  // Generate OTP (for testing - no database)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  console.log(`Generated OTP: ${otpCode}`);
  
  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    otp: otpCode // For testing only
  });
});

// Register route
authRouter.post('/register', (req, res) => {
  console.log('📝 Register endpoint hit!');
  res.json({
    success: true,
    message: 'Register route working'
  });
});

// Login route
authRouter.post('/login', (req, res) => {
  console.log('🔐 Login endpoint hit!');
  res.json({
    success: true,
    message: 'Login route working'
  });
});

// ✅ DIRECT ROUTES (NO ROUTER) - ABSOLUTE PATHS
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  console.log('🔥🔥🔥 DIRECT ROUTE HIT - Send OTP!');
  console.log('Body:', req.body);
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`Generated OTP: ${otpCode} for ${email}`);
  
  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    otp: otpCode,
    email: email
  });
});

app.get('/api/auth/forgot-password/test', (req, res) => {
  console.log('✅✅✅ DIRECT TEST ROUTE HIT!');
  res.json({
    success: true,
    message: 'Direct forgot password test route working!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/register', (req, res) => {
  console.log('📝 Direct register endpoint hit!');
  res.json({
    success: true,
    message: 'Direct register route working',
    body: req.body
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Direct login endpoint hit!');
  res.json({
    success: true,
    message: 'Direct login route working',
    body: req.body
  });
});

// ✅ ALSO MOUNT THE ROUTER (as backup)
app.use('/api/auth', authRouter);

// Health check
app.get('/', (req, res) => {
  console.log('❤️ Health check called');
  res.json({
    success: true,
    message: 'SpendWise API is running - DIAGNOSTIC MODE',
    version: '1.5.1-diagnostic-direct-routes',
    timestamp: new Date().toISOString(),
    note: 'Using direct route mounting for debugging',
    routes: {
      health: 'GET /',
      test: 'GET /api/auth/forgot-password/test',
      sendOtp: 'POST /api/auth/forgot-password/send-otp',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'API test successful!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log('\n❌ 404 ERROR');
  console.log(`Route not found: ${req.method} ${req.path}`);
  console.log(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requested: {
      method: req.method,
      path: req.path,
      fullUrl: req.originalUrl
    },
    availableRoutes: {
      health: 'GET /',
      test: 'GET /api/test',
      authTest: 'GET /api/auth/forgot-password/test',
      sendOtp: 'POST /api/auth/forgot-password/send-otp',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('\n❌ ERROR HANDLER');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Base URL: http://localhost:${PORT}`);
  console.log('\n📋 Available Routes:');
  console.log('   GET  /');
  console.log('   GET  /api/test');
  console.log('   GET  /api/auth/forgot-password/test');
  console.log('   POST /api/auth/forgot-password/send-otp');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('='.repeat(60) + '\n');
});