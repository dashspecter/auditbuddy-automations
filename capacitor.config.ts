import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a7fa09ff49024562b01e0d07dee1e39e',
  appName: 'Dashspect',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#F97316",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFFFFF",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "light",
      overlaysWebView: false,
    },
    Camera: {
      presentationStyle: "fullscreen",
      saveToGallery: true,
    }
  }
};

export default config;
