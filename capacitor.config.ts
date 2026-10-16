import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Confirm ownership/availability before the first Play Console upload.
  appId: 'com.zekapark.app',
  appName: 'ZekaPark',
  webDir: 'dist-android',
  server: { hostname: 'localhost', androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false, backgroundColor: '#f8fafc' },
};
export default config;
