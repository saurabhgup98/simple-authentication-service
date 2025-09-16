import User from '../models/User.js';

// Create new user
export const createUser = async (userData) => {
  const { username, email, password, role } = userData;
  
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    role: role || 'user'
  });
  
  return user;
};

// Find user by email
export const findUserByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase() });
};

// Check if user exists (by email or username)
export const userExists = async (email, username) => {
  return await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }]
  });
};
