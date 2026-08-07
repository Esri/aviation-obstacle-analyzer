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
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import Point from "@arcgis/core/geometry/Point.js";

// Add type declaration for window.ObstacleAnalysis
declare global {
  interface Window {
    ObstacleAnalysis: any;
  }
}

/**
 * Updates all feature layers for a specific obstacle after analysis
 */
export const updateObstacleFeatureLayers = (
  uniqueId: string,
  deltaZ: number,
  hasPenetration: boolean,
  analysisResult: any,
  sceneLayerTitle: string,
  mapContext: any
) => {
  const AppConfig = (window as any).ObstacleAnalysis;
  
  const obstacleGroupLayer = mapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
  if (!obstacleGroupLayer) return;

  const layers = {
    markers: obstacleGroupLayer.find((layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS),
    pillars: obstacleGroupLayer.find((layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS),
    pillarsPenetrate: obstacleGroupLayer.find((layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES),
    userInput: mapContext.getLayer(AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS)
  };

  // Update each layer type
  updateMarkerLayer(layers.markers, uniqueId, deltaZ);
  updatePillarLayers(layers.pillars, layers.pillarsPenetrate, uniqueId, deltaZ);
  updateUserInputLayer(layers.userInput, uniqueId, hasPenetration, analysisResult, sceneLayerTitle);
};

/**
 * Updates the 2D marker layer with new delta Z value
 */
const updateMarkerLayer = (layer: any, uniqueId: string, deltaZ: number) => {
  if (!layer) return;

  const query = layer.createQuery();
  query.where = `uniqueid = '${uniqueId}'`;

  layer.queryFeatures(query).then((result: any) => {
    if (Array.isArray(result.features)) {
      const updates = result.features.map((feature: any) => {
        feature.attributes["OISDELTA"] = deltaZ;
        return feature;
      });

      layer.applyEdits({ updateFeatures: updates });
    }
  });
};

/**
 * Updates pillar layers to show penetration visualization
 */
const updatePillarLayers = (pillarsLayer: any, penetrateLayer: any, uniqueId: string, deltaZ: number) => {
  if (!pillarsLayer || !penetrateLayer) return;

  const query = pillarsLayer.createQuery();
  query.where = `uniqueid = '${uniqueId}'`;
  query.returnGeometry = true;
  query.outFields = ["*"]; 

  pillarsLayer.queryFeatures(query).then((result: any) => {
    if (!Array.isArray(result.features) || result.features.length === 0) return;

    const AppConfig = (window as any).ObstacleAnalysis;
    const spatialReference = AppConfig.SPATIAL_REFERENCE;

    if (!spatialReference) {
      console.error("No spatial reference available for pillar updates.");
      return;
    }

    // Get elevation layer from AppConfig/window
    const elevationLayer = AppConfig.ELEVATION_LAYER;
    if (!elevationLayer) {
      console.error("Elevation layer not available for querying ground elevation.");
      return;
    }

    const updatedPillars: any[] = [];
    const penetrationSegments: any[] = [];

    // Process each feature
    const featurePromises = result.features.map((feature: any, index: number) => {
      return new Promise((resolve) => {
        const attrs = feature.attributes;
        
        // TODO: standardize attribute names in data source
        let x = attrs["longitude"] || attrs["Longitude"] || attrs["LONGITUDE"] || attrs["x"] || attrs["X"];
        let y = attrs["latitude"] || attrs["Latitude"] || attrs["LATITUDE"] || attrs["y"] || attrs["Y"];
        
        console.log("x value attribute search result:", {
          longitude: attrs["longitude"],
          Longitude: attrs["Longitude"],
          LONGITUDE: attrs["LONGITUDE"],
          x: attrs["x"],
          X: attrs["X"],
          finalValue: x
        });

        console.log("y value attribute search result:", {
          latitude: attrs["latitude"],
          Latitude: attrs["Latitude"],
          LATITUDE: attrs["LATITUDE"],
          y: attrs["y"],
          Y: attrs["Y"],
          finalValue: y
        });
        
        // Check if coordinates look like WGS84 (longitude/latitude ranges)
        if (x && y && Math.abs(x) <= 180 && Math.abs(y) <= 90) {
          // Simple transformation: longitude/latitude to Web Mercator
          // This is approximate but should work for elevation queries
          const earthRadius = 6378137; // Earth's radius in meters
          const webMercatorX = x * (Math.PI / 180) * earthRadius;
          const webMercatorY = Math.log(Math.tan((90 + y) * Math.PI / 360)) * earthRadius;
          
          x = webMercatorX;
          y = webMercatorY;
        }
        
        // TODO: standardize attribute names in data source
        const heightAMSL_Meters = attrs["obsheightamsl"] || 
                                 attrs["OBSHEIGHTAMSL"] || 
                                 attrs["ObsHeightAMSL"];
                                 
        console.log("Height attribute search result:", {
          obsheightamsl: attrs["obsheightamsl"],
          OBSHEIGHTAMSL: attrs["OBSHEIGHTAMSL"],
          ObsHeightAMSL: attrs["ObsHeightAMSL"],
          finalValue: heightAMSL_Meters
        });

        if (x === null || x === undefined || y === null || y === undefined) {
          console.warn("Feature missing coordinates, skipping:", attrs);
          resolve(null);
          return;
        }

        //Query elevation layer to get ground elevation
        const pointToQuery = new Point({
          x: x,
          y: y,
          spatialReference: spatialReference
        });
        
        elevationLayer.queryElevation(pointToQuery).then((elevResult: any) => {
          // Elevation returns in meters for Web Mercator
          let groundMeters = elevResult.geometry.z;
          
          // Handle invalid elevation results
          if (groundMeters === null || groundMeters === undefined || isNaN(groundMeters) || groundMeters === 0) {
            console.warn("Invalid ground elevation, using fallback value. Original:", groundMeters);
            // Use a reasonable fallback or try to get it from the original feature attributes
            groundMeters = attrs["ground_elev"] || attrs["GROUND_ELEV"] || 1500; // fallback elevation in meters
          }

          // Validate heightAMSL_Meters
          if (heightAMSL_Meters === null || heightAMSL_Meters === undefined || isNaN(heightAMSL_Meters)) {
            console.error("Skipping pillar update because height attribute is missing or invalid.", {
              featureIndex: index,
              heightAMSL_Meters,
              availableAttributes: Object.keys(attrs),
            });
            resolve(null);
            return;
          }

          // Update main pillar (ground to penetration point, or ground to full height)
          let pillarHeight = deltaZ > 0 ? heightAMSL_Meters - deltaZ : heightAMSL_Meters;
          
          // Validate geometry coordinates
          if (Math.abs(pillarHeight - groundMeters) < 0.1) {
            console.warn("Pillar height nearly equals ground - adjusting to prevent invisible pillar");
            // Adjust pillar height to ensure minimum visible height of 5 meters
            pillarHeight = groundMeters + Math.max(5, heightAMSL_Meters - groundMeters);
          }
          
          // Additional safety checks
          if (isNaN(pillarHeight) || isNaN(groundMeters)) {
            console.error("Invalid numeric values for pillar coordinates:", { pillarHeight, groundMeters });
            resolve(null);
            return;
          }
          
          if (pillarHeight <= groundMeters) {
            console.warn("Pillar height <= ground, forcing minimum height");
            pillarHeight = groundMeters + 5; // Force minimum 5m height
          }

          const pillarPolyline = new Polyline({
            paths: [
              [[x, y, groundMeters], [x, y, pillarHeight]]
            ],
            spatialReference: spatialReference,
            hasZ: true
          });
          
          // Validate the created geometry
          if (!pillarPolyline.paths || pillarPolyline.paths.length === 0) {
            console.error("Invalid pillar geometry created:", { groundMeters, pillarHeight, x, y });
            resolve(null);
            return;
          }

          console.log("Created pillar polyline:", {
            path: [[x, y, groundMeters], [x, y, pillarHeight]],
            hasZ: pillarPolyline.hasZ
          });

          const updatedPillar = new Graphic({
            geometry: pillarPolyline,
            attributes: { ...attrs, OISDELTA: deltaZ }
          });

          // Add updated pillar to array
          updatedPillars.push(updatedPillar);

          // Create red penetration segment if needed
          if (deltaZ > 0) {
            const penetrationPolyline = new Polyline({
              paths: [
                [[x, y, pillarHeight], [x, y, heightAMSL_Meters]]
              ],
              spatialReference: spatialReference,
              hasZ: true
            });
            
            // Validate penetration geometry
            if (Math.abs(heightAMSL_Meters - pillarHeight) < 0.1) {
              console.warn("Penetration segment too small, skipping");
            } else if (!penetrationPolyline.paths || penetrationPolyline.paths.length === 0) {
              console.error("Invalid penetration geometry created:", { pillarHeight, heightAMSL_Meters, x, y });
              resolve(null);
              return;
            }

            const penetrationSegment = new Graphic({
              geometry: penetrationPolyline,
              attributes: attrs
            });

            // Add penetration segment to array
            penetrationSegments.push(penetrationSegment);
          }

          resolve(null);
        }).catch((elevError: any) => {
          console.error("Elevation query failed for point:", { x, y }, elevError);
          
          // TODO: standardize attribute names in data source
          // Try to use ground elevation from original feature attributes as fallback
          const fallbackGround = attrs["ground_elev"] || attrs["GROUND_ELEV"] || 1500;
          const pillarHeight = deltaZ > 0 ? heightAMSL_Meters - deltaZ : heightAMSL_Meters;
          console.log("Ground elevation attribute search result:", {
            ground_elev: attrs["ground_elev"],
            GROUND_ELEV: attrs["GROUND_ELEV"],
            finalValue: fallbackGround
          });

          // Validate fallback values
          if (isNaN(fallbackGround) || isNaN(pillarHeight) || pillarHeight <= fallbackGround) {
            console.error(`Invalid fallback values for feature ${index}, skipping:`, { fallbackGround, pillarHeight });
            resolve(null);
            return;
          }
          
          const pillarPolyline = new Polyline({
            paths: [
              [[x, y, fallbackGround], [x, y, pillarHeight]]
            ],
            spatialReference: spatialReference,
            hasZ: true
          });
          
          const updatedPillar = new Graphic({
            geometry: pillarPolyline,
            attributes: { ...attrs, OISDELTA: deltaZ }
          });

          // Add pillar using fallback elevation
          updatedPillars.push(updatedPillar);
          resolve(null);
        });
      });
    });

    // Wait for all elevation queries to complete
    Promise.all(featurePromises).then(() => {
      // Don't delete pillars if we can't create new ones
      if (updatedPillars.length === 0) {
        console.error("Skipping pillar update: no geometries generated from elevation queries.");
        return;
      }

      // Apply updates
      const deleteEdits = { deleteFeatures: result.features };
      const addPillarEdits = { addFeatures: updatedPillars };

      // First delete old pillars, then add new pillars
      void pillarsLayer
        .applyEdits(deleteEdits)
        .catch((deleteError: any) => {
          console.error("Error deleting old pillars:", deleteError);
          throw deleteError;
        })
        .then(() => pillarsLayer.applyEdits(addPillarEdits))
        .catch((addError: any) => {
          console.error("Error adding new pillars:", addError);
        });

      // Update penetration layer
      const queryPenetrate = penetrateLayer.createQuery();
      queryPenetrate.where = `uniqueid = '${uniqueId}'`;
      
      penetrateLayer.queryFeatures(queryPenetrate).then((penetrateResult: any) => {
        // Querying existing penetration segments
        const deletePenetrateEdits = { deleteFeatures: penetrateResult.features };
        
        // Delete old penetration segments if they exist, then add new ones if needed
        void penetrateLayer
          .applyEdits(deletePenetrateEdits)
          .catch((deletePenetrateError: any) => {
            console.error("Error deleting old penetration segments:", deletePenetrateError);
            throw deletePenetrateError;
          })
          .then(() => {
            if (penetrationSegments.length === 0) return;
            return penetrateLayer.applyEdits({ addFeatures: penetrationSegments });
          })
          .catch((addPenetrateError: any) => {
            console.error("Error adding penetration segments:", addPenetrateError);
          });
      });
    });
  });
};

/**
 * Updates user input layer with analysis results
 */
const updateUserInputLayer = (
  layer: any,
  uniqueId: string,
  hasPenetration: boolean,
  analysisResult: any,
  sceneLayerTitle: string
) => {
  if (!layer) return;

  const AppConfig = (window as any).ObstacleAnalysis;
  const query = layer.createQuery();
  // User input layer uses uppercase NAME field to store uniqueId
  query.where = `NAME = '${uniqueId}'`;
  query.returnGeometry = true;  // Ensure geometry is returned
  query.returnZ = true;          // Ensure Z values are returned

  layer.queryFeatures(query).then((result: any) => {
    if (Array.isArray(result.features)) {
      const updates = result.features.map((feature: any) => {
        const originalGeometry = feature.geometry.clone();
        feature.attributes = {
          ...feature.attributes,
          status: AppConfig.ANALYSIS_STATUS.DONE,
          penetrates: hasPenetration ? "Yes" : "No",
          descrip: analysisResult?.DESCRIP,
          z: analysisResult?.Z,
          ois_z: analysisResult?.OIS_Z,
          delta_z: analysisResult?.Delta_Z,
          rwydesg: analysisResult?.RWYDESG,
          layer_name: sceneLayerTitle
        };
        feature.geometry = originalGeometry;
        return feature;
      });

      layer.applyEdits({ updateFeatures: updates });
    }
  });
};

/**
 * Resets the scene visualization by:
 * 1. Turning all surface layers ON (making all surfaces visible)
 * 2. Clearing all definition expression filters
 * Does NOT affect the User Input Obstacle Points layer (data storage only)
 */
export const resetResultsInScene = (mapContext: any) => {
  const AppConfig = (window as any).ObstacleAnalysis;

  // Get configured scene layer groups from context
  const sceneLayerViews = mapContext.state?.sceneLayerViews;
  
  if (!sceneLayerViews || sceneLayerViews.length === 0) {
    console.warn("No scene layer views available for reset");
    return;
  }

  // Process each configured scene layer group
  sceneLayerViews.forEach((config: any) => {
    const groupLayer = config.groupLayer;
    const { zoneUseLookup, visibilityLookup, surfaceTypeField } = config;
    
    if (!groupLayer) return;

    // Turn ON the group layer
    groupLayer.visible = true;

    // Turn ON all sublayers and clear their filters
    if (groupLayer.allLayers) {
      groupLayer.allLayers.forEach((sublayer: any) => {
        // Set sublayers to default visibility
        const isSubgroup = sublayer.title === config.subgroupTitle;
        sublayer.visible = visibilityLookup[sublayer.title] ?? !isSubgroup;

        // Reset definition expression
        if (isSubgroup) {
          sublayer.definitionExpression = config.subDefinitionExpression;
        } else {
          const layerIndex = getSurfaceCode(sublayer, zoneUseLookup);
          sublayer.definitionExpression = `${surfaceTypeField} IN ('${layerIndex}', '') OR ${surfaceTypeField} IS NULL`;
        }
      });
    }
  });

  // Reset all markers to be visible
  const markerLyrs = mapContext.getLayer(
    AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS,
  );

  // All markers and surface layers now visible with no filters
  markerLyrs.forEach((l) => {
    if (l.type === "feature") {
      l.definitionExpression = "1 = 1";
    }
  });
};

export const getSpatialReferenceFromElevationLayer = (elevationLayer: any) => {
  if (!elevationLayer?.spatialReference) return null;
  
  const sr = elevationLayer.spatialReference;
  return {
    wkid: sr.wkid,
    latestWkid: sr.latestWkid || sr.wkid,
    vcsWkid: sr.vcsWkid,
    latestVcsWkid: sr.latestVcsWkid || sr.vcsWkid
  };
};

// Use zoneUseLookup to match layer title to corresponding index
export const getSurfaceCode = (layer: any, zoneUseLookup: any) => {
  return (
    Object.keys(zoneUseLookup).find(
      (index) => zoneUseLookup[index] === layer.title,
    ) || null
  );
};