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
// #endregion ------------------- React ---------------------------------

// #region ------------ 3rd-Party Components / Libraries -----------------------

//Calcite

import "@esri/calcite-components/dist/components/calcite-button";

import { CalciteButton } from "@esri/calcite-components-react";
// #endregion --------- 3rd-Party Components / Libraries -----------------------

// #region -------------- Custom Components / Utilities ------------------------

import { useMapContext, useObstacleContext } from "@/contexts";
import {
  clearAllObstaclesFromMap
} from "@/utils/graphicEdits";
import { resetResultsInScene } from "@/utils/mapLayerUpdates";

// #endregion ----------- Custom Components / Utilities ------------------------

// #region ------------------------ Resources ----------------------------------
// #endregion --------------------- Resources ----------------------------------
// #endregion ====================== IMPORTS ===================================

const ClearData = () => {
  // #region ------------------ Hooks (Resources) ------------------------------
  const obstacleContext = useObstacleContext();
  const setObstacles = obstacleContext?.setObstacles;
  const mapContext = useMapContext();
  // #endregion --------------- Hooks (Resources) ------------------------------
  return (
    <CalciteButton
      round
      scale="s"
      kind="brand"
      appearance="outline"
      disabled={obstacleContext?.state?.obstacles?.length === 0}
      iconStart="trash"
      id="clear-btn"
      onClick={() => {
        setObstacles([]);
        resetResultsInScene(mapContext);
        clearAllObstaclesFromMap(mapContext);
        if (obstacleContext?.setSelected) {
          obstacleContext.setSelected(null);
        }
      }}
    >
      Clear All
    </CalciteButton>
  );
};

export default ClearData;
