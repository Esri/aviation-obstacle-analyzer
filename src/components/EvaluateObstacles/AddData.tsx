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
// #region ========================= IMPORTS ===================================
// #region ----------------------  React ---------------------------------
import React, { useEffect, useState } from "react";

// #endregion ------------------- React ---------------------------------

// #region ------------ 3rd-Party Components / Libraries -----------------------
import Papa from "papaparse";
//JSAPI
import Multipoint from "@arcgis/core/geometry/Multipoint";
import Point from "@arcgis/core/geometry/Point.js";
import * as projection from "@arcgis/core/geometry/projection.js";

//Calcite
import "@esri/calcite-components/dist/components/calcite-input-text";
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-select";
import "@esri/calcite-components/dist/components/calcite-option";

import {
  CalciteInputText,
  CalciteButton,
  CalcitePanel,
  CalciteSelect,
  CalciteOption,
} from "@esri/calcite-components-react";
// #endregion --------- 3rd-Party Components / Libraries -----------------------

// #region -------------- Custom Components / Utilities ------------------------

import { getUniqueId, dmsToDecimalDegrees, toMeters } from "@/utils/math";
import {
  useMapContext,
  useObstacleContext,
  useAppContext
} from "@/contexts";
import { ObstacleType } from "@/contexts/ObstacleTypes";
import {
  addNewObstacleToTableAndFeatureLayer,
  applyObstacleRenderers,
} from "@/utils/graphicEdits";
import { queryElevationFromPoint, placeObstacleMarker_proposed, showPopupForm, addNewObstacle } from "@/utils/pointDropOperations";
import { AddDataContainer, StyledCalciteSelect } from "./AddDataStyled";
// #endregion ----------- Custom Components / Utilities ------------------------

// #region ------------------------ Resources ----------------------------------
// #endregion --------------------- Resources ----------------------------------
// #endregion ====================== IMPORTS ===================================
const AddData = () => {
  // #region ------------------ Hooks (Resources) ------------------------------
  const obstacleContext = useObstacleContext();
  const mapContext = useMapContext();
  const { usingMeters } = useAppContext();
  const elevationLayer = mapContext.state?.elevationLayer;
  const hasSelectedObstacle = obstacleContext.state.selectedObstacle !== null;
  // #endregion --------------- Hooks (Resources) ------------------------------

  // #region -------------------- Hooks (State) --------------------------------
  // Add state for coordinate inputs
  const [coordinates, setCoordinates] = useState({
    x: '',
    y: ''
  });

  // Add state for DMS coordinate inputs
  const [dmsCoordinates, setDmsCoordinates] = useState({
    lat: { degrees: '', minutes: '', seconds: '', direction: 'N' },
    lon: { degrees: '', minutes: '', seconds: '', direction: 'E' }
  });

  const [coordinateType, setCoordinateType] = useState<
    "dms" | "dd"
  >("dd");

  // Clear existing inputs when coordinate type changes
  useEffect(() => {
    setCoordinates({ x: '', y: '' });
    setDmsCoordinates({
      lat: { degrees: '', minutes: '', seconds: '', direction: 'N' },
      lon: { degrees: '', minutes: '', seconds: '', direction: 'E' }
    });
  }, [coordinateType]);

  useEffect(() => {
  }, [coordinates]);
  // #endregion ----------------- Hooks (State) --------------------------------

  // #region ------------------- Event Handlers --------------------------------
  
  // Add coordinate input validation function
  const isNumberKey = (event: React.KeyboardEvent, allowNegative: boolean = true) => {
    const key = event.key;
    const value = (event.target as HTMLInputElement).value;
    
    // Allow navigation and editing keys
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key) ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(key.toLowerCase()))) {
      return true;
    }
    
    // Allow decimal point if not already present
    if (key === '.' && value.indexOf('.') === -1) {
      return true;
    }
    
    // Allow negative sign if at beginning and allowNegative is true
    if (key === '-' && allowNegative && value.length === 0) {
      return true;
    }
    
    // Only allow numbers
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
      return false;
    }
    
    return true;
  };

  const handleInputChange = (field: 'x' | 'y', value: string) => {
    setCoordinates(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const convertDMSToDecimalDegrees = (dmsData: typeof dmsCoordinates[keyof typeof dmsCoordinates]) => {
    if (dmsData.degrees && dmsData.minutes && dmsData.seconds) {
      return dmsToDecimalDegrees(
        parseFloat(dmsData.degrees),
        parseFloat(dmsData.minutes),
        parseFloat(dmsData.seconds),
        dmsData.direction
      ).toString();
    }
    return '';
  };

  const handleDMSInputChange = (coord: 'lat' | 'lon', field: 'degrees' | 'minutes' | 'seconds' | 'direction', value: string) => {
    const updatedDms = {
      ...dmsCoordinates,
      [coord]: {
        ...dmsCoordinates[coord],
        [field]: value
      }
    };
    setDmsCoordinates(updatedDms);

    // Convert coordinates based on coordinate type
    const coordinateMapping = {
      lon: 'x' as const,
      lat: 'y' as const
    };

    // Auto-convert to decimal degrees when all fields have values or clear when field is empty/deleted
    const decimalValue = convertDMSToDecimalDegrees(updatedDms[coord]);
    setCoordinates(prev => ({ 
      ...prev, 
      [coordinateMapping[coord]]: decimalValue 
    }));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    // Handle Enter key to trigger Add Point
    if (event.key === 'Enter') {
      handleAddPoint();
    }
  };

  // Add coordinate-based point addition function
  const handleAddPoint = async () => {
    if (!mapContext.state.mapView) {
      return;
    }

    let goToLon, goToLat;

    if (coordinateType === "dd") {
      goToLon = parseFloat(coordinates.x);
      goToLat = parseFloat(coordinates.y);
    } else if (coordinateType === "dms") {
      // Convert DMS to decimal degrees
      goToLon = dmsToDecimalDegrees(
        parseFloat(dmsCoordinates.lon.degrees),
        parseFloat(dmsCoordinates.lon.minutes),
        parseFloat(dmsCoordinates.lon.seconds),
        dmsCoordinates.lon.direction
      );
      goToLat = dmsToDecimalDegrees(
        parseFloat(dmsCoordinates.lat.degrees),
        parseFloat(dmsCoordinates.lat.minutes),
        parseFloat(dmsCoordinates.lat.seconds),
        dmsCoordinates.lat.direction
      );
    } 

    if (isNaN(goToLat) || isNaN(goToLon)) {
      console.error("Enter valid coordinates.");
      return;
    }

    try {
      // Create geographic point (WGS84)
      const geographicPoint = new Point({
        longitude: goToLon,
        latitude: goToLat,
        spatialReference: { wkid: 4326 } // WGS84
      });

      // Load projection engine if not already loaded
      await projection.load();

      // Get the map's spatial reference (Web Mercator)
      const targetSpatialRef = mapContext.state.mapView.spatialReference;

      // Project from WGS84 to Web Mercator
      const projectedPoint = projection.project(geographicPoint, targetSpatialRef) as Point;

      if (!projectedPoint) {
        console.error("Failed to project coordinates to map spatial reference:", targetSpatialRef);
        return;
      }

      // Query elevation for the PROJECTED point
      if (mapContext.state?.elevationLayer) {
        await new Promise((resolve) => {
          queryElevationFromPoint(projectedPoint, mapContext.state.elevationLayer, undefined, (gndElevation) => {
            // Set up the global function for the popup button
            if (gndElevation !== null) {
              (window as any).addNewObstacle = () => addNewObstacle(mapContext, obstacleContext, gndElevation, usingMeters, projectedPoint);
            }
            resolve(undefined);
          });
        });
      }

      // Navigate to location using PROJECTED point
      const cam = mapContext.state.mapView.camera.clone();
      cam.tilt = 0;
      cam.heading = 0;
      cam.position = {
        x: projectedPoint.x,
        y: projectedPoint.y,
        z: 25000,
        spatialReference: targetSpatialRef
      };

      await mapContext.state.mapView.goTo(cam);

      // Place marker using PROJECTED coordinates
      const AppConfig = (window as any).ObstacleAnalysis;
      const obstacleGroupLayer = mapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
      const graphicsLayer = obstacleGroupLayer?.find(
        (layer: any) => layer.title === AppConfig.LAYER_NAMES.PENDING_MARKER
      );
      
      if (graphicsLayer) {
        placeObstacleMarker_proposed(projectedPoint.x, projectedPoint.y, graphicsLayer);
      }

      // Set up global utilities for the popup
      (window as any).isNumberKey = (input: HTMLInputElement, event: KeyboardEvent, allowNegative: boolean) => {
        const keyEvent = {
          key: event.key,
          ctrlKey: event.ctrlKey,
          preventDefault: () => event.preventDefault(),
          target: input
        } as unknown as React.KeyboardEvent;
        return isNumberKey(keyEvent, allowNegative);
      };

      // Show the popup form with PROJECTED coordinates
      showPopupForm(projectedPoint.x, projectedPoint.y, usingMeters, mapContext.state.mapView, true, targetSpatialRef);

    } catch (error) {
      console.error("Error navigating to location:", error);
    }
  };

  /**
   * @description Enables drawing mode for adding a single obstacle point
   */
  const handleDrawPoint = () => {
    // Enable popup mode in MapContext after Draw Point is clicked
    if (mapContext?.dispatch) {
      mapContext.dispatch({
        type: "setPopupEnabled",
        payload: { popupEnabled: true },
      });
    }

    // TODO: replace with toast notification
    console.log("Popup mode enabled - click on map to add obstacle");
  };

  /**
   * @param event - The change event from the file input
   * @description Handles the upload of a CSV file containing obstacle data.
   * Parses the CSV, extracts coordinates, queries elevations,
   * and creates obstacle objects to append to the obstacle context.
   */
  const handleUploadCSVObstacles = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // TODO: Disable popups
    const file = event.target.files[0];
    // TODO: replace with toast notification
    console.log("File selected:", file);
    
    if (!file) {
      console.error("No file selected, exiting");
      return;
    }
    
    Papa.parse(file, {
      skipEmptyLines: true,
      // CSV parse complete callback
      complete: (results) => {
        // Build array of 2D coordinates from CSV
        // CSV format: [name, heightAGL, X (Easting), Y (Northing)]
        const coordinates: number[][] = [];
        results.data?.forEach((row: any) => {
          const x_easting = parseFloat(row[2]);
          const y_northing = parseFloat(row[3]);
          
          if (!isNaN(x_easting) && !isNaN(y_northing)) {
            coordinates.push([x_easting, y_northing]);
          } else {
            console.warn(`Row skipped - invalid coordinates:`, { x: x_easting, y: y_northing });
          }
        });

        // CSV format: [name, heightAGL, Longitude, Latitude]
        // Always treat CSV coordinates as WGS84 geographic coordinates
        const multipoint = new Multipoint({
          points: coordinates,
          spatialReference: { wkid: 4326 } // Always WGS84 for input coordinates
        });

        elevationLayer
          ?.queryElevation(multipoint, { noDataValue: null })
          .then((result) => {
            const obstaclesArray = [];
            
            result.geometry.points.forEach((point, index) => {
              const heightSLtoBase = parseFloat(results.data[index][1]);

              // Capture Z value for elevation
              const rawGroundElev = point[2]; 
              const groundElevationMeters = rawGroundElev
                ? (usingMeters ? rawGroundElev : toMeters(rawGroundElev))
                : null;

              const heightAGL_Meters = usingMeters ? heightSLtoBase : toMeters(heightSLtoBase);
              
              // Use original input coordinates, not the result coordinates
              const obs_x = coordinates[index][0]; // Original longitude from CSV
              const obs_y = coordinates[index][1]; // Original latitude from CSV
              
              // Validate coordinates
              if (obs_x === null || obs_x === undefined || isNaN(obs_x) ||
                  obs_y === null || obs_y === undefined || isNaN(obs_y)) {
                console.error(`Skipping obstacle ${index} due to invalid coordinates.`, { x: obs_x, y: obs_y });
                return; // Skip this obstacle
              }
              
              // Create Point geometry as WGS84 geographic coordinates
              // Always treat CSV coordinates as longitude/latitude
              const obstacleGeometry = new Point({
                x: obs_x,  // Longitude 
                y: obs_y,  // Latitude
                spatialReference: { wkid: 4326 }  // Always WGS84
              });

              const obs: ObstacleType = {
                obsName: results.data[index][0],
                uniqueId: getUniqueId(),
                obsHasPenetration: false,
                obsWasAnalyzed: false,
                obsHeightAGL: heightAGL_Meters,
                obsHeightAMSL: groundElevationMeters ? groundElevationMeters + heightAGL_Meters : null,  
                gndElevation: groundElevationMeters,
                x: obs_x,
                y: obs_y,
                collisions: null,
                geometry: obstacleGeometry
              };
              
              obstacleContext?.appendObstacle(obs);
              obstaclesArray.push(obs);
            });

            // Add obstacles to map layers using shared utility and apply renderers
            applyObstacleRenderers(mapContext);
            
            void addNewObstacleToTableAndFeatureLayer(
              obstaclesArray,
              mapContext
            ).catch((error) => {
              console.error("Error adding obstacles to feature layers:", error);
            });
          })
          .catch(function (error) {
            console.error("Elevation query failed:", {
              error,
              message: error?.message,
              details: error?.details,
              stack: error?.stack,
            });
          });
        
        // Reset the file input value so the same file can be uploaded again
        event.target.value = '';
      },
      error: (error) => {
        console.error("CSV parsing failed:", {
          error,
          message: error?.message,
        });
      }
    });
  };

  // #endregion ---------------- Event Handlers --------------------------------

  // #region ----------------------- Render ------------------------------------

  if (hasSelectedObstacle) {
    return <></>;
  }

  return (
    <CalcitePanel id="add-data-panel" collapsible={true} heading="Add Data">
      <StyledCalciteSelect
        id="coordinate-select"
        slot="header-actions-end"
        scale="s"
        onCalciteSelectChange={(e) => setCoordinateType(e.target.value as any)}
      >
        <CalciteOption value="dd">Decimal Degrees (DD)</CalciteOption>
        <CalciteOption value="dms">Degrees Minutes Seconds (DMS)</CalciteOption>

      </StyledCalciteSelect>
      <AddDataContainer>
        <input
          type="file"
          id="files"
          multiple
          onChange={handleUploadCSVObstacles}
          hidden
          accept=".csv"
        />
        <div>
          <CalciteButton
            onClick={() => document.getElementById("files")?.click()}
            icon-start="upload"
            slot="trigger"
            scale="s"
            kind="neutral"
            appearance="outline-fill"
            className="btn"
            disabled={!(mapContext.state.sceneLayerViews.length > 0)}
          >
            Upload CSV
          </CalciteButton>
          <CalciteButton
            className="btn"
            onClick={() => handleDrawPoint()}
            icon-start="crosshair"
            slot="trigger"
            scale="s"
            kind="neutral"
            appearance="outline-fill"
            disabled={!(mapContext.state.sceneLayerViews.length > 0)}
          >
            Draw Point
          </CalciteButton>
        </div>
        <div>
          {coordinateType === "dd" ? (
            <>
              <CalciteInputText
                scale="s"
                placeholder="X Coordinate (Longitude)"
                value={coordinates.x}
                onCalciteInputTextInput={(e) =>
                  handleInputChange("x", e.target.value)
                }
                onKeyDown={handleKeyPress}
              />
              <CalciteInputText
                scale="s"
                placeholder="Y Coordinate (Latitude)"
                value={coordinates.y}
                onCalciteInputTextInput={(e) =>
                  handleInputChange("y", e.target.value)
                }
                onKeyDown={handleKeyPress}
              />
            </>
          ) : (
            <>
              <div>
                <CalciteInputText 
                  scale="s" 
                  placeholder="Degrees" 
                  value={dmsCoordinates.lon.degrees}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lon', 'degrees', e.target.value)}
                />
                <CalciteInputText 
                  scale="s" 
                  placeholder="Minutes" 
                  value={dmsCoordinates.lon.minutes}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lon', 'minutes', e.target.value)}
                />
                <CalciteInputText 
                  scale="s" 
                  placeholder="Seconds" 
                  value={dmsCoordinates.lon.seconds}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lon', 'seconds', e.target.value)}
                />
                <CalciteSelect 
                  scale="s" 
                  width="full"
                  value={dmsCoordinates.lon.direction}
                  onCalciteSelectChange={(e) => handleDMSInputChange('lon', 'direction', e.target.value)}
                >
                  <CalciteOption value="E">E</CalciteOption>
                  <CalciteOption value="W">W</CalciteOption>
                </CalciteSelect>
              </div>
              <div>
                <CalciteInputText 
                  scale="s" 
                  placeholder="Degrees" 
                  value={dmsCoordinates.lat.degrees}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lat', 'degrees', e.target.value)}
                />
                <CalciteInputText 
                  scale="s" 
                  placeholder="Minutes" 
                  value={dmsCoordinates.lat.minutes}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lat', 'minutes', e.target.value)}
                />
                <CalciteInputText 
                  scale="s" 
                  placeholder="Seconds" 
                  value={dmsCoordinates.lat.seconds}
                  onCalciteInputTextInput={(e) => handleDMSInputChange('lat', 'seconds', e.target.value)}
                />
                <CalciteSelect 
                  scale="s" 
                  width="full"
                  value={dmsCoordinates.lat.direction}
                  onCalciteSelectChange={(e) => handleDMSInputChange('lat', 'direction', e.target.value)}
                >
                  <CalciteOption value="N">N</CalciteOption>
                  <CalciteOption value="S">S</CalciteOption>
                </CalciteSelect>
              </div>
            </>
          )}
          <CalciteButton
            id="add-point"
            icon-start="plus"
            slot="trigger"
            scale="s"
            kind="neutral"
            appearance="outline-fill"
            onClick={handleAddPoint}
            disabled={!(mapContext.state.sceneLayerViews.length > 0)}
          >
            Add Point
          </CalciteButton>
        </div>
      </AddDataContainer>
    </CalcitePanel>
  );
  // #endregion -------------------- Render -----------------------------------
};

export default AddData;
