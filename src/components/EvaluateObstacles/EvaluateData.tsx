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
import { useState, useEffect, useMemo } from "react";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

// #endregion ------------------- React ---------------------------------

// #region ------------ 3rd-Party Components / Libraries -----------------------
//JSAPI
import * as geoprocessor from "@arcgis/core/rest/geoprocessor.js";
import Graphic from "@arcgis/core/Graphic.js";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
//Calcite
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-select";
import "@esri/calcite-components/dist/components/calcite-option";

import {
  CalciteButton,
  CalciteSelect,
  CalciteOption,
} from "@esri/calcite-components-react";
// #endregion --------- 3rd-Party Components / Libraries -----------------------

// #region -------------- Custom Components / Utilities ------------------------

import { toFeet, toMeters } from "@/utils/math";
import { useMapContext, useObstacleContext } from "@/contexts";
import {
  groupResultsByObstacle,
  updateObstaclesWithResults,
  findCriticalPenetration,
  GPResult,
} from "@/utils/obstacleProcessing";
import {
  getSurfaceCode,
  updateObstacleFeatureLayers,
} from "@/utils/mapLayerUpdates";
import {
  DropdownContainer,
  EvaluateDataContainer,
  EvaluationWarning,
} from "./EvaluateDataStyled";
// #endregion ----------- Custom Components / Utilities ------------------------

// #region ------------------------ Resources ----------------------------------
// #endregion --------------------- Resources ----------------------------------
// #endregion ====================== IMPORTS ===================================

// #region ======================== CONSTANTS ==================================

// #endregion ===================== CONSTANTS ==================================

// #region =================== EXPORTED COMPONENT ==============================
const EvaluateData = () => {
  // #region ------------------ Hooks (Resources) ------------------------------
  const obstacleContext = useObstacleContext();
  const state = obstacleContext?.state;
  const setObstacles = obstacleContext?.setObstacles;
  const mapContext = useMapContext();
  const mapView = mapContext.state?.mapView;

  // TODO: test with multiple scene layers
  const AppConfig = (window as any).ObstacleAnalysis;

  // Create dynamic evaluation types based on available surface states
  const createEvaluationTypes = () => {
    const surfaceStates = (Object.values(AppConfig.RUNWAY_STATE) || []) as string[];
    const evaluationTypes = { ALL: "All runways" as const };
    
    // Add each surface state as an evaluation option with formatted label
    surfaceStates.forEach(state => {
      const label = `${state.charAt(0).toUpperCase() + state.slice(1).toLowerCase()} runways`;
      evaluationTypes[state] = label;
    });
    
    return evaluationTypes;
  };

  const EvaluationTypes = createEvaluationTypes();
  type EvaluationType = keyof typeof EvaluationTypes;

  // #endregion --------------- Hooks (Resources) ------------------------------

  // #region -------------------- Hooks (State) --------------------------------
  const [evalInProgress, setEvalInProgress] = useState(false);
  const [evalType, setEvalType] = useState<EvaluationType>("ALL");
  const [selectedVisibleLayers, setSelectedVisibleLayers] = useState<string[]>([]);
  // #endregion ----------------- Hooks (State) --------------------------------

  // #region ----------------- Hooks (Memoization) -----------------------------
  const groupLayerTitles = useMemo(() => {
    return mapContext.state?.sceneLayerViews?.map((layer) => layer.groupLayer?.title).filter(Boolean) || [];
  }, [mapContext.state?.sceneLayerViews]);

  const visibleSublayers = useMemo(() => {
    return selectedVisibleLayers.filter(title => !groupLayerTitles.includes(title));
  }, [selectedVisibleLayers, groupLayerTitles]);

  // Only consider sublayers for visibility
  const hasSelectedVisibleLayers = useMemo(() => {
    return visibleSublayers.length > 0;
  }, [visibleSublayers]);

  // #endregion -------------- Hooks (Memoization) -----------------------------

  // #region -------------------- Hooks (Other) --------------------------------
  /**
   * @description Ensure loader is turned off when obstacles are updated (e.g., after evaluation completes).
   */
  useEffect(() => {
    if (evalInProgress) {
      setEvalInProgress(false);
    }
  }, [state.obstacles]);

  /**
   * @description Update selectedVisibleLayers when layers change visibility
   */
   useEffect(() => {
    if (!mapView) return;
    const handles: any[] = [];
    
    // Create watcher for group layer visibility
    const createGroupWatcher = (group: any, handles: any[]) => {
      const groupHandle = reactiveUtils.watch(() => group.visible, (visible) => {
        const allLayers = [group, ...group.allLayers.items];
        const allLayerTitles = allLayers.map(layer => layer.title);
        
        if (visible) {
          // Include group and all currently visible sublayers
          const visibleLayerTitles = allLayers
            .filter(layer => layer.visible)
            .map(layer => layer.title);
          setSelectedVisibleLayers(visibleLayerTitles);
        } else {
          // Remove group and all sublayers
          setSelectedVisibleLayers((prev) => 
            prev.filter(title => !allLayerTitles.includes(title))
          );
        }
      });
      handles.push(groupHandle);
    };

    // Create watcher for child layer visibility
    const createChildWatcher = (group: any, child: any, handles: any[]) => {
      const childHandle = reactiveUtils.watch(() => child.visible, (visible) => {
        if (!group.visible) return;
        if (visible) {
          // Add single layer if not already present
          setSelectedVisibleLayers((prev) => 
            prev.includes(child.title) ? prev : [...prev, child.title]
          );
        } else {
          // Remove single layer from selection
          setSelectedVisibleLayers((prev) =>
            prev.filter(title => title !== child.title)
          );
        }
      });
      handles.push(childHandle);
    };

    mapView.when(() => {
      // Filter for scene layers added from config
      const sceneLayerViews = mapContext.state?.sceneLayerViews;
      if (!sceneLayerViews || sceneLayerViews.length === 0) return;

      // Initialize visible layers on first load
      const configGroupLayers = sceneLayerViews.map((layer) => layer.groupLayer);
      const initialVisibleLayers = mapView.map.allLayers.items
        .filter((layer) =>
          configGroupLayers.some(
            (group) =>
              layer.visible &&
              (group === layer ||
                (group.visible && group.allLayers.items.includes(layer))),
          ),
        )
        .map((layer) => layer.title);
      setSelectedVisibleLayers(initialVisibleLayers);

      // Set up watchers for layer visibility changes
      configGroupLayers.forEach((group) => {
        createGroupWatcher(group, handles);
        group.allLayers.items.forEach((child) => {
          createChildWatcher(group, child, handles);
        });
      });
    });

    // Cleanup function
    return () => {
      handles.forEach(handle => handle.remove());
    };
  }, [mapView, mapContext.state?.sceneLayerViews]);

  // Add a useEffect that watches for evalType changes and applies filters
  useEffect(() => {
    if (!mapContext.state?.sceneLayerViews) return;

    // Apply definition expressions to all scene layers based on selected runway type
    mapContext.state.sceneLayerViews.forEach((config: any) => {
      const groupLayer = config.groupLayer;
      const { surfaceStateField, surfaceTypeField, zoneUseLookup } = config;
      
      if (!groupLayer || !surfaceStateField) return;

      groupLayer.allLayers.forEach((sublayer: any) => {
        const layerIndex = getSurfaceCode(sublayer, zoneUseLookup);

        // Build definition expression based on selected evaluation type
        let definitionExpression =
          (layerIndex === null)
            ? config.subDefinitionExpression
            : `${surfaceTypeField} IN ('${layerIndex}', '') OR ${surfaceTypeField} IS NULL`;

        // Filter by runway state using the raw field values from RUNWAY_STATE config
        if (evalType !== "ALL") {
          // RUNWAY_STATE maps raw field values (keys) to coded evalType values
          // e.g. { "Existing Runway": "EXISTING", "Future Planned Runway": "FUTURE" }
          const rawValues = Object.entries(AppConfig.RUNWAY_STATE)
            .filter(([, coded]) => coded === evalType)
            .map(([raw]) => `'${raw}'`);

          // Also include the coded value itself in case the layer stores it directly
          rawValues.push(`'${evalType}'`);

          const runwayFilter = `${surfaceStateField} IN (${rawValues.join(", ")})`;
          definitionExpression = `(${definitionExpression}) AND (${runwayFilter})`;
        }

        // Set definition expression on sublayer to filter features
        sublayer.definitionExpression = definitionExpression;
      });
    });

  }, [evalType, mapContext.state?.sceneLayerViews]); // Re-run when evalType changes

  // #endregion ----------------- Hooks (Other) --------------------------------

  // #region --------- Short-Circuit (Empty/Invalid State) ---------------------
  // #endregion ------ Short-Circuit (Empty/Invalid State) ---------------------

  // #region ---------------- Supporting Functions -----------------------------

  /**
   * @description Retrieves all OIS scene layers from the map context.
   * @returns {SceneLayerView[]|null} All scene layers configured in the application or null
   */
  const getSceneLayerViews = () => {
    const sceneLayerViews = mapContext.state?.sceneLayerViews;
    // No scene layer views available in context
    if (!sceneLayerViews || sceneLayerViews.length === 0) {
      return null;
    }
    return sceneLayerViews;
  };

  /**
   * @description Cleans up the 'pending' marker created when a user draws a point.
   */
  const clearPendingMarker = () => {
    const obstacleGroupLayer = mapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
    const pendingMarkerLayer = obstacleGroupLayer?.find(
      (layer) => layer.title === AppConfig.LAYER_NAMES.PENDING_MARKER,
    );
    if (pendingMarkerLayer) {
      pendingMarkerLayer.removeAll(); //remove pending marker
    }
  };

  /**
   * @description Returns visible zoneuse codes.
   */
  const getVisibleSurfaces = (
    zoneUseLookup: any,
    subgroupTitle: string,
    subDefinitionExpression: string,
  ) => {
    if (visibleSublayers.length === 0) return [];

    // TODO: Integrate subgroups in zoneUseLookup config in the future
    let subgroupCodes = [];
    if (visibleSublayers.includes(subgroupTitle)) {
      subgroupCodes = subDefinitionExpression.match(/\d+/g);
    }

    const visibleSurfaces = Object.entries(zoneUseLookup)
      .filter(([_, value]) => visibleSublayers.includes(value as string))
      .map(([key, _]) => key);
    visibleSurfaces.push(...subgroupCodes);

    return visibleSurfaces;
  };

  /**
   * @description Filters grouped GP results based on visible layers and selected surface states.
   */
  const filterGroupedResults = (
    groupedResults: Record<string, GPResult[]>,
    sceneLayerConfig: any,
    evaluationType: EvaluationType,
  ): Record<string, GPResult[]> => {

    // Skip filtering for no groupedResults
    if (Object.keys(groupedResults).length === 0) {
      return groupedResults;
    }

    const {
      surfaceTypeLookup,
      zoneUseLookup,
      subgroupTitle,
      subDefinitionExpression,
    } = sceneLayerConfig || {};

    // Unable to filter results against sceneLayerConfig
    if (!surfaceTypeLookup || !zoneUseLookup) {
      return groupedResults;
    }

    const visibleSurfaces = getVisibleSurfaces(
      zoneUseLookup,
      subgroupTitle,
      subDefinitionExpression,
    );
    const totalNumSurfaceTypes = Object.keys(zoneUseLookup).length;

    // Set filtering logic
    const hasVisibleFilter = visibleSurfaces.length > 0 && visibleSurfaces.length < totalNumSurfaceTypes;
    const hasStateFilter = evaluationType !== "ALL";

    // Skip filtering if no filters applied
    if (!hasVisibleFilter && !hasStateFilter) {
      return groupedResults;
    }

    // Convert arrays to Sets for efficient lookups
    const visibleSurfaceSet = hasVisibleFilter ? new Set(visibleSurfaces) : null;

    // Get relevant surface descriptions based on filtering
    const filteredDescriptions = new Set(
      Object.entries(surfaceTypeLookup)
        .filter(([key]) => !hasVisibleFilter || visibleSurfaceSet.has(key))
        .flatMap(([_, zoneUseLayer]: [string, any[]]) =>
          zoneUseLayer
            .filter((surface) => 
              !hasStateFilter || surface.runwaystate === evaluationType)
            .map((surface) => surface.descrip),
        ),
    );

    // Filter groupedResults against pre-filtered surface descriptions
    const filteredGroupedResults = (filteredDescriptions.size === 0) ?
      // Handle case for no filtered descriptions
      Object.fromEntries(
        Object.keys(groupedResults).map(key => [key, []])
      ) :
      Object.fromEntries(
        Object.entries(groupedResults).map(([key, results]) => [
          key,
          results.filter((result) => filteredDescriptions.has(result.DESCRIP)),
        ]),
      );

    return filteredGroupedResults;
  };

  /**
   * @description Processes results from geoprocessing and updates obstacle context
   */
  const processEvaluationResults = async (
    features: Graphic[],
    sceneLayerTitle: string,
    evaluationType: EvaluationType,
  ) => {
    const groupedResults = groupResultsByObstacle(features);

    // Get scene layer config for lookups
    const sceneLayerConfig = AppConfig?.arrSceneLayersUserConfig?.find(
      (config: any) => config.title === sceneLayerTitle,
    );

    const finalGroupedResults = filterGroupedResults(
      groupedResults,
      sceneLayerConfig,
      evaluationType,
    );

    // Update obstacles in state
    const updatedObstacles = await updateObstaclesWithResults(
      state.obstacles,
      finalGroupedResults,
    );

    // Update map layers for each obstacle that has results
    Object.entries(finalGroupedResults).forEach(([uniqueId, results]) => {
      // CHANGED: Check if obstacle has any penetrating collisions
      const hasPenetration = results.some(r => r.Delta_Z > 0);
      
      if (hasPenetration) {
        // Has penetration - use critical result
        const criticalResult = findCriticalPenetration(results);
        // TODO: Update OIS Layer units
        updateObstacleFeatureLayers(
          uniqueId,
          toMeters(criticalResult.Delta_Z), // GP returns feet; convert to meters for pillar rendering
          true,
          criticalResult,
          sceneLayerTitle,
          mapContext,
        );
      } else {
        // No penetration - still update to mark as non-penetrating (green)
        updateObstacleFeatureLayers(
          uniqueId,
          -1, // Negative value indicates no penetration (green)
          false,
          results.length > 0 ? results[0] : null,
          sceneLayerTitle,
          mapContext,
        );
      }
    });

    // Updated obstacles after evaluation
    setObstacles(updatedObstacles);
  };

  /**
   * @description Submits a geoprocessing job to evaluate obstacles against OIS surfaces.
   */
  const submitJobEvaluateObstacle = (
    objParams,
    gpServiceUrl,
    sceneLayerTitle,
    evaluationType: EvaluationType,
  ) => {
    const requestOptions = {
      authMode: "no-prompt" as "no-prompt",
    };

    console.log("Submitting GP Job with params:", objParams);
    console.log("GP Service URL:", gpServiceUrl);

    geoprocessor
      .submitJob(gpServiceUrl, objParams, undefined, requestOptions)
      .then((jobInfo) => {
        let iJobIteration = 1;

        jobInfo
          .waitForJobCompletion({
            statusCallback: (callbackObj) => {
              console.log(
                iJobIteration +
                ", " +
                callbackObj.jobStatus +
                ", " +
                callbackObj.jobId,
              );
              iJobIteration++;
            },
          })
          .then((jobInfoResult) => {
            jobInfoResult
              .fetchResultData("out_feature_class")
              .then(async (gpResult) => {
                if (gpResult.value instanceof FeatureSet) {
                  console.log(
                    "gpResult.value.features",
                    gpResult.value.features,
                  );
                  await processEvaluationResults(
                    gpResult.value.features,
                    sceneLayerTitle,
                    evaluationType,
                  );
                }
                setEvalInProgress(false);
              });
          })
          .catch((err) => {
            console.error("GP job failed:", err);
            setEvalInProgress(false);
            // TODO: Show error alert
          });
      })
      .catch((err) => {
        console.error("GP submission failed:", err);
        setEvalInProgress(false);
        // TODO: Show error alert
      });
  };

  // #endregion ------------- Supporting Functions -----------------------------

  // #region ------------------- Event Handlers --------------------------------

  /**
   * Fetches the ArcGIS Server version hosting the GP tool (cached on AppConfig).
   * Enterprise <= 11.1 uses raw Z (feet) with no VCS transform.
   * Enterprise > 11.1 performs VCS transformation on input Z.
   */
  const getGPServerVersion = async (): Promise<number> => {
    if (AppConfig._gpServerVersion != null) return AppConfig._gpServerVersion;

    try {
      const gpUrl: string = AppConfig.gpUrl;
      const restIndex = gpUrl.indexOf("/rest/");
      if (restIndex === -1) return 0;
      const infoUrl = `${gpUrl.substring(0, restIndex + 6)}info?f=json`;
      const response = await fetch(infoUrl, { credentials: "same-origin" });
      const data = await response.json();
      const version = parseFloat(data.currentVersion) || 0;
      AppConfig._gpServerVersion = version;
      console.log("GP server version:", version);
      return version;
    } catch (e) {
      console.warn("Could not determine GP server version, defaulting to legacy:", e);
      AppConfig._gpServerVersion = 0;
      return 0;
    }
  };

  /**
   * @description Evaluates obstacles against the given OIS scene layer.
   * Retrieves the OIS scene layer + relevant features and submits a job to evaluate the obstacles.
   */
  const evaluateLayer = async (
    AppConfig,
    inOisSceneLayer,
    evaluationType: EvaluationType,
  ) => {
    setEvalInProgress(true);
    clearPendingMarker();

    const associatedMultipatchLayerUrl =
      inOisSceneLayer?.associatedLayer?.toJSON()?.url;
    const userPointsLayer = mapContext.getLayer(
      AppConfig.LAYER_NAMES.USER_INPUT_OBSTACLE_POINTS,
    );
    
    // Use detected spatial reference from AppConfig
    const spatialRef = AppConfig.SPATIAL_REFERENCE || 
                       mapContext?.state?.spatialReference ||
                       mapContext?.state?.mapView?.spatialReference;

    if (!spatialRef) {
      console.error("No spatial reference available for GP service");
      setEvalInProgress(false);
      return;
    }

    console.log("Using spatial reference for GP service:", spatialRef);

    // Determine GP server behavior based on version
    const gpVersion = await getGPServerVersion();
    const useLegacyFeetConversion = gpVersion <= 11.1;

    const queryNewPoints = userPointsLayer.createQuery();
    queryNewPoints.where = `ground_elev IS NOT NULL`;
    queryNewPoints.outFields = ["objectid", "name", "ground_elev"];
    queryNewPoints.returnZ = true;
    queryNewPoints.returnGeometry = true;
    // Always use WGS84 for GP service - matches demo app and GP service expectation
    queryNewPoints.outSpatialReference = {
      latestWkid: 4326,
      wkid: 4326,
      vcsWkid: 105790,
      latestVcsWkid: 3855,
    };

    userPointsLayer
      .queryFeatures(queryNewPoints)
      .then((resultFeatureSet) => {
        console.log(
          "Feature set spatial reference:",
          resultFeatureSet.spatialReference,
        );
        console.log("Feature count:", resultFeatureSet.features.length);
        console.log("Features: ", resultFeatureSet)

        // Log first feature to check Z values
        if (resultFeatureSet.features.length > 0) {
          console.log(
            "Sample feature geometry:",
            resultFeatureSet.features[0].geometry,
          );
        }

        // Enterprise <= 11.1: convert Z from meters to feet (GP uses raw values as feet)
        // Enterprise > 11.1: keep Z in meters (GP transforms via declared VCS)
        if (useLegacyFeetConversion) {
          resultFeatureSet.features.forEach((feature) => {
            const geom = feature.geometry as any;
            if (geom && geom.z != null) {
              geom.z = toFeet(geom.z);
            }
          });
        }

        let objGeoprocessingParams = {
          input_ois_features: {
            url: associatedMultipatchLayerUrl,
          },
          input_obstacle_features: resultFeatureSet,
        };

        submitJobEvaluateObstacle(
          objGeoprocessingParams,
          AppConfig.gpUrl,
          inOisSceneLayer.title,
          evaluationType,
        );
      });
  };
  /**
   * @description Sets up the evaluation of new obstacles
   * It checks if there are obstacles to be analyzed.
   * @returns {boolean} true if evaluation can proceed, otherwise false
   */
  const canEvaluateObstacles = (): boolean => {
    return Boolean(state?.obstacles?.length);
  };

  /**
   * @description Evaluates obstacles against all configured OIS scene layers, regardless of visibility.
   * Checks if the necessary layers are available, and evaluates the obstacles against all specified layers.
   */
  const handleEvaluateAllSceneLayers = (evaluationType: EvaluationType) => {
    if (!canEvaluateObstacles()) return;
    const OisSceneLayerViews = getSceneLayerViews();

    if (!OisSceneLayerViews || OisSceneLayerViews.length === 0) {
      console.log("No OIS scene layers found");
      return;
    }

    for (const objSceneLayerConfig of OisSceneLayerViews) {
      if (objSceneLayerConfig?.sceneView) {
        const layer = objSceneLayerConfig.analysisLayer;
        console.log("Evaluating against layer:", layer);
        evaluateLayer(AppConfig, layer, evaluationType);
      }
    }
  };

  // #endregion ---------------- Event Handlers --------------------------------

  return (
    <EvaluateDataContainer>
      <CalciteButton
        round
        id="calcite-evaluate-button"
        onClick={() => handleEvaluateAllSceneLayers(evalType)}
        loading={evalInProgress}
        disabled={
          obstacleContext?.state?.obstacles?.length === 0 ||
          !hasSelectedVisibleLayers
        }
        kind="brand"
        appearance="outline"
        iconStart="refresh"
        scale="s"
      >
        Evaluate
      </CalciteButton>
      <DropdownContainer>
        <CalciteSelect
          scale="s"
          onCalciteSelectChange={(e) => {
            setEvalType(e.target.value as EvaluationType);
          }}
          style={{ width: "100%" }}
        >
          {Object.entries(EvaluationTypes).map(([value, label]) => (
            <CalciteOption key={value} value={value}>
              {label}
            </CalciteOption>
          ))}
        </CalciteSelect>
        {!hasSelectedVisibleLayers && (
          <EvaluationWarning>
            Please enable at least one layer for evaluation.
          </EvaluationWarning>
        )}
      </DropdownContainer>
    </EvaluateDataContainer>
  );
};

export default EvaluateData;
