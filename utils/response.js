// Format user data for response (remove sensitive fields)
export const formatUserData = (user) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role
  };
};

// Success response
export const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

// Error response
export const errorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }
  
  return res.status(statusCode).json(response);
};
