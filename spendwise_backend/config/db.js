import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // ✅ Get MongoDB URI - check both MONGO_URI and MONGODB_URI
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Debug logging
    console.log("🔍 Environment check:");
    console.log("  - NODE_ENV:", process.env.NODE_ENV);
    console.log("  - MONGO_URI exists:", !!process.env.MONGO_URI);
    console.log("  - MONGODB_URI exists:", !!process.env.MONGODB_URI);
    console.log("  - Selected URI exists:", !!mongoUri);
    
    if (!mongoUri) {
      console.error("❌ CRITICAL ERROR: No MongoDB URI found!");
      console.error("📋 Available MONGO-related env vars:", 
        Object.keys(process.env).filter(k => k.includes('MONGO'))
      );
      console.error("\n💡 Solutions:");
      console.error("  1. In Render Dashboard, go to Environment tab");
      console.error("  2. Add variable: MONGO_URI");
      console.error("  3. Value: mongodb+srv://username:password@cluster.mongodb.net/database");
      process.exit(1);
    }

    // Ensure it's a clean string (trim whitespace)
    mongoUri = mongoUri.trim();
    
    // Validate it's actually a string and not empty
    if (typeof mongoUri !== 'string' || mongoUri.length === 0) {
      console.error("❌ ERROR: MongoDB URI is not a valid string");
      console.error("Type:", typeof mongoUri);
      console.error("Length:", mongoUri ? mongoUri.length : 0);
      process.exit(1);
    }

    // Hide password in logs (for security)
    const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 URI:", safeUri);

    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully!");
    console.log("📊 Database:", mongoose.connection.name);
    console.log("🔗 Host:", mongoose.connection.host);

  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error:", error.message);
    
    // Provide helpful debugging info based on error type
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.error("\n💡 Authentication Error - Check:");
      console.error("  1. Username and password are correct in MongoDB Atlas");
      console.error("  2. User has 'readWrite' permissions for the database");
      console.error("  3. Password doesn't contain unencoded special characters");
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error("\n💡 Network Error - Check:");
      console.error("  1. MongoDB cluster URL is correct");
      console.error("  2. Cluster is running (not paused)");
      console.error("  3. Internet connection is working");
    } else if (error.message.includes('IP') || error.message.includes('not in whitelist')) {
      console.error("\n💡 IP Whitelist Error - Check:");
      console.error("  1. In MongoDB Atlas > Network Access");
      console.error("  2. Add 0.0.0.0/0 to allow all IPs (or Render's specific IPs)");
    } else if (error.message.includes('openUri') || error.message.includes('must be a string')) {
      console.error("\n💡 Connection String Error - Check:");
      console.error("  1. MONGO_URI or MONGODB_URI is set in Render Environment");
      console.error("  2. The value is a complete MongoDB connection string");
      console.error("  3. Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname");
    }
    
    console.error("\n💀 Exiting due to database connection failure");
    process.exit(1);
  }

  // Handle connection events for runtime issues
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected - attempting to reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
  });
};

export default connectDB;