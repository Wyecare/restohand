// Environment configuration for the app
export const env = {
  apiBaseUrl: __DEV__
    ? 'https://api.restohand.com/api' // Development API URL
    : 'https://api.restohand.com/api', // Production API URL

  apiUrl: __DEV__
    ? 'https://api.restohand.com/api' // Development base URL for SSE
    : 'https://api.restohand.com/api', // Production base URL for SSE

  socketUrl: __DEV__
    ? 'https://api.restohand.com' // Development socket URL
    : 'https://api.restohand.com', // Production socket URL

  isDev: __DEV__,
};
