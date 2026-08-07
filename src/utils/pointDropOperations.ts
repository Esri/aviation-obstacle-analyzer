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
import Point from "@arcgis/core/geometry/Point.js";
import Graphic from "@arcgis/core/Graphic.js";
import * as promiseUtils from "@arcgis/core/core/promiseUtils.js";

// Import utilities for addNewObstacle function
import { toMeters, getUniqueId } from "@/utils/math";
import { addNewObstacleToTableAndFeatureLayer, applyObstacleRenderers } from "@/utils/graphicEdits";

// Special code for missing data
const NO_ELEVATION_DATA = -9999;

// Symbol for pending marker
const markerSymbol_pending = {
  type: "simple-marker" as const,
  color: [255, 255, 255, 0], // white transparent
  size: "14px",
  outline: {
    color: [253, 13, 196, 1], // pink outer ring
    width: 2,
  },
};

// Utility function to truncate coordinates
function truncateCoordinate(coord: number, desiredPrecision: number = 6): string {
  return coord.toFixed(desiredPrecision);
}

// TODO: determine default unit returned from elevationLayer
export function queryElevationFromPoint(
  thePoint: Point, 
  elevationLayer: any,
  setGroundElevationState?: (elevation: number) => void, 
  callback?: (elevation: number | null) => void
) {
  // Always use longitude/latitude for Web Mercator standardization
  console.log("Querying elevation for point:", {
    longitude: thePoint.longitude?.toFixed(3),
    latitude: thePoint.latitude?.toFixed(3)
  });

  const queryElevPromise = elevationLayer.queryElevation(thePoint, {
    noDataValue: NO_ELEVATION_DATA,
  });

  return promiseUtils
    .eachAlways([queryElevPromise])
    .then((results) => {
      const AppConfig = (window as any).ObstacleAnalysis;
      const usingMeters = AppConfig?.displayUnitConfig?.units === "meters";

      // Elevation Z units: Web Mercator scenes return meters
      const rawElevZ = parseFloat(results[0].value.geometry.z.toFixed(3));

      if (rawElevZ === NO_ELEVATION_DATA) {
        // Elevation query returned no data value
        if (callback) callback(null);
        return null;
      }

      // Convert to meters for internal storage based on config units
      const theElevZMet = usingMeters ? rawElevZ : toMeters(rawElevZ);

      if (setGroundElevationState) {
        setGroundElevationState(theElevZMet);
      }

      if (callback) callback(theElevZMet);
      return theElevZMet;
    })
    .catch((error) => {
      console.error("Elevation query failed:", error.message || error);
      if (callback) callback(null);
      return null;
    });
}

export function placeObstacleMarker_proposed(
  x: number, 
  y: number, 
  graphicsLayer: any
) {
  if (!graphicsLayer) return false;

  graphicsLayer.removeAll();

  // Create point with longitude/latitude for Web Mercator consistency
  const pointPendingGround = new Point({
    x: x,
    y: y,
    spatialReference: graphicsLayer.spatialReference || { wkid: 3857 }
  });

  const pointPendingGraphicGround = new Graphic({
    geometry: pointPendingGround,
    symbol: markerSymbol_pending,
  });

  graphicsLayer.add(pointPendingGraphicGround);
  return true;
}

export function createPopupFormHTML(theX: number, theY: number, usingMeters: boolean): string {
  const sCoordHeader = `[${truncateCoordinate(theX)}, ${truncateCoordinate(theY)}]`;
  const unit = usingMeters ? "m" : "ft";
  
  return `
    <form>
      <div class="row" style="margin-bottom: 18px; padding-left: 16px;">
        <div class="col-md-12">
          <h2 class="esri-widget__heading esri-popup__header-title" id="popupFormHeader">${sCoordHeader}</h2>
        </div>
      </div>
      <div class="form-row" style="margin-bottom: 28px; padding-left: 16px;">
        <div class="form-group col-md-6" style="margin-bottom: 18px;">
          <label for="obstacleName">Name</label>
          <input type="text" class="form-control form-control-sm" 
            id="obstacleName" 
            placeholder=""
            style="background:#fff;border:1px solid #888;border-radius:4px;outline:none;">
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
}

export function showPopupForm(
  theX: number, 
  theY: number, 
  usingMeters: boolean,
  mapView: any,
  B_IN_ADD_OBSTACLE_MODE: boolean,
  spatialReference?: any  // 
) {
  if (!B_IN_ADD_OBSTACLE_MODE || !mapView) return false;


  const thePoint = new Point({
    x: theX,
    y: theY,
    spatialReference: spatialReference || mapView.spatialReference || { wkid: 3857 }
  });

  const divPopupForm = document.createElement("div");
  divPopupForm.id = "inputFormPopup";
  divPopupForm.classList.add("container");
  
  divPopupForm.innerHTML = createPopupFormHTML(theX, theY, usingMeters);

  mapView.openPopup({
    title: "Create obstacle for analysis",
    content: divPopupForm,
    location: thePoint
  });

  return true;
}

export function addNewObstacle(MapContext: any, ObstacleContext: any, gndElevation: number, usingMeters: boolean, originalPoint?: Point) {
  var obsName = document.getElementById("obstacleName") as HTMLInputElement;
  var obsNameValue = obsName?.value?.trim() || "";

  var obsHtAglElement = document.getElementById("obstacleHeight") as HTMLInputElement;
  var obsHtAgl = parseFloat(obsHtAglElement?.value?.trim() || "0");

  // gndElevation is ALREADY in meters (converted in queryElevationFromPoint)
  // Only the obstacle height needs conversion based on user's unit preference
  var obsHtAglMet = usingMeters ? obsHtAgl : toMeters(obsHtAgl);
  var gndElevMet = gndElevation; // Already in meters, no conversion needed

  var coord_Y = null;
  var coord_X = null;
  var header = document.getElementById("popupFormHeader");
  if (header) {
    // header text is like: [x, y] - extract the numbers
    var match = header.textContent?.match(/\[([-\d.]+),\s*([-\d.]+)\]/);
    if (match) {
      coord_X = parseFloat(match[1]);
      coord_Y = parseFloat(match[2]);
    }
  }

  var arrObstacles = [];
  var sUid = getUniqueId();
  var totalHeightAMSL = gndElevMet + obsHtAglMet;

  const obstacleObject = {
    obsName: obsNameValue,
    obsWasAnalyzed: false,
    obsHasPenetration: false,
    obsHeightAGL: obsHtAglMet,
    obsHeightAMSL: totalHeightAMSL,
    gndElevation: gndElevMet,
    x: coord_X,   // Use longitude for Web Mercator
    y: coord_Y,   // Use latitude for Web Mercator
    uniqueId: sUid,
    collisions: [],
    geometry: originalPoint, // Store the full Point object
  };
  arrObstacles.push(obstacleObject);

  addNewObstacleToTableAndFeatureLayer(arrObstacles, MapContext).then((value) => {
    if (value) {
      // Use appendObstacle to add single obstacle after validation
      if (ObstacleContext?.appendObstacle) {
        ObstacleContext.appendObstacle(obstacleObject);
      }
      
      if (obsName) obsName.value = "";
      if (obsHtAglElement) obsHtAglElement.value = "";

      // Close popup after adding obstacle
      MapContext.state?.mapView.closePopup();

      // Apply renderers after adding obstacle
      applyObstacleRenderers(MapContext);
    }
  });
}