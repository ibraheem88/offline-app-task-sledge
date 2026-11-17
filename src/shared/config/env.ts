// Expo inlines EXPO_PUBLIC_* variables at build time, so this must be a direct property access.
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';

export const env = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
};
