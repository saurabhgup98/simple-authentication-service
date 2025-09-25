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
  password: {
    type: String,
    required: true
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
    isActive: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
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
  } else {
    this.appRegistered.push({
      appIdentifier,
      role,
      isActive: true
    });
  }
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
