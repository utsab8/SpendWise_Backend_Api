import mongoose from "mongoose";

const categoryBudgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  budgetAmount: {
    type: Number,
    default: 0,
  },
  spentAmount: {
    type: Number,
    default: 0,
  },
});

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalBudget: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    categoryBudgets: [categoryBudgetSchema],
    month: {
      type: String,
      default: () => new Date().toISOString().slice(0, 7), // YYYY-MM
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for budget left
budgetSchema.virtual("budgetLeft").get(function () {
  return this.totalBudget - this.totalSpent;
});

// Virtual field for budget used percentage
budgetSchema.virtual("budgetUsedPercentage").get(function () {
  if (this.totalBudget === 0) return 0;
  return Math.round((this.totalSpent / this.totalBudget) * 100);
});

// Ensure virtuals are included in JSON
budgetSchema.set("toJSON", { virtuals: true });
budgetSchema.set("toObject", { virtuals: true });

export default mongoose.model("Budget", budgetSchema);