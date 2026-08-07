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
// Framework and third-party non-ui
import { useEffect, useState, useCallback } from "react";

// Import math utilities
import { truncateCoordinate, toMeters, isNumberKey, getUniqueId, isRealValue } from "@/utils/math";

// Hooks, context, and constants
import {
  useMapContext,
  useObstacleContext,
  useAppContext
} from "@/contexts";

// Import the shared utility function
import { 
  addNewObstacleToTableAndFeatureLayer, 
  applyObstacleRenderers 
} from "@/utils/graphicEdits";
import { 
  queryElevationFromPoint, 
  placeObstacleMarker_proposed, 
  addNewObstacle 
} from "@/utils/pointDropOperations";
import { 
  getSpatialReferenceFromElevationLayer 
} from "@/utils/mapLayerUpdates";

// JSON & Styles
import "@esri/calcite-components/dist/calcite/calcite.css";
import ElevationLayer from "@arcgis/core/layers/ElevationLayer.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GroupLayer from "@arcgis/core/layers/GroupLayer.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import SceneLayer from "@arcgis/core/layers/SceneLayer.js";
import * as promiseUtils from "@arcgis/core/core/promiseUtils.js";
import Graphic from "@arcgis/core/Graphic.js";

// ArcGIS Map Components
import "@arcgis/map-components/components/arcgis-scene";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-navigation-toggle";
import "@arcgis/map-components/components/arcgis-compass";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-locate";
import "@arcgis/map-components/components/arcgis-placement";

// Third-party components (buttons, icons, etc.)

const Map = ({ user }) => {
  // State and Constants
  const MapContext = useMapContext();
  const ObstacleContext = useObstacleContext();
  const { usingMeters } = useAppContext();
  const [groundElevation, setGroundElevationState] = useState(null);

  useEffect(() => {
    const AppConfig = window.ObstacleAnalysis;
    const arcgisMap = document.querySelector("arcgis-scene");

    // Wait for the arcgis-scene to be ready
    // arcgisMap.addEventListener("arcgisViewClick", (event) => {  
    //   arcgisMap.hitTest(event.detail).then((response) => {     
    //     const result = response.results[0];
    //     arcgisMap.openPopup({
    //       title: "Create obstacle for analysis arcgisViewClick",
    //     });
    //     });});
    arcgisMap.addEventListener("arcgisViewReadyChange", async () => {
      const mapItem = arcgisMap.map;
      const view = arcgisMap.view;
      view.popup.autoOpenEnabled = false;

      view.when(
        async () => {
          const elevationLayer = new ElevationLayer({
            url: AppConfig.ELEVATION_LAYER_URL,
          });

          await elevationLayer.load();
          // Store in AppConfig for global access
          if (!window.ObstacleAnalysis.ELEVATION_LAYER) {
            window.ObstacleAnalysis.ELEVATION_LAYER = elevationLayer;
          }

          // Get spatial reference from the WEB SCENE instead of elevation layer
          // The web scene always has the correct spatial reference including VCS
          const sceneSpatialRef = mapItem.spatialReference;
          
          // Default to EGM2008 (GP service compatibility) 
          const vcsWkid = sceneSpatialRef.vcsWkid || 105790;
          const latestVcsWkid = sceneSpatialRef.latestVcsWkid || 3855;
          
          const completeSpatialRef = {
            wkid: sceneSpatialRef.wkid,
            latestWkid: sceneSpatialRef.latestWkid || sceneSpatialRef.wkid,
            vcsWkid: vcsWkid,
            latestVcsWkid: latestVcsWkid
          };

          // Store in AppConfig for global access
          if (!window.ObstacleAnalysis.SPATIAL_REFERENCE) {
            window.ObstacleAnalysis.SPATIAL_REFERENCE = completeSpatialRef;
          }

          mapItem.ground.layers.add(elevationLayer);

          MapContext.dispatch({
            type: "setMapView",
            payload: { view },
          });

          // Get references to existing layers in the scene
          const existingLayers = mapItem.allLayers.items;
          
          // Find the original layers from webmap
          const originalObstacleGroupLayer = existingLayers.find(
            (layer) => layer.title === AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS
          );

          const originalUserInputLayer = existingLayers.find(
            (layer) => layer.title === AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS
          );

          // Create app copies of all layers
          let obstacleGroupLayer = null;
          let userInputObstaclePointsLayer = null;

          if (originalObstacleGroupLayer) {
            // Create a new group layer for app use
            obstacleGroupLayer = new GroupLayer({
              title: AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS,
              layers: []
            });

            // Get field definitions from original layers
            const originalObstacleMarkers = originalObstacleGroupLayer.layers?.find(
              (layer) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS
            );
            const originalPillars = originalObstacleGroupLayer.layers?.find(
              (layer) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS
            );
            const originalPillarsPenetrate = originalObstacleGroupLayer.layers?.find(
              (layer) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES
            );
            const originalPillarLabels = originalObstacleGroupLayer.layers?.find(
              (layer) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_LABELS
            );

            // Load all original layers AND elevation layer first to access their properties
            const layerLoadPromises = [
              elevationLayer.load(),
              originalObstacleMarkers?.load(),
              originalPillars?.load(),
              originalPillarsPenetrate?.load(),
              originalPillarLabels?.load(),
              originalUserInputLayer?.load()
            ].filter(Boolean);

            Promise.all(layerLoadPromises).then(() => {
              // Get spatial reference from elevation layer
              const elevSpatialRef = elevationLayer?.spatialReference;
              const spatialRefForLayers = elevSpatialRef ? {
                wkid: elevSpatialRef.wkid,
                latestWkid: elevSpatialRef.latestWkid
              } : { wkid: 3857 }; // Fallback to Web Mercator for standardization

              // Create copies with loaded field definitions
              const featureLayerObstacleMarkers = new FeatureLayer({
                title: AppConfig.LAYER_NAMES.OBSTACLE_MARKERS,
                fields: originalObstacleMarkers?.fields?.items || originalObstacleMarkers?.fields || [],
                objectIdField: originalObstacleMarkers?.objectIdField || "OBJECTID",
                geometryType: "point",
                spatialReference: spatialRefForLayers,
                source: [],
              });

              const featureLayerPillars = new FeatureLayer({
                title: AppConfig.LAYER_NAMES.OBSTACLE_PILLARS,
                fields: originalPillars?.fields?.items || originalPillars?.fields || [],
                objectIdField: originalPillars?.objectIdField || "OBJECTID",
                geometryType: "polyline",
                spatialReference: spatialRefForLayers,
                hasZ: true,
                source: []
              });

              const featureLayerPillarsPenetrate = new FeatureLayer({
                title: AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES,
                fields: originalPillarsPenetrate?.fields?.items || originalPillarsPenetrate?.fields || [],
                objectIdField: originalPillarsPenetrate?.objectIdField || "OBJECTID",
                geometryType: "polyline",
                spatialReference: spatialRefForLayers,
                hasZ: true,
                source: []
              });

              const featureLayerPillarLabels = new FeatureLayer({
                title: AppConfig.LAYER_NAMES.OBSTACLE_LABELS,
                fields: originalPillarLabels?.fields?.items || originalPillarLabels?.fields || [],
                objectIdField: originalPillarLabels?.objectIdField || "OBJECTID",
                geometryType: "point",
                spatialReference: spatialRefForLayers,
                hasZ: true,
                source: [],
                renderer: {
                  type: "simple",
                  symbol: {
                    type: "simple-marker",
                    color: [0, 0, 0, 0],
                    outline: null
                  }
                },
                labelsVisible: true,
                labelingInfo: [{
                  labelPlacement: "above-right",
                  labelExpressionInfo: { value: "{Name}" },
                  symbol: {
                    type: "label-3d",
                    symbolLayers: [{
                      type: "text",
                      material: { color: "black" },
                      halo: { size: 1, color: [255, 255, 255, 0.8] },
                      size: 11
                    }]
                  }
                }]
              });

              if (originalUserInputLayer) {
                const spatialRef = elevationLayer?.spatialReference;
                // Original user input layer found
                userInputObstaclePointsLayer = new FeatureLayer({
                  title: AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS,
                  fields: originalUserInputLayer?.fields || [],
                  objectIdField: originalUserInputLayer?.objectIdField || "objectid",
                  geometryType: "point",
                  spatialReference: {
                    latestWkid: spatialRef?.latestWkid || spatialRef?.wkid || 3857,
                    wkid: spatialRef?.wkid || 3857,
                    vcsWkid: spatialRef?.vcsWkid || 105790,
                    latestVcsWkid: spatialRef?.latestVcsWkid || 3855,
                  },
                  hasZ: true,
                  source: [],
                  visible: false,
                  listMode: "hide",
                });

                // App copy of User Input Obstacle Points layer with correct spatial reference
                mapItem.layers.add(userInputObstaclePointsLayer);

                // Remove original user input layer from map
                mapItem.layers.remove(originalUserInputLayer);
              }

              const graphicsLayerMarker = new GraphicsLayer({
                title: AppConfig.LAYER_NAMES.PENDING_MARKER
              });

              // Add layers to the group
              obstacleGroupLayer.layers.addMany([
                featureLayerObstacleMarkers,
                featureLayerPillars,
                featureLayerPillarsPenetrate,
                featureLayerPillarLabels,
                graphicsLayerMarker
              ]);

              // Apply all renderers
              applyObstacleRenderers(MapContext);

              // Create app copy layers with loaded field definitions
                MapContext.dispatch({
                type: "setMapLayers",
                payload: {
                  layers: [obstacleGroupLayer, userInputObstaclePointsLayer],
                },
              });
            }).catch(err => {
              console.error("Error loading layers:", err);
              // Fallback to creating layers without field definitions
            });

            // Add app copy of obstacle group layer to the map immediately (layers will be added once loaded)
            mapItem.layers.add(obstacleGroupLayer);

            // Remove original obstacle group layer from map
            mapItem.layers.remove(originalObstacleGroupLayer);
          }

          // Print out fields for each layer in group layer
          if (obstacleGroupLayer) {
            obstacleGroupLayer.layers.forEach((layer) => {
              console.log(`Layer: ${layer.title}, Fields:`, layer.fields);
            });
          }

          // Add elevationLayer to context for use in other components
          MapContext.dispatch({
            type: "setElevLayer",
            payload: { elevationLayer },
          });

          // Get scene layer views for existing scene layers
          const sceneLayerConfigs = [];
          existingLayers.forEach((layer) => {
            if (layer.type === "group") {
              const configMatch = AppConfig.arrSceneLayersUserConfig?.find(
                (config) => config.title === layer.title
              );
              if (configMatch) {
                // Assumes single service definition for each layer in group
                const mainLayer = new SceneLayer({
                  url: layer.allLayers.items[0].url, 
                  // Access all original features
                  definitionExpression: "",
                  title: layer.title,
                  visible: false,
                  listMode: "hide",
                });

                // Adds hidden mainLayer to map for SceneLayer validation
                mapItem.layers.add(mainLayer); 

                // Capture webscene visibility defaults
                const visibilityLookup = {};

                // Capture surface types in non-critical layer
                layer.allLayers.items.forEach((sublayer) => {
                  if (sublayer.title === configMatch.subgroupTitle) {
                    sublayer.visible = false;
                    configMatch.subDefinitionExpression = sublayer.definitionExpression;
                  }
                  visibilityLookup[sublayer.title] = sublayer.visible;
                });
                
                configMatch.analysisLayer = mainLayer;
                configMatch.groupLayer = layer;
                configMatch.visibilityLookup = visibilityLookup;
                
                // Add scene layer view
                sceneLayerConfigs.push(configMatch);
              }
            }
          });

          // TODO: may retire sceneview property
          const sceneLayerViewPromises = sceneLayerConfigs.map((objSceneLayer) => {
            return view
              .whenLayerView(objSceneLayer.analysisLayer)
              .then(function (oisMPSceneLayerView) {
                // Scene layer view created for objSceneLayer
                objSceneLayer.sceneView = oisMPSceneLayerView; // Save the SceneLayerView from the SceneLayer
                return objSceneLayer; // Return the config object, not undefined
              })
              .catch(function (error) {
                console.error("Error fetching scene layer view for oisMPSceneLayer:", error);
                return null;
              });
          });

          // Wait for all scene layer views to be created and add them to context
          Promise.all(sceneLayerViewPromises).then((sceneLayerResults) => {
            const validSceneLayerViews = sceneLayerResults.filter(config => config !== null);
            // Valid Scene Layer Views
            MapContext.dispatch({
              type: "setSceneLayerViews",
              payload: { sceneLayerViews: validSceneLayerViews },
            });
            // For now, set the active scene layer to the first valid scene layer
            MapContext.dispatch({
              type: "setActiveSceneLayerTitle",
              payload: {
                activeSceneLayerTitle: validSceneLayerViews[0]?.title || "",
              },
            });
          });

          // Build surface name and type lookups for each scene layer based on their configuration
          async function buildSurfaceLookups(sceneLayerConfig) {
            const layer = sceneLayerConfig.analysisLayer;
            const mapping = {
              friendly: sceneLayerConfig.surfaceFriendlyNameField,
              unfriendly: sceneLayerConfig.surfaceUnfriendlyNameField,
              zoneuse: sceneLayerConfig.surfaceTypeField,
              surfaceState: sceneLayerConfig.surfaceStateField,
            };

            const query = layer.createQuery();
            query.outFields = [
              mapping.friendly,
              mapping.unfriendly,
              mapping.zoneuse,
              mapping.surfaceState,
            ];
            query.returnGeometry = false;

            const result = await layer.queryFeatures(query);
            const nameLookup = {};
            const zoneUseLookup = {};
            const surfaceLookup = {};
            
            // Build zoneuse lookup from domain coded values
            const zoneUseField = layer.fields.find(field => field.name === mapping.zoneuse);
            if (zoneUseField && zoneUseField.domain && zoneUseField.domain.codedValues) {
              zoneUseField.domain.codedValues.forEach(codedValue => {
                zoneUseLookup[codedValue.code] = codedValue.name;
              });
            }
            
            result.features.forEach((feature) => {
              const attrs = feature.attributes;
              nameLookup[attrs[mapping.unfriendly]] = attrs[mapping.friendly];
              
              // Initialize array for each zoneuse if it doesn't already exist
              const zoneuse = attrs[mapping.zoneuse];
              if (!surfaceLookup[zoneuse]) {
                surfaceLookup[zoneuse] = [];
              }
              
              // Normalize runwaystate to use consistent coded values
              let runwayState = attrs[mapping.surfaceState];
              if (runwayState in AppConfig.RUNWAY_STATE) {
                runwayState = AppConfig.RUNWAY_STATE[runwayState];
              }
              
              surfaceLookup[zoneuse].push({
                descrip: attrs[mapping.unfriendly],
                runwaystate: runwayState
              });
            });

            // If zoneuse is a plain text field with no coded value domain,
            // use the raw values as both code and name so getSurfaceCode() works.
            if (Object.keys(zoneUseLookup).length === 0) {
              Object.keys(surfaceLookup).forEach(value => {
                zoneUseLookup[value] = value;
              });
            }

            sceneLayerConfig.surfaceNameLookup = nameLookup;
            sceneLayerConfig.surfaceTypeLookup = surfaceLookup;
            sceneLayerConfig.zoneUseLookup = zoneUseLookup;
          }

          // When initializing scene layers:
          for (const sceneLayerConfig of AppConfig.arrSceneLayersUserConfig) {
            await buildSurfaceLookups(sceneLayerConfig);
          }

        },
        (error) => {
          console.error(error);
        },
      );
    });
  }, []);

  // Remove the local functions - they're now imported
  // function addObstacleMarkersToFeatureLayerAndMap(...) - REMOVED
  // async function addNewObstacleToTableAndFeatureLayer(...) - REMOVED
  // Remove this duplicate local addNewObstacle function - it's now imported

  function setGroundElevation(dGndElevMet, setGroundElevationState) {
    if (isRealValue(dGndElevMet) && setGroundElevationState) {
      setGroundElevationState(parseFloat(dGndElevMet));
    }
  }

  function metersToFeet(dHeightMt) {
    return dHeightMt / 0.3048;
  }

  // Remove these duplicate functions - they're now imported from pointDropOperations
  // const B_IN_ADD_OBSTACLE_MODE = true;
  // function queryElevationFromPoint(...) - REMOVED
  // function placeObstacleMarker_proposed(...) - REMOVED

  // Third-party components (buttons, icons, etc.)
  const markerSymbol_pending = {
    type: "simple-marker",
    color: [255, 255, 255, 0], //white transparent
    size: "14px",
    outline: {
      color: [253, 13, 196, 1], //pink outer ring
      width: 2,
    },
  };

  // Handler to open the PopupForm using MapContext
  const handleMapClick = useCallback((event, elevationLayer, graphicsLayer_1, mapView) => {    
    // Popup disabled, exiting map click handler
    if (!MapContext.state?.popupEnabled) {
      return;
    }
    
    // Validating map view
    if (!mapView) {
      console.error("No map view available.");
      return;
    }

    // Validating map point
    if (!event.mapPoint) {
      console.error("event.mapPoint is null or undefined.");
      return;
    }

    // Get coordinates and spatial reference from mapPoint
    const spatialRef = event.mapPoint.spatialReference;
    const isGeographic = spatialRef?.isGeographic || false;

    console.log("Spatial reference analysis:", {
      wkid: spatialRef?.wkid,
      latestWkid: spatialRef?.latestWkid,
      isGeographic: isGeographic,
      unit: spatialRef?.unit?.name
    });
    
    let coord_X, coord_Y;
    let coordinateLabel;
    
    if (isGeographic) {
      // Geographic coordinate system (WGS84) - use latitude/longitude
      coord_X = event.mapPoint.longitude;
      coord_Y = event.mapPoint.latitude;
      coordinateLabel = "Lon/Lat";
    } else {
      // Projected coordinate system (State Plane, Web Mercator, etc.) - use x/y
      coord_X = event.mapPoint.x;
      coord_Y = event.mapPoint.y;
      
      // Determine unit label based on spatial reference
      const unit = spatialRef?.unit?.name || "unknown";
      coordinateLabel = usingMeters ? "Meters" : "Feet";
      
      console.log("Projected coordinates:", { 
        x: coord_X, 
        y: coord_Y, 
        wkid: spatialRef?.wkid,
        unit: unit
      });
    }
    
    // Validate coordinates are valid numbers
    if (coord_X === null || coord_X === undefined || isNaN(coord_X)) {
      console.error("Invalid X coordinate:", coord_X);
      return;
    }
    
    if (coord_Y === null || coord_Y === undefined || isNaN(coord_Y)) {
      console.error("Invalid Y coordinate:", coord_Y);
      return;
    }

    // Query elevation with the actual Point object (has correct spatial reference)    
    queryElevationFromPoint(
      event.mapPoint, // Pass the full Point object with its spatial reference
      elevationLayer,
      setGroundElevationState,

      // Elevation query callback received
      (gndElevation) => {
        // Only render popup for valid point on elevation layer
        if (gndElevation === null) return;
        
        window.addNewObstacle = () =>
          addNewObstacle(MapContext, ObstacleContext, gndElevation, usingMeters);

        // Place the marker using the Point's spatial reference handling
        placeObstacleMarker_proposed(coord_X, coord_Y, graphicsLayer_1, spatialRef);

        // Seting up global utilities, configure window.isNumberKey
        window.isNumberKey = isNumberKey;

        // Format coordinates appropriately for Popup display
        let sCoordHeader;
        if (isGeographic) {
          sCoordHeader = `[${truncateCoordinate(coord_X, 6)}, ${truncateCoordinate(coord_Y, 6)}]`;
        } else {
          // Show projected coordinates with 2 decimal places (feet precision)
          sCoordHeader = `[${coord_X.toFixed(2)}, ${coord_Y.toFixed(2)}]`;
        }
        
        const divPopupForm = document.createElement("div");
        divPopupForm.id = "inputFormPopup";
        divPopupForm.classList.add("container");

        const unit = usingMeters ? "m" : "ft";
        divPopupForm.innerHTML = `
                <form>
                  <div class="row" style="margin-bottom: 18px; padding-left: 16px;">
                    <div class="col-md-12">
                      <h2 class="esri-widget__heading esri-popup__header-title" id="popupFormHeader">${sCoordHeader}</h2>
                      <small style="color: #6e6e6e;">${coordinateLabel}</small>
                    </div>
                  </div>
                  <div class="form-row" style="margin-bottom: 28px; padding-left: 16px;">
                    <div class="form-group col-md-6" style="margin-bottom: 18px;">
                      <label for="obstacleHeight">Name</label>
                      <input type="text" class="form-control form-control-sm"
                        id="obstacleName"
                        placeholder=""
                        style="background:#fff;border:1px solid #888;border-radius:4px;outline:none;"
                        onkeypress="">
                    </div>
                    <div class="form-group col-md-6" style="margin-bottom: 18px;">
                      <label for="obstacleHeight">Obstacle Ht AGL(${unit})</label>
                      <input type="text" class="form-control form-control-sm"
                        id="obstacleHeight"
                        placeholder=""
                        style="background:#fff;border:1px solid #888;border-radius:4px;outline:none;"
                        onkeypress="return window.isNumberKey(this,event, false);">
                    </div>
                  </div>
                  <div class="form-row" style="margin-bottom: 18px; padding-left: 16px;">
                    <div class="form-group col-md-6">
                      <button type="button" id="btnAddPopup"
                        style="
                          background:#888;
                          color:#fff;
                          border-radius:8px;
                          padding:4px 16px;
                          font-size:0.85em;
                          border:none;
                          min-width:120px;
                          cursor:pointer;
                        "
                        onclick="window.addNewObstacle()">Add To Obstacle List</button>
                    </div>
                  </div>
                </form>
                `;
        mapView.openPopup({
          title: "Create obstacle for analysis",
          content: divPopupForm,
          location: event.mapPoint, // Use the full Point object
        });
      }
    );
  }, [MapContext, ObstacleContext, usingMeters]);

  useEffect(() => {
    if (!MapContext.state?.mapView) return;
    if (!MapContext.state?.elevationLayer) return;
    
    const AppConfig = window.ObstacleAnalysis;
    var obstacleGroupLayer = MapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
    var graphicsLayer_1 = obstacleGroupLayer?.find(
      (layer) => layer.title === AppConfig.LAYER_NAMES.PENDING_MARKER
    );
    
    const clickHandler = (event) =>
      handleMapClick(
        event,
        MapContext.state?.elevationLayer,
        graphicsLayer_1,
        MapContext.state?.mapView,
      );

    const clickHandle = MapContext.state.mapView.on("click", clickHandler);

    // Removes old click handler when dependencies change
    return () => {
      clickHandle.remove();
    }
  }, [handleMapClick, MapContext, ObstacleContext, usingMeters]);
  
  // ...existing code...

  // Render the popup using MapContext popup state
  const popupContent = MapContext.state.popup;
  return (
    <>
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
        }}
      >
        {/* <div
          ref={mapDiv}
          id="viewDiv"
          style={{ height: "100%", width: "100%" }}
        ></div> */}
        <arcgis-scene
          id="arcgis-scene"
          item-id={window.ObstacleAnalysis?.sceneItemID}
          popupDisabled={true}
        >
          {/* <arcgis-placement position="top-left" class="top-left-placement"> */}
          {/* <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "baseline",
              }}
            > */}
          <arcgis-home></arcgis-home>
          <arcgis-zoom></arcgis-zoom>
          <arcgis-navigation-toggle></arcgis-navigation-toggle>
          <arcgis-compass></arcgis-compass>
          <arcgis-locate></arcgis-locate>
          {/* </div> */}
          {/* </arcgis-placement> */}
        </arcgis-scene>
      </div>
    </>
  );
};

export default Map;
