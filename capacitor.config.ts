import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.encore.concerttracker',
  appName: 'Encore',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f1117',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f1117',
    },
  },
};

export default config;
