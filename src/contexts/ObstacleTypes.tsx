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
export interface SurfaceResultType {
  surfaceName: string;
  runwayName: string;
  didObstaclePenetrate: boolean;
  obsDeltaZ: number;
  obsOISZ: number | null;
  surfaceLayerName: string;
}

export interface ObstacleType {
  obsName: string;
  uniqueId: string;
  obsHasPenetration: boolean;
  obsWasAnalyzed: boolean;
  obsHeightAGL: number;
  obsHeightAMSL: number;
  gndElevation: number;
  x: number;  // Changed from longitude
  y: number;  // Changed from latitude
  collisions: SurfaceResultType[] | null;
  geometry?: Point; // Store the full Point object with spatial reference
}

//Pseudocode for mapping
/** 
function mapSurfaceResultsToObstacles() {
    const surfaceResults: SurfaceResultType[];
    for each surface returned from the API {
        bool diditpenetrate = deltaz > 0 ? true : false;

        const resultObject: SurfaceResultType = {
            surfaceName: 
            runwayName: 
            didObstaclePenetrate: didItPenetrate,
            obsDeltaZ: 
            obsOISZ: didItPenetrate ? OISZ : null
        };
        surfaceResults.push(resultObject);
    }
}

Then wherever you're mapping the results back into state, you can do something like this:

for each obstacle in state with id that matches id of api result {
    obstacle.obsWasAnalyzed = true;
    obstacle.collisions = surfaceResults;
}
*/