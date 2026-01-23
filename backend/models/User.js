const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * 
 * Represents authenticated users (admin, teacher, and parent roles).
 * 
 * IMPORTANT: Children are NOT User records. They are created as ChildProfile records only.
 * Children don't have passwords, emails, or tokens. The parent logs in, then selects
 * a child from their ChildProfile list. Children are accessed through the parent's
 * authenticated session.
 * 
 * The 'child' role in this schema is kept for backward compatibility but should not
 * be used for new accounts. All child accounts should be ChildProfile records.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: function () {
        return this.role !== 'child'; // Email not required for child role
      },
      unique: true,
      sparse: true, // Allow multiple null values (for children)
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Only validate if email is provided (not null/undefined/empty)
          if (!v || (typeof v === 'string' && v.trim() === '')) {
            return this.role === 'child'; // Allow empty for children
          }
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please provide a valid email',
      },
    },
    password: {
      type: String,
      required: function () {
        return this.role !== 'child'; // Password not required for child role
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'parent', 'child'],
      required: [true, 'Please provide a role'],
      default: 'parent',
    },
    linkedParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.role === 'child';
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Stripe subscription fields (Phase 1)
    stripeCustomerId: {
      type: String,
      select: false,
    },
    stripeSubscriptionId: {
      type: String,
      select: false,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'canceled', 'past_due'],
      default: 'inactive',
    },
    subscriptionStartDate: {
      type: Date,
      // When subscription was first created (for 1-year commitment check)
      index: true,
    },
    subscriptionCurrentPeriodEnd: {
      type: Date,
      // When current billing period ends (for next billing date display)
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { sparse: true }); // Sparse index to allow multiple null emails
userSchema.index({ role: 1 });
userSchema.index({ linkedParent: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Skip password hashing if password is not modified or if it's a child without password
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for child profiles (if user is a parent)
userSchema.virtual('childProfiles', {
  ref: 'ChildProfile',
  localField: '_id',
  foreignField: 'parent',
});

module.exports = mongoose.model('User', userSchema);

