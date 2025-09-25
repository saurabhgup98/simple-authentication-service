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
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  // App Registration with identifiers and per-app status
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
    authMethod: {
      type: String,
      required: true,
      enum: ['email-password', 'google-oauth', 'facebook-oauth', 'github-oauth']
    },
    password: {
      type: String,
      required: function() {
        return this.authMethod === 'email-password';
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    activatedAt: {
      type: Date,
      default: Date.now
    },
    deactivatedAt: {
      type: Date,
      default: null
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deactivationReason: {
      type: String,
      default: null
    },
    // App-specific login attempts
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
  
  // Global Security Fields (for overall account status)
  globalLoginAttempts: {
    type: Number,
    default: 0
  },
  globalAccountLockedUntil: {
    type: Date,
    default: null
  },
  lastGlobalLoginAt: {
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

// Indexes for performance (email, googleId, facebookId, githubId indexes are already created by unique: true)
userSchema.index({ createdAt: 1 });

// Pre-save middleware to hash app-specific passwords
userSchema.pre('save', async function(next) {
  try {
    // Hash passwords for app registrations that use email-password auth method
    for (let app of this.appRegistered) {
      if (app.authMethod === 'email-password' && app.password && typeof app.password === 'string' && !app.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
        app.password = await bcrypt.hash(app.password, salt);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});



// Instance method to check if global account is locked
userSchema.methods.isGlobalAccountLocked = function() {
  if (!this.globalAccountLockedUntil) {
    return false;
  }
  return Date.now() < this.globalAccountLockedUntil.getTime();
};

// Instance method to increment global login attempts
userSchema.methods.incrementGlobalLoginAttempts = function() {
  this.globalLoginAttempts += 1;
  
  // Lock global account after max attempts
  if (this.globalLoginAttempts >= parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5) {
    const lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 900000; // 15 minutes
    this.globalAccountLockedUntil = new Date(Date.now() + lockoutDuration);
  }
  
  return this.save();
};

// Instance method to reset global login attempts
userSchema.methods.resetGlobalLoginAttempts = function() {
  this.globalLoginAttempts = 0;
  this.globalAccountLockedUntil = null;
  this.lastGlobalLoginAt = new Date();
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
userSchema.methods.addAppRegistration = function(appIdentifier, role, authMethod, password = null) {
  // Check if app already exists
  const existingApp = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (existingApp) {
    // Update existing app registration
    existingApp.role = role;
    existingApp.authMethod = authMethod;
    existingApp.isActive = true;
    existingApp.activatedAt = new Date();
    existingApp.deactivatedAt = null;
    existingApp.deactivatedBy = null;
    existingApp.deactivationReason = null;
    existingApp.loginAttempts = 0;
    existingApp.accountLockedUntil = null;
    
    // Update password if provided and auth method is email-password
    if (authMethod === 'email-password' && password) {
      existingApp.password = password;
    } else if (authMethod !== 'email-password') {
      existingApp.password = null;
    }
  } else {
    // Add new app registration
    const newAppRegistration = { 
      appIdentifier, 
      role,
      authMethod,
      isActive: true,
      activatedAt: new Date(),
      loginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: null
    };
    
    // Add password if auth method is email-password
    if (authMethod === 'email-password' && password) {
      newAppRegistration.password = password;
    }
    
    this.appRegistered.push(newAppRegistration);
  }
  return this.save();
};

// Method to get role for specific app
userSchema.methods.getRoleForApp = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  return app ? app.role : null;
};

// Method to get auth method for specific app
userSchema.methods.getAuthMethodForApp = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  return app ? app.authMethod : null;
};

// Method to validate authentication method for app
userSchema.methods.validateAuthMethodForApp = function(appIdentifier, authMethod) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (!app) {
    return { success: false, error: 'No access to this app' };
  }
  
  if (app.authMethod !== authMethod) {
    return { 
      success: false, 
      error: `Must use ${app.authMethod} to access this app` 
    };
  }
  
  return { success: true };
};

// Method to compare password for specific app
userSchema.methods.comparePasswordForApp = async function(appIdentifier, candidatePassword) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (!app || !app.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, app.password);
};

// Method to check if app account is locked
userSchema.methods.isAppAccountLocked = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (!app || !app.accountLockedUntil) {
    return false;
  }
  return Date.now() < app.accountLockedUntil.getTime();
};

// Method to increment login attempts for specific app
userSchema.methods.incrementAppLoginAttempts = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (app) {
    app.loginAttempts += 1;
    
    // Lock app account after max attempts
    if (app.loginAttempts >= parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5) {
      const lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 900000; // 15 minutes
      app.accountLockedUntil = new Date(Date.now() + lockoutDuration);
    }
  }
  return this.save();
};

// Method to reset login attempts for specific app
userSchema.methods.resetAppLoginAttempts = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (app) {
    app.loginAttempts = 0;
    app.accountLockedUntil = null;
    app.lastLoginAt = new Date();
  }
  return this.save();
};

// Method to check if user has access to app
userSchema.methods.hasAccessToApp = function(appIdentifier) {
  return this.appRegistered.some(app => app.appIdentifier === appIdentifier);
};

// Method to check if user has active access to app
userSchema.methods.hasActiveAccessToApp = function(appIdentifier) {
  return this.appRegistered.some(app => 
    app.appIdentifier === appIdentifier && app.isActive
  );
};

// Method to deactivate user from specific app
userSchema.methods.deactivateFromApp = function(appIdentifier, deactivatedBy, reason) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (app) {
    app.isActive = false;
    app.deactivatedAt = new Date();
    app.deactivatedBy = deactivatedBy;
    app.deactivationReason = reason;
  }
  return this.save();
};

// Method to reactivate user in specific app
userSchema.methods.reactivateInApp = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (app) {
    app.isActive = true;
    app.activatedAt = new Date();
    app.deactivatedAt = null;
    app.deactivatedBy = null;
    app.deactivationReason = null;
  }
  return this.save();
};

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.globalLoginAttempts;
  delete userObject.globalAccountLockedUntil;
  
  // Remove sensitive fields from app registrations
  if (userObject.appRegistered) {
    userObject.appRegistered = userObject.appRegistered.map(app => {
      const cleanApp = { ...app };
      delete cleanApp.password;
      delete cleanApp.loginAttempts;
      delete cleanApp.accountLockedUntil;
      return cleanApp;
    });
  }
  
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;
