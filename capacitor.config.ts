import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Confirm ownership/availability before the first Play Console upload.
  appId: 'com.zekapark.app',
  appName: 'ZekaPark',
  // HTTP plugin options can contain credentials; never log them, including debug APKs.
  loggingBehavior: 'none',
  webDir: 'dist-android',
  server: { hostname: 'localhost', androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false, backgroundColor: '#f8fafc' },
};
export default config;
