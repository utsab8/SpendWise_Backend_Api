import mongoose from "mongoose";
import dotenv from "dotenv";

// ✅ Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const connectDB = async () => {
  try {
    // ✅ Check for both MONGO_URI and MONGODB_URI (Render uses MONGODB_URI)
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ CRITICAL ERROR: MONGO_URI or MONGODB_URI is not defined!");
      console.error("📋 Available env vars:", Object.keys(process.env).filter(k => 
        k.includes('MONGO') || k.includes('NODE') || k.includes('PORT')
      ));
      console.error("\n💡 Solutions:");
      console.error("  Local: Make sure .env file exists with MONGO_URI");
      console.error("  Render: Add MONGO_URI or MONGODB_URI in Dashboard > Environment");
      process.exit(1);
    }

    // Hide password in logs
    const safeUri = mongoUri.replace(/:[^:]*@/, ':****@');
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 URI:", safeUri);
    console.log("🌍 Environment:", process.env.NODE_ENV || 'development');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
    console.log("📊 Database:", mongoose.connection.name);
    console.log("🔗 Host:", mongoose.connection.host);

  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error:", error.message);
    
    // Provide helpful debugging info
    if (error.message.includes('bad auth')) {
      console.error("\n💡 Authentication failed - Check:");
      console.error("  1. Username and password are correct");
      console.error("  2. User has proper database permissions in MongoDB Atlas");
      console.error("  3. Special characters in password are URL encoded");
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error("\n💡 Network error - Check:");
      console.error("  1. MongoDB cluster URL is correct");
      console.error("  2. Internet connection is working");
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error("\n💡 IP whitelist error - Check:");
      console.error("  1. Your IP is whitelisted in MongoDB Atlas Network Access");
      console.error("  2. Or allow access from anywhere (0.0.0.0/0)");
    }
    
    process.exit(1);
  }

  // Handle connection events
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
};

export default connectDB;