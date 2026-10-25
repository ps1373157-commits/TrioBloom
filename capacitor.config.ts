import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.triobloom.friendship',
  appName: 'TrioBloom',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#FFF8F5',
      style: 'DARK'
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
      resizeOnFullScreen: true
    }
  }
};

export default config;
