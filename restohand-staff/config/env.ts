// Environment configuration for the app
export const env = {
  apiBaseUrl: __DEV__
    ? 'https://ostracodan-amiya-cropless.ngrok-free.dev/api' // Development API URL
    : 'https://ostracodan-amiya-cropless.ngrok-free.dev/api', // Production API URL

  apiUrl: __DEV__
    ? 'https://ostracodan-amiya-cropless.ngrok-free.dev/api' // Development base URL for SSE
    : 'https://ostracodan-amiya-cropless.ngrok-free.dev/api', // Production base URL for SSE

  socketUrl: __DEV__
    ? 'https://ostracodan-amiya-cropless.ngrok-free.dev' // Development socket URL
    : 'https://ostracodan-amiya-cropless.ngrok-free.dev', // Production socket URL

  isDev: __DEV__,
};
