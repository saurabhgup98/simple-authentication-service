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
    roles: [{
      type: String,
      required: true,
      enum: ['user', 'business-user', 'admin', 'superadmin']
    }],
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

// Get roles for specific app
userSchema.methods.getRolesForApp = function(appIdentifier) {
  const app = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  return app ? app.roles : [];
};

// Check if user has specific role for app
userSchema.methods.hasRoleForApp = function(appIdentifier, role) {
  const roles = this.getRolesForApp(appIdentifier);
  return roles.includes(role);
};

// Add app registration
userSchema.methods.addAppRegistration = function(appIdentifier, roles, authMethod = 'email-password', password = null) {
  const existingApp = this.appRegistered.find(app => app.appIdentifier === appIdentifier);
  
  // Ensure roles is an array
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  if (existingApp) {
    // Add new roles to existing app registration
    rolesArray.forEach(role => {
      if (!existingApp.roles.includes(role)) {
        existingApp.roles.push(role);
      }
    });
    existingApp.authMethod = authMethod;
    existingApp.isActive = true;
    if (password && authMethod === 'email-password') {
      existingApp.password = password;
    }
  } else {
    const newApp = {
      appIdentifier,
      roles: rolesArray,
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
