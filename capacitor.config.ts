import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Existing Bilsem Junior app in Quantum Studio App Play Console.
  appId: 'com.quantumtech.bilsemjunior',
  appName: 'Bilsem Junior',
  // HTTP plugin options can contain credentials; never log them, including debug APKs.
  loggingBehavior: 'none',
  webDir: 'dist-android',
  server: { hostname: 'localhost', androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false, backgroundColor: '#f8fafc' },
};
export default config;
