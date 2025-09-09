import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Core Identity Fields
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
    required: function() {
      // Password required only if no OAuth provider is used
      return !this.googleId && !this.facebookId && !this.githubId;
    },
    minlength: [8, 'Password must be at least 8 characters long']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  // App Registration
  appRegistered: [{
    name: {
      type: String,
      required: true,
      enum: [
        'https://food-delivery-app-frontend.vercel.app',
        'https://food-delivery-business-app-sera.vercel.app'
      ]
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'business-user', 'admin', 'superadmin']
    }
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // OAuth Provider IDs
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook', 'github', 'local'],
    default: 'local'
  },
  
  // Security Fields
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  
  // Verification Tokens
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  
  // OAuth Profile Data
  oauthData: {
    picture: String,
    oauthEmail: String,
    oauthName: String,
    oauthVerified: Boolean
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ facebookId: 1 });
userSchema.index({ githubId: 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified and not from OAuth
  if (!this.isModified('password') || this.oauthProvider !== 'local') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update passwordChangedAt
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000; // 1 second before save
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.accountLockedUntil) {
    return false;
  }
  return Date.now() < this.accountLockedUntil.getTime();
};

// Instance method to increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  
  // Lock account after max attempts
  if (this.loginAttempts >= parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5) {
    const lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 900000; // 15 minutes
    this.accountLockedUntil = new Date(Date.now() + lockoutDuration);
  }
  
  return this.save();
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.accountLockedUntil = null;
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find by email or OAuth ID
userSchema.statics.findByEmailOrOAuthId = function(email, oauthId, provider) {
  const query = {};
  
  if (email) {
    query.email = email.toLowerCase();
  }
  
  if (oauthId && provider) {
    query[`${provider}Id`] = oauthId;
  }
  
  return this.findOne({ $or: [query] });
};

// Method to add app registration
userSchema.methods.addAppRegistration = function(appName, role) {
  // Check if app already exists
  const existingApp = this.appRegistered.find(app => app.name === appName);
  if (existingApp) {
    // Update existing app role
    existingApp.role = role;
  } else {
    // Add new app registration
    this.appRegistered.push({ name: appName, role });
  }
  return this.save();
};

// Method to get role for specific app
userSchema.methods.getRoleForApp = function(appName) {
  const app = this.appRegistered.find(app => app.name === appName);
  return app ? app.role : null;
};

// Method to check if user has access to app
userSchema.methods.hasAccessToApp = function(appName) {
  return this.appRegistered.some(app => app.name === appName);
};

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.loginAttempts;
  delete userObject.accountLockedUntil;
  
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;
