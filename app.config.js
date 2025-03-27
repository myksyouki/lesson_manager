export default {
  expo: {
    // ... existing config ...
    extra: {
      // ... existing extra config ...
      difyApiEndpoint: process.env.EXPO_PUBLIC_DIFY_API_ENDPOINT,
      difyServiceToken: process.env.EXPO_PUBLIC_DIFY_API_SERVICE_TOKEN,
    },
  },
}; 