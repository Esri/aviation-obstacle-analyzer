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
import { useMapContext } from "@/contexts";
import "@esri/calcite-components/dist/components/calcite-action-bar";
import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-label";
import "@esri/calcite-components/dist/components/calcite-list";
import "@esri/calcite-components/dist/components/calcite-list-item";
import {
  CalciteActionBar,
  CalciteAction,
  CalcitePanel,
  CalciteList,
  CalciteListItem,
} from "@esri/calcite-components-react";
import "@esri/calcite-components/dist/calcite/calcite.css";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import SampleObstacles from "@/components/SampleObstacles/SampleObstacles";

export default function ActionBar({ selected, setSelected }) {
  const MapContext = useMapContext();

  let slides = [];
  if (MapContext.state.mapView) {
    slides = MapContext.state.mapView.map.presentation.slides.toArray();
  }

  const getPanelContent = (actionId) => {
    switch (actionId) {
      case "Basemaps":
        return (
          <arcgis-basemap-gallery reference-element="arcgis-scene"></arcgis-basemap-gallery>
        );
      case "Legend":
        return <arcgis-legend reference-element="arcgis-scene"></arcgis-legend>;
      case "Layers":
        return (
          <arcgis-layer-list reference-element="arcgis-scene"></arcgis-layer-list>
        );
      case "Airports":
        return (
          <div>
            <CalciteList scale="s">
              {slides && slides.length > 0 ? (
                slides.map((element) => {
                  return (
                    <CalciteListItem
                      key={element.id}
                      label={element.title.text}
                      description={element.description.text}
                      onCalciteListItemSelect={() => {
                        // Use this if we want to apply all the slide's properties (basemap, layer visibility, etc.)
                        // element.applyTo(MapContext.state.mapView, {
                        //   maxDuration: 2000,
                        // });

                        // Use the goTo method here so we don't override layer visibility, basemap, etc.
                        MapContext.state.mapView.goTo(element.viewpoint, {
                          maxDuration: 2000,
                        });
                      }}
                    >
                      <div slot="content-start">
                        <img alt="" src={element.thumbnail.url} />
                      </div>
                    </CalciteListItem>
                  );
                })
              ) : (
                <div>No airports available</div>
              )}
            </CalciteList>
          </div>
        );
      case "Information":
        return (
          // Todo: Add content for the Information panel
          <div style={{ padding: "1rem" }}>
            <SampleObstacles />
            {/* <a href="https://ps024790.esri.com/analyzeobstacle/">
              Previous Version
            </a> */}
          </div>
        );
      default:
        break;
    }
  };

  return (
    <>
      <CalciteActionBar expandable slot="action-bar">
        <CalciteAction
          icon="basemap"
          text="Basemaps"
          selected={selected === "Basemaps"}
          onClick={() => setSelected("Basemaps")}
        />
        <CalciteAction
          icon="layers"
          text="Layers"
          selected={selected === "Layers"}
          onClick={() => setSelected("Layers")}
        />
        <CalciteAction
          icon="legend"
          text="Legend"
          selected={selected === "Legend"}
          onClick={() => setSelected("Legend")}
        />
        <CalciteAction
          icon="bookmark"
          text="Airports"
          selected={selected === "Airports"}
          onClick={() => setSelected("Airports")}
        />
        <CalciteAction
          icon="information"
          text="Information"
          selected={selected === "Information"}
          onClick={() => setSelected("Information")}
        />
      </CalciteActionBar>

      <CalcitePanel
        heading={selected}
        id="panel-end"
        closable
        co
        closed={selected === null ? true : undefined}
        onCalcitePanelClose={() => setSelected(null)}
      >
        {getPanelContent(selected)}
      </CalcitePanel>
    </>
  );
}
