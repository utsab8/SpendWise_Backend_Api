import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // Changed from 'name'
  email: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  password: { type: String, required: true },
});

export default mongoose.model("User", userSchema);