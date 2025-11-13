import mongoose from "mongoose";

const categoryBudgetSchema = new mongoose.Schema({
  category: { type: String, required: true },
  budgetAmount: { type: Number, required: true, default: 0 },
  spentAmount: { type: Number, required: true, default: 0 },
});

const budgetSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true 
  },
  totalBudget: { type: Number, required: true, default: 0 },
  totalSpent: { type: Number, required: true, default: 0 },
  categoryBudgets: [categoryBudgetSchema],
  month: { type: String, default: () => new Date().toISOString().slice(0, 7) }, // YYYY-MM
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Budget", budgetSchema);