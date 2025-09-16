// Validate registration data
export const validateRegistration = (username, email, password, role) => {
  if (!username || !email || !password) {
    return { valid: false, message: 'Username, email, and password are required' };
  }
  
  const validRoles = ['user', 'business-user', 'admin', 'superadmin'];
  if (role && !validRoles.includes(role)) {
    return { valid: false, message: 'Invalid role. Must be one of: user, business-user, admin, superadmin' };
  }
  
  return { valid: true };
};

// Validate login data
export const validateLogin = (email, password) => {
  if (!email || !password) {
    return { valid: false, message: 'Email and password are required' };
  }
  
  return { valid: true };
};
