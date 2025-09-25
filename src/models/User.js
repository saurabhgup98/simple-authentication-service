import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic user fields
  username: {
    type: String,
    trim: true,
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // App-specific data
  appRegistered: [{
    appIdentifier: {
      type: String,
      required: true,
      enum: ['sera-food-customer-app', 'sera-food-business-app', 'todo-app']
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'business-user', 'admin', 'superadmin']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    activatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Basic status fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has access to app
userSchema.methods.hasAccessToApp = function(appIdentifier) {
  return this.appRegistered.some(app => app.appIdentifier === appIdentifier);
};

// Get role for specific app
userSchema.methods.getRoleForApp = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  return app ? app.role : null;
};

// Add app registration
userSchema.methods.addAppRegistration = function(appIdentifier, role) {
  const existingApp = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  
  if (existingApp) {
    existingApp.role = role;
    existingApp.isActive = true;
    existingApp.activatedAt = new Date();
  } else {
    this.appRegistered.push({
      appIdentifier,
      role,
      isActive: true,
      activatedAt: new Date()
    });
  }
  
  return this.save();
};

// Public JSON method (remove sensitive data)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    emailVerified: this.emailVerified,
    isActive: this.isActive,
    appRegistered: this.appRegistered.map(app => ({
      appIdentifier: app.appIdentifier,
      role: app.role,
      isActive: app.isActive,
      activatedAt: app.activatedAt
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: 1 });

const User = mongoose.model('User', userSchema);

export default User;