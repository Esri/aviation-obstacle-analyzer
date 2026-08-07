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
import "@esri/calcite-components/dist/components/calcite-action-bar";
import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-label";
import {
  CalciteActionBar,
  CalciteAction,
  CalcitePanel,
} from "@esri/calcite-components-react";
import "@esri/calcite-components/dist/calcite/calcite.css";
import { HeaderRow } from "../App/EvaluateStyled";

import AddData from "@/components/EvaluateObstacles/AddData";
import UnitSwitcher from "@/components/EvaluateObstacles/UnitSwitcher";
import ObstacleTable from "@/components/ObstacleTable/ObstacleTable";
import DetailsCard from "@/components/DetailsCard/DetailsCard";

export default function PanelBar({ selected, setSelected }) {
  const AppConfig = window.ObstacleAnalysis;

  const getPanelContent = (actionId) => {
    switch (actionId) {
      case "Evaluation":
        return (
          <div id="grid-container">
            <AddData />
            <ObstacleTable />
            <DetailsCard />
          </div>
        );
      // case "Details":
      //   return <DetailsCard />;
      default:
        break;
    }
  };

  return (
    <>
      <CalciteActionBar expandable slot="action-bar">
        <CalciteAction
          icon="validate"
          text="Evaluation"
          selected={selected === "Evaluation"}
          onClick={() => setSelected("Evaluation")}
        />
        {/* <CalciteAction
          icon="feature-details"
          text="Details"
          selected={selected === "Details"}
          onClick={() => setSelected("Details")}
        /> */}
      </CalciteActionBar>

      <CalcitePanel
        // heading="Evaluate Obstacles"
        id="panel-start"
        closable
        co
        closed={selected === null ? true : undefined}
        onCalcitePanelClose={() => setSelected(null)}
      >
        <HeaderRow>
          <img id="logo-img"
            src={AppConfig.themingUserConfig.logo.path}
            alt={AppConfig.themingUserConfig.logo.altText}
          />
          <h1>Evaluate Obstacles</h1>
          {AppConfig.displayUnitConfig.unitSwitcher === "on" ? (
            <UnitSwitcher />
          ) : (
            <div></div>
          )}
        </HeaderRow>
        {getPanelContent(selected)}

      </CalcitePanel>
    </>
  );
}
