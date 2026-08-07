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
import "@esri/calcite-components/dist/components/calcite-button";

import { CalciteButton } from "@esri/calcite-components-react";
import { useObstacleContext } from "@/contexts/ObstacleContext";
import { exportFeaturesToXLSX } from "@/utils/exportExcel";
import { useAppContext } from "@/contexts/AppContext";

const ExportObstacles = () => {
  const obstacleContext = useObstacleContext();
  const { usingMeters } = useAppContext();
  const state = obstacleContext?.state;

    /**
     * @description
     * Triggers the export of the latest evaluated obstacles to an Excel file.
     * Formats the filename with today's date, gathers the latest obstacle data,
     * and calls the export utility to generate and download the XLSX file.
     */
    const handleExportObstacles = () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const filename = `obstacle_evaluation_results_${dateStr}.xlsx`;
      exportFeaturesToXLSX(
        state.obstacles,
        filename,
        {
          collisionsKey: "collisions",
          nameKey: "Name",
          indexColumns: {
            includeCollisionCount: true
          },
        },
        usingMeters
      );
    };

  return (
      <CalciteButton
        round
        id="calcite-export-obstacles-xlsx-button"
        onClick={handleExportObstacles}
        disabled={!state.obstacles || state.obstacles.length === 0}
        kind="brand"
        appearance="outline"
        iconStart="export"
        scale="s"
      >
        Export
      </CalciteButton>
  );
};

export default ExportObstacles;
