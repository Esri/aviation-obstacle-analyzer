/*
 * Copyright 2026 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import esriRequest from "@arcgis/core/request";
import esriConfig from "@arcgis/core/config";
import App from "./components/App";
import { MapContextProvider, AppContextProvider } from "./contexts";
// JSON & Styles
import "./styles/index.css";
import "@esri/calcite-components/dist/calcite/calcite.css";
// Import ArcGIS core modules for OAuth authentication
import esriId from "@arcgis/core/identity/IdentityManager";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";

const fetchConfig = async () => {
  try {
    // Fetch runtime configurations and add to the global "Pin2Flood" namespace

    // Determine config file from Vite env
    const configFile = import.meta.env.VITE_CONFIG_FILE || "AppConfig.json";
    const { data } = await esriRequest(`config/${configFile}`);

    window.ObstacleAnalysis = data;

    // Set app theming from AppConfig
    const selectedBrandColor =
      window.ObstacleAnalysis.themingUserConfig.colorPalette.brandColor;
    const passColor =
      window.ObstacleAnalysis.themingUserConfig.colorPalette.passIndicator;
    const failColor =
      window.ObstacleAnalysis.themingUserConfig.colorPalette.failIndicator;
    const textColor = window.ObstacleAnalysis.themingUserConfig.font.fontColor;
    const fontFamily = `"${window.ObstacleAnalysis.themingUserConfig.font.fontFamily
      }", system-ui, "Avenir", Helvetica, Arial, sans-serif`;

    document.documentElement.style.setProperty(
      "--calcite-color-brand",
      selectedBrandColor,
    );
    document.documentElement.style.setProperty(
      "--pass-indicator-color",
      passColor,
    );
    document.documentElement.style.setProperty(
      "--fail-indicator-color",
      failColor,
    );
    document.documentElement.style.setProperty("--text-color", textColor);
    document.documentElement.style.setProperty("--app-font-family", fontFamily);

    // Set Portal URL for the JSAPI
    if (window.ObstacleAnalysis.PORTAL_URL) {
      esriConfig.portalUrl = window.ObstacleAnalysis.PORTAL_URL;
    }
    if (window.ObstacleAnalysis.APP_ID) {
      esriConfig.appId = window.ObstacleAnalysis.APP_ID;
    }

    const oAuthInfo = new OAuthInfo({
      appId: esriConfig.appId,
      portalUrl: esriConfig.portalUrl,
      popupCallbackUrl: "oauth-callback.html",
      popup: false,
    });

    esriId.registerOAuthInfos([oAuthInfo]);
    // esriId.getCredential(esriConfig.portalUrl, {
    //   oAuthPopupConfirmation: false,
    // });
    esriConfig.request.useIdentity = true;
    return;
  } catch (error) {
    console.error(
      "Error loading runtime configurations from config/AppConfig.json:",
      error,
    );
  }
};

const init = async () => {
  await fetchConfig();
  createRoot(document.getElementById("root")).render(
    <AppContextProvider>
      <MapContextProvider>
        <App />
      </MapContextProvider>
    </AppContextProvider>,
  );
};

init();
