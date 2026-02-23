// Environment configuration for the app
export const env = {
  apiBaseUrl: __DEV__
    ? 'https://proinvestment-pamella-stridulously.ngrok-free.dev/api' // Development API URL
    : 'https://proinvestment-pamella-stridulously.ngrok-free.dev/api', // Production API URL

  apiUrl: __DEV__
    ? 'https://proinvestment-pamella-stridulously.ngrok-free.dev/api' // Development base URL for SSE
    : 'https://proinvestment-pamella-stridulously.ngrok-free.dev/api', // Production base URL for SSE

  socketUrl: __DEV__
    ? 'https://proinvestment-pamella-stridulously.ngrok-free.dev' // Development socket URL
    : 'https://proinvestment-pamella-stridulously.ngrok-free.dev', // Production socket URL

  isDev: __DEV__,
};
