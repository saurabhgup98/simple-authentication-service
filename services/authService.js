import { findUserByEmail } from './userService.js';

// Authenticate user login
export const authenticateUser = async (email, password) => {
  const user = await findUserByEmail(email);
  
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  return { success: true, user };
};
