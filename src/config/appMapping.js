// App Mapping Configuration
export const APP_MAPPING = {
  // Production URLs (Vercel deployments)
  'https://food-delivery-sera.vercel.app': 'sera-food-customer-app',
  'https://food-delivery-business-app-sera.vercel.app': 'sera-food-business-app',
  'https://todo-frontend-beta-three-78.vercel.app': 'todo-app',
  
  // Local development URLs
  'http://localhost:3000': 'todo-app',                    // Todo App
  'http://localhost:3001': 'sera-food-customer-app',     // Customer App
  'http://localhost:3002': 'sera-food-business-app',     // Business App
  
  // Network development URLs (for mobile testing)
  'http://192.168.1.4:3000': 'todo-app',                 // Todo App
  'http://192.168.1.4:3001': 'sera-food-customer-app',  // Customer App
  'http://192.168.1.4:3002': 'sera-food-business-app',  // Business App
  
  // Alternative localhost formats
  'http://127.0.0.1:3000': 'todo-app',
  'http://127.0.0.1:3001': 'sera-food-customer-app',
  'http://127.0.0.1:3002': 'sera-food-business-app'
};

// Get app identifier from endpoint
export const getAppIdentifier = (appEndpoint) => {
  return APP_MAPPING[appEndpoint] || null;
};

// Validate if app endpoint is supported
export const isValidAppEndpoint = (appEndpoint) => {
  return appEndpoint in APP_MAPPING;
};

// Get all supported app endpoints
export const getSupportedApps = () => {
  return Object.keys(APP_MAPPING);
};

// Simple role validation - just check if role is valid
export const isValidRole = (role) => {
  const validRoles = ['user', 'business-user', 'admin', 'superadmin'];
  return validRoles.includes(role);
};
