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
import { useState, useEffect } from "react";
import { useMapContext, useAppContext } from "@/contexts";
import { ObstacleProvider } from "@/contexts/ObstacleContext";
import Map from "@/components/Map/Map";
import "./App.css";
import {
  CalciteShell,
  CalciteShellPanel,
  CalcitePanel,
} from "@esri/calcite-components-react";
import "@esri/calcite-components/dist/components/calcite-block";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-shell";
import "@esri/calcite-components/dist/components/calcite-shell-panel";
import "@arcgis/map-components/components/arcgis-basemap-layer-list";
import ActionBar from "../ActionBar/ActionBar";
import PanelBar from "../PanelBar/PanelBar";

const App = () => {
  const [selectedMapUI, setSelectedMapUI] = useState(null);
  const { selectedCard, setSelectedCard } = useAppContext();
  const { setUsingMeters } = useAppContext();
  const AppConfig = window.ObstacleAnalysis;

  useEffect(() => {
    setUsingMeters(AppConfig.displayUnitConfig.units === "meters" ? true : false);
  }, [AppConfig.displayUnitConfig.units, setUsingMeters]);
  
  return (
    <ObstacleProvider>
      <CalciteShell>
        <CalciteShellPanel
          slot="panel-start"
          position="start"
          id="shellPanel-start"
          width="l"
          collapsible
          collapsed={selectedCard === null ? true : false}
        >
          <PanelBar selected={selectedCard} setSelected={setSelectedCard} />
        </CalciteShellPanel>
        <CalcitePanel>
          <div className="app-container">
            <Map></Map>
            {/* Add SurveyModal, etc. */}
            <div className="bottom-ui-container"></div>
          </div>
        </CalcitePanel>
        <CalciteShellPanel
          slot="panel-end"
          position="end"
          id="shell-panel-end"
          collapsible
          collapsed={selectedMapUI === null ? true : false}
        >
          <ActionBar selected={selectedMapUI} setSelected={setSelectedMapUI} />
        </CalciteShellPanel>
      </CalciteShell>
    </ObstacleProvider>
  );
};

export default App;