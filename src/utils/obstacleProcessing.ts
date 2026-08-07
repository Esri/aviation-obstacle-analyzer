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
import { ObstacleType, SurfaceResultType } from "@/contexts/ObstacleTypes";
import { toMeters } from "@/utils/math";

export interface GPResult {
  NAME: string;
  DESCRIP: string;
  RWYDESG: string;
  Delta_Z: number;
  OIS_Z: number;
  OISDataset: string;
}

/**
 * Groups GP results by obstacle uniqueId
 */
export function groupResultsByObstacle(
  features: any[]
): Record<string, GPResult[]> {
  const grouped: Record<string, GPResult[]> = {};

  features.forEach((feature) => {
    const attrs = feature.attributes;
    const uniqueId = attrs.NAME;

    if (!grouped[uniqueId]) {
      grouped[uniqueId] = [];
    }

    grouped[uniqueId].push({
      NAME: attrs.NAME,
      DESCRIP: attrs.DESCRIP,
      RWYDESG: attrs.RWYDESG,
      Delta_Z: attrs.Delta_Z,
      OIS_Z: attrs.OIS_Z,
      OISDataset: attrs.OISDataset,
    });
  });

  return grouped;
}

/**
 * Converts GP results to surface collision format
 */
export function convertToSurfaceCollisions(
  gpResults: GPResult[]
): SurfaceResultType[] {
  console.log("convertToSurfaceCollisions", gpResults);
  // TODO: Update OIS Layer units
  return gpResults.map((result) => ({
    surfaceName: result.DESCRIP,
    runwayName: result.RWYDESG,
    didObstaclePenetrate: result.Delta_Z > 0,
    obsDeltaZ: toMeters(result.Delta_Z), // GP returns feet; convert to meters for display
    obsOISZ: toMeters(result.OIS_Z),     // GP returns feet; convert to meters for display
    surfaceLayerName: result.OISDataset,
  }));
}

/**
 * Finds the result with the highest Delta_Z (worst penetration)
 */
export function findCriticalPenetration(gpResults: GPResult[]): GPResult {
  return gpResults.reduce((max, current) =>
    current.Delta_Z > max.Delta_Z ? current : max
  );
}

/**
 * Updates obstacles with evaluation results
 */
export async function updateObstaclesWithResults(
  obstacles: ObstacleType[],
  groupedResults: Record<string, GPResult[]>
): Promise<ObstacleType[]> {
  return obstacles.map((obs) => {
    // if (obs.obsWasAnalyzed) {
    //   return obs;
    // }

    const results = groupedResults[obs.uniqueId];

    if (!results || results.length === 0) {
      // No results - mark as analyzed but no penetration
      return {
        ...obs,
        obsWasAnalyzed: true,
        obsHasPenetration: false,
        collisions: [],
      };
    }

    // Find critical penetration
    const criticalResult = findCriticalPenetration(results);
    const collisions = convertToSurfaceCollisions(results);

    // Keep all height values in METERS (internal units)
    return {
      ...obs,
      obsWasAnalyzed: true,
      obsHasPenetration: criticalResult.Delta_Z > 0,
      collisions,
      // Heights remain in meters (no conversion!)
      gndElevation: obs.gndElevation,      // Already in meters
      obsHeightAGL: obs.obsHeightAGL,      // Already in meters  
      obsHeightAMSL: obs.obsHeightAMSL,    // Already in meters
    };
  });
}
