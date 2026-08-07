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
import * as React from "react";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

const MapContext = React.createContext();

const mapReducer = (state, action) => {
  switch (action.type) {
    case "setMapView": {
      const { view } = action.payload;
      return {
        ...state,
        mapView: view,
        loaded: true,
      };
    }
    case "setMapLayers": {
      // Set only the layers, do not touch view
      const { layers } = action.payload;
      return {
        ...state,
        mapLayers: layers,
      };
    }
    case "setReady": {
      return { ...state, ready: action.payload };
    }
    case "openPopup": {
      // Fix: Accept both array and object payloads, and always open popup if payload is present
      if (action.payload && (Array.isArray(action.payload) ? action.payload.length > 0 : true)) {
        return { ...state, popup: { isOpen: true, content: action.payload } };
      } else {
        return { ...state, popup: { isOpen: false, content: null } };
      }
    }
    case "closePopup": {
      return { ...state, popup: { isOpen: false, content: null } };
    }
    case "loadError": {
      return {
        ...state,
        loadError: {
          status: true,
          title: action.payload.title,
          content: action.payload.content,
          action: action.payload.action,
        },
      };
    }
    case "setElevLayer": {
      // Add or update elevationLayer in state
      return {
        ...state,
        elevationLayer: action.payload.elevationLayer,
      };
    }
    case "setPopupEnabled": {
      return {
        ...state,
        popupEnabled: action.payload.popupEnabled
      };
    }
    case "setSceneLayerViews": {
      // Add scene layer views to state
      return {
        ...state,
        sceneLayerViews: action.payload.sceneLayerViews,
      };
    }
    case "setActiveSceneLayerTitle": {
      return {
        ...state,
        activeSceneLayerTitle: action.payload.activeSceneLayerTitle,
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
};

export const MapContextProvider = ({ children }) => {
  const { LayersConfig } = window.ObstacleAnalysis;

  const [state, dispatch] = React.useReducer(mapReducer, {
    map: null,
    mapView: null,
    mapLayers: [],
    loaded: false, //map loaded
    ready: false, //layerviews ready
    popup: { isOpen: false, content: null },
    popupEnabled: false,
    loadError: { status: false, title: null, content: null },
    elevationLayer: null, // <-- add this to initial state
    sceneLayerViews: [], // Add scene layer views to initial state
    activeSceneLayerTitle: ""
  });

  const getLayer = (title) => {
    if (!state.loaded) {
      return null;
    }

    const layer = state.mapLayers.find((l) => l.title === title);
    if (layer?.type === "group") {
      return layer.layers.items;
    }

    return layer;
  };

  //* RF: extract to something like "GetLayerByTitle"
  const getLayerView = (title) => {
    if (!state.ready) {
      return null;
    }

    const layerView = state.mapView.layerViews.items.find(
      (lv) => lv.layer.title === title,
    );

    if (layerView?.type === "group") {
      return layerView.layerViews.items;
    }
    return layerView;
  };

  const value = { state, dispatch, getLayer, getLayerView };
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = () => {
  const context = React.useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMapContext must be used within a MapContextProvider");
  }
  return context;
};
