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
import {useState, useEffect} from "react";
import { useObstacleContext } from "@/contexts/ObstacleContext";
import TableRow from "@/components/ObstacleTable/TableRow";
import {
  TableCard,
  TableHeader,
  TableContainer,
} from "@/components/ObstacleTable/ObstacleTableStyled";
import EvaluateData from "@/components/EvaluateObstacles/EvaluateData";
import ExportObstacles from "@/components/EvaluateObstacles/ExportObstacles";
import ClearData from "@/components/EvaluateObstacles/ClearData";
import ResetScene from "@/components/EvaluateObstacles/ResetScene";

const ObstacleTable = () => {
  // Remove optional chaining from useObstacleContext call
  const obstacleContext = useObstacleContext();
  const state = obstacleContext?.state;
  const hasSelectedObstacle = state.selectedObstacle !== null;
  // const dispatch = obstacleContext?.dispatch;

  const [pentCount, setPentCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [naCount, setNaCount] = useState(0);

  useEffect(() => {
    // Calculate counts whenever obstacles change
    const pent = state?.obstacles?.filter((obs) => obs.obsWasAnalyzed === true && obs.obsHasPenetration === true).length || 0;
    const success = state?.obstacles?.filter(
      (obs) => obs.obsWasAnalyzed === true && obs.obsHasPenetration === false
    ).length || 0;
    const na = state?.obstacles?.filter((obs) => obs.obsWasAnalyzed === false).length || 0;

    setPentCount(pent);
    setSuccessCount(success);
    setNaCount(na);
  }, [state?.obstacles]);

  if (
    !state ||
    !state.obstacles ||
    state.obstacles.length === 0 ||
    hasSelectedObstacle
  ) {
    return <></>;
  }
  // log on render for debugging

  return (
    <TableCard>
      <TableHeader>
        <div className="row">
          <h2>Obstacle Table</h2>
          <ExportObstacles />
          <ClearData />
          <EvaluateData />
        </div>
        <p>
          {pentCount !== 0 && (
            <span id="pentCount">Penetrating Obstacles: {pentCount} </span>
          )}
          {(successCount !== 0 || naCount !== 0) && pentCount !== 0 && (
            <span> | </span>
          )}
          {successCount !== 0 && (
            <span id="successCount">
              Non-Penetrating Obstacles: {successCount}{" "}
            </span>
          )}
          {successCount !== 0 ||
            (pentCount !== 0 && naCount !== 0 && <span> | </span>)}
          {naCount !== 0 && (
            <span id="naCount">Awaiting Evaluation: {naCount} </span>
          )}
        </p>

      </TableHeader>
      <TableContainer>
        <table>
          <thead>
            <tr>
              <th>
                Name
                {/* <CalciteButton
                  kind="brand"
                  appearance="transparent"
                  iconStart="question"
                  scale="s"
                  title="Obstacle Name"
                ></CalciteButton> */}
              </th>
              <th>
                Status{" "}
                {/* <CalciteButton
                  kind="brand"
                  appearance="transparent"
                  iconStart="question"
                  scale="s"
                  title="Obstacle Name"
                ></CalciteButton> */}
              </th>
              {/* <th>Name</th>
            <th>Height (m)</th>
            <th>Lat</th>
            <th>Lon</th>
            <th>Status</th>*/}
              <th className="no-style"></th>
              <th className="no-style"></th>
              {obstacleContext?.state?.obstacles?.some(
                (o) => o.obsWasAnalyzed,
              ) && (
                <th className="no-style">
                  <ResetScene />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {state.obstacles.map((obs, idx) => (
              <TableRow key={obs.uniqueId || idx} obstacle={obs}></TableRow>
            ))}
          </tbody>
        </table>
      </TableContainer>
    </TableCard>
  );
};

export default ObstacleTable;
