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
import { useObstacleContext, useMapContext } from "@/contexts";
import { StyledTableRow, SuccessRow, FailureRow } from "./TableRowStyled";
import { ObstacleType } from "@/contexts/ObstacleTypes";
import { getSurfaceCode } from "@/utils/mapLayerUpdates";
import Point from "@arcgis/core/geometry/Point.js";

interface TableRowProps {
  obstacle: ObstacleType;
}

const TableRow = ({ obstacle }: TableRowProps) => {
  const obstaclesContext = useObstacleContext?.();
  const mapContext = useMapContext?.();
  const setSelected = obstaclesContext?.setSelected;
  const AppConfig = (window as any).ObstacleAnalysis;

  const displayObstacleResults = (obs: ObstacleType) => {    
    const oisMap = mapContext.state.mapView.map;

    // Use the stored geometry if available, otherwise create a Point
    const targetGeometry = obs.geometry || new Point({
      x: obs.x,
      y: obs.y,
      spatialReference: mapContext.state.mapView.spatialReference
    });

    mapContext.state.mapView.goTo({
      target: targetGeometry,
      zoom: 12
    });

    // Display the obstruction point and pillar
    const uniqId = obs['uniqueId'];

    const markerLyrs = mapContext.getLayer(AppConfig.LAYER_NAMES.GROUP_LAYER_MARKERS);
    markerLyrs.forEach((l) => {
      if (l.type === "feature") {
        l.definitionExpression = `uniqueid = '${uniqId}'`;
      }
    });

    const oisLyrName = AppConfig.arrSceneLayersUserConfig[0].title;
    const oisLayer = oisMap.layers.find(l => l.title === oisLyrName);

    if (oisLayer) {
      if (!obs.collisions || obs.collisions.length === 0  || 
    !obs.collisions.some(c => c.didObstaclePenetrate)) {
        // Clear all surfaces if no collisions
        oisLayer.allLayers.items.forEach((l) => {
          l.visible = false;
        });
      } else {
        // Display all intersected surfaces
        const visibleSurfaces: Record<string, string[]> = {};
        const {
          surfaceTypeLookup,
          zoneUseLookup,
          surfaceUnfriendlyNameField,
          subgroupTitle,
          subDefinitionExpression,
        } = AppConfig.arrSceneLayersUserConfig[0];

        obs.collisions.filter(c => c.didObstaclePenetrate).forEach((c) => {
          const oid = c.surfaceName;

          // Build list of visible codes
          if (visibleSurfaces.hasOwnProperty(oisLyrName)) {
            const vals = visibleSurfaces[oisLyrName];
            vals.push(oid);
            visibleSurfaces[oisLyrName] = vals;
          } else {
            visibleSurfaces[oisLyrName] = [oid];
          }
        });

        // Filter to show only intersected surfaces
        for (const [k, v] of Object.entries(visibleSurfaces)) {
          const oisLayer = oisMap.layers.find((l) => l.title === k);
          if (oisLayer) {
            oisLayer.allLayers.items.forEach((l) => {
              const layerIndex = getSurfaceCode(l, zoneUseLookup);

              // Check if sublayer contains intersected surfaces
              let hasMatchingSurface = false;
              if (layerIndex && surfaceTypeLookup[layerIndex]) {
                const layerSurfaces = surfaceTypeLookup[layerIndex].map(
                  (surface) => surface.descrip,
                );
                hasMatchingSurface = layerSurfaces.some((surface) =>
                  v.includes(surface),
                );
              }

              // TODO: Integrate subgroups in zoneUseLookup config in the future
              if (layerIndex === null && l.title === subgroupTitle) {
                const subgroupCodes = subDefinitionExpression.match(/\d+/g) || [];
                subgroupCodes.forEach(code => {
                  const layerSurfaces = surfaceTypeLookup[code].map(
                    (surface) => surface.descrip,
                  );
                  hasMatchingSurface = layerSurfaces.some((surface) =>
                    v.includes(surface),
                  );
                  if (hasMatchingSurface) {
                    return;
                  }
                });
              }

              // Set visibility and definition expression
              l.visible = hasMatchingSurface;
              l.definitionExpression = `${surfaceUnfriendlyNameField} IN (${v.map((val) => `'${val}'`).join(", ")})`;
            });
          }
        }
      }
    }
  }

  return (
    <StyledTableRow
      as={
        obstacle.obsHasPenetration && obstacle.obsWasAnalyzed
          ? FailureRow
          : !obstacle.obsHasPenetration && obstacle.obsWasAnalyzed
            ? SuccessRow
            : StyledTableRow
      }
    >
      <td>{obstacle.obsName}</td>
      <td className="status-cell">
        {obstacle.obsWasAnalyzed
          ? obstacle.obsHasPenetration === true
            ? "Penetrates"
            : "Does Not Penetrate"
          : "Unknown"}
      </td>
      <td>
        <button
          onClick={() => {
            if (mapContext?.state?.mapView) {
              // Use the stored geometry if available, otherwise create a Point
              const targetGeometry =
                obstacle.geometry ||
                new Point({
                  x: obstacle.x,
                  y: obstacle.y,
                  spatialReference: mapContext.state.mapView.spatialReference,
                });

              mapContext.state.mapView.goTo({
                target: targetGeometry,
                zoom: 15,
              });
            }
          }}
        >
          Zoom to
        </button>
      </td>
      <td>
        <button
          onClick={() => {
            if (setSelected) {
              setSelected(obstacle.uniqueId);
            }
          }}
        >
          Details
        </button>
      </td>
      {obstacle.obsWasAnalyzed && (
        <td>
          <button
            onClick={() => displayObstacleResults(obstacle)}
          >
            View collisions
          </button>
        </td>
      )}
    </StyledTableRow>
  );
};

export default TableRow;
