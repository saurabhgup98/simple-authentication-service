// App Mapping Configuration
export const APP_MAPPING = {
  'https://food-delivery-app-frontend.vercel.app': 'sera-food-customer-app',
  'https://food-delivery-business-app-sera.vercel.app': 'sera-food-business-app',
  'https://todo-frontend-beta-three-78.vercel.app': 'todo-app'
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
