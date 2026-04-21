import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.nomadnote.travel",
  appName: "NomadNote",
  webDir: "out",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#f9f7f4",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
