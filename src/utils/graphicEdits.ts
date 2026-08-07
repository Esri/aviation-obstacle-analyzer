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
import Point from "@arcgis/core/geometry/Point.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import { toFeet } from "@/utils/math";

// Add type declaration for window.ObstacleAnalysis
declare global {
  interface Window {
    ObstacleAnalysis: any;
  }
}

export function addObstacleMarkersToFeatureLayerAndMap(
  sDisplayName: string,
  dHeightAMSLMetTotal: number,  // In METERS (internal units)
  dObsHeightMet: number,         // In METERS
  dGroundMetMsl: number,         // In METERS
  dY: number,
  dX: number,
  sUniqueId: string,
  sStatus: string,
  MapContext: any,
  originalGeometry?: Point
) {
  // Validate coordinates
  if ((dX === null || dX === undefined || isNaN(dX)) ||
      (dY === null || dY === undefined || isNaN(dY))) {
    console.error("Invalid coordinates provided:", { dX, dY });
    return;
  }
  
  const AppConfig = (window as any).ObstacleAnalysis;
  
  const obstacleGroupLayer = MapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
  if (!obstacleGroupLayer) {
    console.error("Obstacle group layer not found.");
    return;
  }

  const featureLayerObstacleMarkers = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS
  );
  const featureLayerPillars = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS
  );
  const featureLayerPillarsPenetrate = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES
  );
  const featureLayerPillarLabels = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_LABELS
  );
  const featureLayerUserInputObstaclePoints = MapContext.getLayer(
    AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS
  );

  var bAddPillarToFeatureLayer = true;
  var bAddPillarPenetrateToFeatureLayer = true;
  var bAddPillarLabels = true;

  // Always use Web Mercator for consistent coordinate handling
  const baseGeometry = originalGeometry || new Point({
    x: dX,
    y: dY,
    spatialReference: { wkid: 3857 }  // Always Web Mercator
  });
  
  console.log("Created base geometry:", {
    x: baseGeometry.x,
    y: baseGeometry.y,
    z: baseGeometry.z,
    spatialReference: baseGeometry.spatialReference,
    hasZ: baseGeometry.hasZ
  });

  // Web Mercator scenes always use meters for vertical coordinates
  // All elevation data is stored internally in meters
  const sceneUsesMeters = AppConfig?.displayUnitConfig?.units === "meters";

  const pillarBottomZ = sceneUsesMeters ? dGroundMetMsl : toFeet(dGroundMetMsl);
  const pillarTopZ = sceneUsesMeters ? dHeightAMSLMetTotal : toFeet(dHeightAMSLMetTotal);
  var arrPillarGraphics = [];

  let curGraphicBase = new Graphic({
    geometry: baseGeometry,
    attributes: {
      latitude: dY,     
      longitude: dX,     
      type: "OBSTACLE",
      name: sDisplayName,
      obsheightamsl: dHeightAMSLMetTotal,  
      OISDELTA: 0,
      groundmsl: dGroundMetMsl,           
      uniqueid: sUniqueId,               
      status: sStatus,
    },
  });

  arrPillarGraphics.push(curGraphicBase);

  const addEdits = {
    addFeatures: arrPillarGraphics,
  };

  // Adding pillar graphics to obstacle markers layer
  featureLayerObstacleMarkers.applyEdits(addEdits);

  if (bAddPillarToFeatureLayer) {
    let arrPillarGraphics = [];

    const pillarGeometry = new Polyline({
      paths: [
        [[dX, dY, pillarBottomZ], [dX, dY, pillarTopZ]]
      ],
      spatialReference: baseGeometry.spatialReference,
      hasZ: true
    });

    let curGraphicPillarBase = new Graphic({
      geometry: pillarGeometry,
      attributes: {
        name: sDisplayName,
        uniqueid: sUniqueId,             
        latitude: dY,                     
        longitude: dX,                    
        obsheightamsl: dHeightAMSLMetTotal,  
        groundmsl: dGroundMetMsl,         
        OISDELTA: 0,
      },
    });

    arrPillarGraphics.push(curGraphicPillarBase);

    const addEdits = {
      addFeatures: arrPillarGraphics,
    };

    console.log("Adding pillar with geometry:", {
      bottom: [dX, dY, pillarBottomZ],
      top: [dX, dY, pillarTopZ],
      height: pillarTopZ - pillarBottomZ
    });

    void featureLayerPillars.applyEdits(addEdits).catch((error) => {
      console.error("Error adding pillar:", error);
    });
  }

  if (bAddPillarPenetrateToFeatureLayer) {
    let arrPillarGraphics = [];

    const penetrateGeometry = new Polyline({
      paths: [
        [[dX, dY, pillarBottomZ], [dX, dY, pillarBottomZ]]
      ],
      spatialReference: baseGeometry.spatialReference,
      hasZ: true
    });

    let curGraphicPillarPenetrate = new Graphic({
      geometry: penetrateGeometry,
      attributes: {
        NAME: sDisplayName,
        uniqueid: sUniqueId,
        latitude: dY,
        longitude: dX,
        OBSHEIGHTAMSL: dHeightAMSLMetTotal,
        OISDELTA: 0,
      },
    });

    arrPillarGraphics.push(curGraphicPillarPenetrate);

    const addEdits = {
      addFeatures: arrPillarGraphics,
    };

    featureLayerPillarsPenetrate.applyEdits(addEdits);
  }

  if (bAddPillarLabels) {
    let arrPillarGraphicsForText = [
      new Graphic({
        geometry: {
          type: "point",
          x: dX,
          y: dY,
          z: pillarTopZ,  
          spatialReference: baseGeometry.spatialReference
        },
        attributes: {
          NAME: sDisplayName,
          UNIQUEID: sUniqueId,
        },
      }),
    ];

    const addEdits = {
      addFeatures: arrPillarGraphicsForText,
    };
    
    featureLayerPillarLabels.applyEdits(addEdits);
  }

  // The user input points layer MUST have Z values in scene's vertical units
  if (featureLayerUserInputObstaclePoints) {
    const userInputGeometry = new Point({
      x: dX,
      y: dY,
      z: pillarTopZ,  
      spatialReference: baseGeometry.spatialReference,
      hasZ: true
    });

    let arrUserInputPoints = [
      new Graphic({
        geometry: userInputGeometry,
        attributes: {
          NAME: sUniqueId,
          STATUS: sStatus,
          DISPLAY_NAME: sDisplayName,
          OBSTACLE_HEIGHT: dObsHeightMet,  // Store in meters for calculations
          GROUND_ELEV: dGroundMetMsl,      // Store in meters for calculations
        },
      }),
    ];

    const addEditsFloatingPoints = {
      addFeatures: arrUserInputPoints,
    };

    console.log("Adding to user input points layer:", {
      attributes: arrUserInputPoints[0].attributes,
      geometry: arrUserInputPoints[0].geometry
    });

    featureLayerUserInputObstaclePoints.applyEdits(addEditsFloatingPoints).then((result) => {
      console.log("User input points layer applyEdits result:", result);
      if (result.addFeatureResults && result.addFeatureResults.length > 0) {
        console.log("Successfully added feature with ObjectID:", result.addFeatureResults[0].objectId);
      }
    }).catch((error) => {
      console.error("Error adding to user input points layer:", error);
    });
  }
}

export async function addNewObstacleToTableAndFeatureLayer(arrObstacles: any[], MapContext: any) {
  const AppConfig = (window as any).ObstacleAnalysis;

  var obstacleGroupLayer = MapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
  var featureLayerObstacleMarkers = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS
  );

  function getFeaturesByCriteria(featureLayerToTest: any, sSQLCriteria: string) {
    const query = featureLayerToTest.createQuery();
    query.where = sSQLCriteria;
    return featureLayerToTest.queryFeatures(query);
  }

  for (var curObs of arrObstacles) {
    let bValidFields = true;
    bValidFields = bValidFields && curObs.obsName.length > 0;
    bValidFields =
      bValidFields &&
      (curObs.obsHeightAGL > 0 || (curObs.obsHeightAMSL ?? 0) > 0);

    if (!bValidFields) {
      console.error('Enter a valid obstacle name and height.');
      return;
    }

    //check for valid unique name
    let objPromise = await getFeaturesByCriteria(
      featureLayerObstacleMarkers,
      "NAME= '" + curObs.obsName + "' ",
    );

    if (
      !Array.isArray(objPromise.features) ||
      objPromise.features.length != 0
    ) {
      console.error(
        "Obstacle name already exists: ",
        curObs.obsName,
        " - not adding."
      );
      return false;
    }

    let heightAMSLMetTotal = curObs.obsHeightAGL + curObs.gndElevation;

    if (heightAMSLMetTotal == 0) {
      heightAMSLMetTotal = curObs.obsHeightAMSL;
    }

    // Simplified approach: Let the pillar creation handle coordinate systems properly
    // Use the original coordinates, and let ArcGIS handle transformation internally
    let pillarX = curObs.x;
    let pillarY = curObs.y;

    addObstacleMarkersToFeatureLayerAndMap(
      curObs.obsName,
      heightAMSLMetTotal,
      curObs.obsHeightAGL,
      curObs.gndElevation,
      pillarY,  // Use simplified coordinates
      pillarX,  // Use simplified coordinates
      curObs.uniqueId,
      AppConfig.ANALYSIS_STATUS.NOT_DONE,
      MapContext,
      curObs.geometry  // Pass the stored geometry
    );
  }

  return true;
}

// Add renderer definitions and application function
export function applyObstacleRenderers(MapContext: any) {
  const AppConfig = (window as any).ObstacleAnalysis;

  // Color definitions
  const colorBlue = [38, 165, 255, 1];
  const colorBlueDark = [29, 124, 191, 1];
  const colorGreen = [0, 255, 0, 1];
  const colorGreenDark = [0, 191, 0, 1];
  const colorRed = [255, 0, 0, 1];
  const colorRedDark = [191, 0, 0, 1];

  // Symbol definitions
  const markerSymbol_notAnalyzed = {
    type: "simple-marker",
    color: colorBlueDark,
    size: "13px",
    outline: {
      color: [0, 0, 0, 1],
      width: 1,
    },
  };

  const markerSymbol_notPenetrates = {
    type: "simple-marker",
    color: colorGreenDark,
    size: "13px",
    outline: {
      color: [0, 0, 0, 1],
      width: 1,
    },
  };

  const markerSymbol_yesPenetrates = {
    type: "simple-marker",
    color: colorRedDark,
    size: "13px",
    outline: {
      color: [0, 0, 0, 1],
      width: 1,
    },
  };

  const lineSymbol_notAnalyzed = {
    type: "simple-line",
    color: colorBlue,
    width: 3,
  };

  const lineSymbol_yesPenetrates = {
    type: "simple-line",
    color: colorRed,
    width: 3,
  };

  const lineSymbol_notPenetrates = {
    type: "simple-line",
    color: colorGreen,
    width: 3,
  };

  // Renderer definitions
  const rendererForObsMarker = {
    type: "class-breaks",
    field: "OISDELTA",
    defaultSymbol: markerSymbol_notAnalyzed,
    classBreakInfos: [
      {
        minValue: -100000,
        maxValue: -0.00001,
        symbol: markerSymbol_notPenetrates,
        label: "Below penetrate point",
      },
      {
        minValue: 0,
        maxValue: 0,
        symbol: markerSymbol_notAnalyzed,
        label: "Not analyzed",
      },
      {
        minValue: 0.00001,
        maxValue: 100000,
        symbol: markerSymbol_yesPenetrates,
        label: "Above penetrate point",
      },
    ],
  };

  const rendererForObsPillarsBase = {
    type: "class-breaks",
    field: "OISDELTA",
    defaultSymbol: lineSymbol_notAnalyzed,
    classBreakInfos: [
      {
        minValue: -100000,
        maxValue: -0.00001,
        symbol: lineSymbol_notPenetrates,
        label: "Below penetrate point",
      },
      {
        minValue: 0,
        maxValue: 0,
        symbol: lineSymbol_notAnalyzed,
        label: "Not analyzed",
      },
      {
        minValue: 0.00001,
        maxValue: 100000,
        symbol: lineSymbol_notPenetrates,
        label: "Above penetrate point",
      },
    ],
  };

  const rendererForPillarsPenetrate = {
    type: "simple",
    symbol: lineSymbol_yesPenetrates,
  };

  // Apply renderers to layers
  const obstacleGroupLayer = MapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
  
  if (obstacleGroupLayer) {
    const featureLayerObstacleMarkers = obstacleGroupLayer.find(
      (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS
    );
    if (featureLayerObstacleMarkers) {
      featureLayerObstacleMarkers.renderer = rendererForObsMarker;
    }

    const featureLayerPillars = obstacleGroupLayer.find(
      (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS
    );
    if (featureLayerPillars) {
      featureLayerPillars.renderer = rendererForObsPillarsBase;
    }

    const featureLayerPillarsPenetrate = obstacleGroupLayer.find(
      (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES
    );
    if (featureLayerPillarsPenetrate) {
      featureLayerPillarsPenetrate.renderer = rendererForPillarsPenetrate;
    }
  }
}

function clearAllFromFeatureLayer(theFeatureLayer: any) {
  // query for the features you want to remove, all of them
  theFeatureLayer.queryFeatures().then((resultFeatureSet: any) => {
    const deleteEdits = {
      deleteFeatures: resultFeatureSet.features,
    };
    // apply edits to the layer
    theFeatureLayer.applyEdits(deleteEdits);
  });
}

export const clearAllObstaclesFromMap = (MapContext: any) => {
  const AppConfig = (window as any).ObstacleAnalysis;

  var obstacleGroupLayer = MapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
  var featureLayerObstacleMarkers = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_MARKERS
  );
  var featureLayerPillars = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS
  );
  var featureLayerPillarsPenetrate = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_PILLARS_PENETRATES
  );
  var featureLayerPillarLabels = obstacleGroupLayer.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.OBSTACLE_LABELS
  );
  var featureLayerUserInputObstaclePoints = MapContext.getLayer(
    AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS
  );

  // Make sure we're clearing all features, not just querying them
  if (featureLayerUserInputObstaclePoints) {
    featureLayerUserInputObstaclePoints.queryFeatures().then((result: any) => {
      if (result.features && result.features.length > 0) {
        // Clear features from User Input layer
        const deleteEdits = { deleteFeatures: result.features };
        featureLayerUserInputObstaclePoints.applyEdits(deleteEdits);
      }
    });
  }

  clearAllFromFeatureLayer(featureLayerObstacleMarkers);
  clearAllFromFeatureLayer(featureLayerPillarLabels);
  clearAllFromFeatureLayer(featureLayerPillars);
  clearAllFromFeatureLayer(featureLayerPillarsPenetrate);

  var graphicsLayer_1 = obstacleGroupLayer?.find(
    (layer: any) => layer.title === AppConfig.LAYER_NAMES.PENDING_MARKER
  );
  if (graphicsLayer_1 && graphicsLayer_1.removeAll) {
    // Removing all graphics from graphicsLayer_1
    graphicsLayer_1.removeAll();
  }
};
