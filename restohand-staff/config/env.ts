// Environment configuration for the app
export const env = {
  apiBaseUrl: __DEV__
    ? 'http://localhost:3000/api' // Development API URL
    : 'http://localhost:3000/api', // Production API URL

  apiUrl: __DEV__
    ? 'http://localhost:3000/api' // Development base URL for SSE
    : 'http://localhost:3000/api', // Production base URL for SSE

  socketUrl: __DEV__
    ? 'http://localhost:3000' // Development socket URL
    : 'http://localhost:3000', // Production socket URL

  isDev: __DEV__,
};
