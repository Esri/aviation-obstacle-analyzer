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
import { useState, useEffect, useMemo } from "react";
import {
  CalciteButton,
  CalciteSelect,
  CalciteOption,
  CalciteDropdown,
  CalciteDropdownGroup,
  CalciteDropdownItem,
} from "@esri/calcite-components-react";
import "@esri/calcite-components/dist/components/calcite-select";
import "@esri/calcite-components/dist/components/calcite-option";
import "@esri/calcite-components/dist/components/calcite-dropdown";
import "@esri/calcite-components/dist/components/calcite-dropdown-group";
import "@esri/calcite-components/dist/components/calcite-dropdown-item";
import { useObstacleContext, useMapContext, useAppContext } from "@/contexts";
import { displayMeasurement } from "@/utils/math";
import {
  TableContainer,
  TableCard,
  TableHeader,
  SuccessHeader,
  FailureHeader,
} from "./DetailsCardStyled";

const DetailsCard = () => {
  const { state, setSelected } = useObstacleContext();
  const { usingMeters } = useAppContext();
  const mapContext = useMapContext();

  const [sortMethod, setSortMethod] = useState("Delta Z");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCollision, setSelectedCollision] = useState(null);
  const [sortedCollisions, setSortedCollisions] = useState([]);

  const activeSceneLayerTitle = mapContext.state.activeSceneLayerTitle;
  const unit = usingMeters ? "m" : "ft";
  const AppConfig = (window as any).ObstacleAnalysis;
  const availableSortMethods = AppConfig.SURFACE_SORT_METHODS;

  // Get selected obstacle data
  const selectedObstacleID = state.selectedObstacle;
  const selectedObstacle = selectedObstacleID 
    ? state.obstacles.find((obstacle) => obstacle.uniqueId === selectedObstacleID)
    : null;

  // TODO: flexible support for more sort methods
  useEffect(() => {
    if (!selectedObstacle) {
      setSortedCollisions([]);
      return;
    }
    // Sort collisions by obsDeltaZ in descending order
    const collisions = selectedObstacle.collisions || [];
    const sorted =
      collisions.length === 0
        ? []
        : [...collisions].sort(
            sortMethod === "Delta Z"
              ? (a, b) =>
                  sortOrder === "asc"
                    ? (a.obsDeltaZ ?? 0) - (b.obsDeltaZ ?? 0)
                    : (b.obsDeltaZ ?? 0) - (a.obsDeltaZ ?? 0)
              : (a, b) =>
                  sortOrder === "asc"
                    ? (a.runwayName ?? "").localeCompare(b.runwayName ?? "")
                    : (b.runwayName ?? "").localeCompare(a.runwayName ?? ""),
          );
    setSortedCollisions(sorted);
  }, [sortMethod, sortOrder, selectedObstacle]);

  // Default selection to first collision in list
  useEffect(() => {
    if (sortedCollisions.length > 0) setSelectedCollision(sortedCollisions[0])
  }, [sortedCollisions]);
  
  // Memoize lookup config to avoid repeated searches for a given scene layer
  const sceneLayerConfig = useMemo(() => {
    return AppConfig.arrSceneLayersUserConfig?.find(
      (c: any) => c.title === activeSceneLayerTitle,
    );
  }, [activeSceneLayerTitle, AppConfig.arrSceneLayersUserConfig]);

  // Memoize surface field mapping using lookup config
  const surfaceFieldMapping = useMemo(() => {
    return {
      friendly: sceneLayerConfig?.surfaceFriendlyNameField ?? "surfaceName",
      unique: sceneLayerConfig?.surfaceUnfriendlyNameField ?? "surfaceName",
    };
  }, [sceneLayerConfig]);

  if (!state.selectedObstacle || state.selectedObstacle === null) {
    return null;
  }

  if (!selectedObstacle) {
    return null;
  }

  // Filter and zoom to selectedCollision
  const goToSurface = (collisionSurface: any) => {
    const {groupLayer, surfaceUnfriendlyNameField } = sceneLayerConfig
    groupLayer.layers.forEach((l: any) => {
      l.definitionExpression = `${surfaceUnfriendlyNameField} = '${collisionSurface.surfaceName}'`
    });
  }

  // Get status text with more detail
  const getStatusText = () => {
    if (!selectedObstacle.obsWasAnalyzed) {
      return "Unknown";
    }
    return selectedObstacle.obsHasPenetration
      ? "Penetrates"
      : "Does Not Penetrate";
  };

  // Uses memoized config
  const getFriendlyNameFromLookup = (unfriendlyName: string) => {
    return sceneLayerConfig?.surfaceNameLookup?.[unfriendlyName] ?? unfriendlyName;
  };

  return (
    <TableCard>
      <TableHeader
        as={
          !selectedObstacle.obsHasPenetration && selectedObstacle.obsWasAnalyzed
            ? SuccessHeader
            : selectedObstacle.obsHasPenetration &&
                selectedObstacle.obsWasAnalyzed
              ? FailureHeader
              : TableHeader
        }
      >
        <CalciteButton
          id="details-x-btn"
          kind="neutral"
          appearance="transparent"
          iconStart="x"
          scale="s"
          onClick={() => {
            setSelected(null);
          }}
        ></CalciteButton>
        <h2>{selectedObstacle.obsName}</h2>
        <p>{getStatusText()}</p>
      </TableHeader>
      <TableContainer>
        <table>
          <tbody>
            <tr>
              <th>HeightAGL ({unit})</th>
              <td>
                {selectedObstacle.obsHeightAGL
                  ? displayMeasurement(
                      selectedObstacle.obsHeightAGL,
                      usingMeters,
                    )
                  : "Unknown"}
              </td>
            </tr>
            <tr>
              <th>HeightAMSL ({unit})</th>
              <td>
                {selectedObstacle.obsHeightAMSL
                  ? displayMeasurement(
                      selectedObstacle.obsHeightAMSL,
                      usingMeters,
                    )
                  : "Unknown"}
              </td>
            </tr>
            <tr>
              <th>Ground Elevation ({unit})</th>
              <td>
                {selectedObstacle.gndElevation
                  ? displayMeasurement(
                      selectedObstacle.gndElevation,
                      usingMeters,
                    )
                  : "Unknown"}
              </td>
            </tr>
            <tr>
              <th>Y Coordinate</th>
              <td>
                {selectedObstacle.y !== null && selectedObstacle.y !== undefined
                  ? selectedObstacle.y.toFixed(2)
                  : "Unknown"}
              </td>
            </tr>
            <tr>
              <th>X Coordinate</th>
              <td>
                {selectedObstacle.x !== null && selectedObstacle.x !== undefined
                  ? selectedObstacle.x.toFixed(2)
                  : "Unknown"}
              </td>
            </tr>
          </tbody>
        </table>
      </TableContainer>
      {sortedCollisions.length > 0 && (
        <>
          <TableHeader>
            <div className="row">
              <CalciteSelect
                scale="s"
                onCalciteSelectChange={(event: any) => {
                  setSortMethod(event.target.value);
                }}
              >
                {Object.values(availableSortMethods).map((method: any) => (
                  <CalciteOption key={method.label}>
                    {method.label}
                  </CalciteOption>
                ))}
              </CalciteSelect>

              <CalciteButton
                slot="trigger"
                scale="s"
                iconStart={
                  sortOrder === "asc"
                    ? "sort-ascending-arrow"
                    : "sort-descending-arrow"
                }
                kind="neutral"
                appearance="outline"
                onClick={() => {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              />

              <CalciteDropdown
                scale="s"
                onCalciteDropdownSelect={(event: any) => {
                  const selectedCollisionID = event.target.selectedItems[0].id;
                  const correspondingCollision = sortedCollisions.find(
                    (collision) =>
                      collision.surfaceName === selectedCollisionID,
                  );
                  setSelectedCollision(correspondingCollision);
                  goToSurface(correspondingCollision);
                }}
              >
                <CalciteButton
                  slot="trigger"
                  scale="s"
                  kind="neutral"
                  appearance="outline"
                  style={
                    selectedCollision
                      ? selectedCollision.didObstaclePenetrate
                        ? {
                            "--calcite-button-background-color":
                              "var(--fail-indicator-color)",
                            "--calcite-button-text-color": "var(--text-color)",
                          }
                        : {
                            "--calcite-button-background-color":
                              "var(--pass-indicator-color)",
                            "--calcite-button-text-color": "var(--text-color)",
                          }
                      : undefined
                  }
                >
                  {getFriendlyNameFromLookup(
                    selectedCollision?.[surfaceFieldMapping.unique] ??
                      selectedCollision?.surfaceName,
                  ) || "Select Surface"}
                </CalciteButton>
                <CalciteDropdownGroup>
                  {sortedCollisions.map((collision, idx) => {
                    const surfaceName = collision.surfaceName;
                    const unfriendlyName =
                      collision[surfaceFieldMapping.unique] ?? surfaceName;
                    const uniqueKey = `${surfaceName}-${idx}`;
                    const friendlyName =
                      getFriendlyNameFromLookup(unfriendlyName);
                    return (
                      <CalciteDropdownItem
                        key={uniqueKey}
                        id={surfaceName}
                        label={friendlyName}
                        style={
                          collision.didObstaclePenetrate
                            ? {
                                background: "var(--fail-indicator-color)",
                                "--calcite-dropdown-item-text-color":
                                  "var(--text-color)",
                              }
                            : {
                                background: "var(--pass-indicator-color)",
                                "--calcite-dropdown-item-text-color":
                                  "var(--text-color)",
                              }
                        }
                      >
                        {friendlyName}
                      </CalciteDropdownItem>
                    );
                  })}
                </CalciteDropdownGroup>
              </CalciteDropdown>
            </div>
          </TableHeader>
          {selectedCollision && (
            <TableContainer>
              <table>
                <tbody>
                  <tr>
                    <th>Surface Name</th>
                    <td>{selectedCollision.surfaceName}</td>
                  </tr>
                  <tr>
                    <th>Runway Name</th>
                    <td>{selectedCollision.runwayName}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      {selectedCollision.didObstaclePenetrate
                        ? "Penetrates"
                        : "Does not penetrate"}
                    </td>
                  </tr>
                  <tr>
                    <th>Delta Z ({unit})</th>
                    <td>
                      {selectedCollision.obsDeltaZ !== undefined
                        ? displayMeasurement(
                            selectedCollision.obsDeltaZ,
                            usingMeters,
                          )
                        : "Unknown"}
                    </td>
                  </tr>
                  <tr>
                    <th>OISZ ({unit})</th>
                    <td>
                      {selectedCollision.obsOISZ !== null &&
                      selectedCollision.obsOISZ !== undefined
                        ? displayMeasurement(
                            selectedCollision.obsOISZ,
                            usingMeters,
                          )
                        : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableContainer>
          )}
        </>
      )}
    </TableCard>
  );
};

export default DetailsCard;
