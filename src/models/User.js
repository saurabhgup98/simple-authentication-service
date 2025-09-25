import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  appRegistered: [{
    appIdentifier: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    authMethod: {
      type: String,
      required: true,
      enum: ['email-password', 'google-oauth'],
      default: 'email-password'
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
    }
  }]
}, {
  timestamps: true
});

// Hash app-specific passwords before saving
userSchema.pre('save', async function(next) {
  try {
    // Hash passwords for app registrations that use email-password auth method
    for (let app of this.appRegistered) {
      if (app.authMethod === 'email-password' && app.password && typeof app.password === 'string' && !app.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(10);
        app.password = await bcrypt.hash(app.password, salt);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password for specific app
userSchema.methods.comparePasswordForApp = async function(appIdentifier, candidatePassword) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  if (!app || app.authMethod !== 'email-password' || !app.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, app.password);
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
userSchema.methods.addAppRegistration = function(appIdentifier, role, authMethod = 'email-password', password = null) {
  const existingApp = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  
  if (existingApp) {
    existingApp.role = role;
    existingApp.authMethod = authMethod;
    existingApp.isActive = true;
    if (password && authMethod === 'email-password') {
      existingApp.password = password;
    }
  } else {
    const newApp = {
      appIdentifier,
      role,
      authMethod,
      isActive: true
    };
    
    if (password && authMethod === 'email-password') {
      newApp.password = password;
    }
    
    this.appRegistered.push(newApp);
  }
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
