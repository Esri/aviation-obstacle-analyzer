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
import { useMapContext } from "@/contexts";
import { resetResultsInScene } from "@/utils/mapLayerUpdates";

const ResetScene = () => {
  const mapContext = useMapContext();

  return (
    <CalciteButton
      round
      scale="s"
      kind="brand"
      appearance="outline"
      iconStart="reset"
      id="reset-scene-results"
      onClick={() => resetResultsInScene(mapContext)}
    >
      Reset Scene
    </CalciteButton>
  );
};

export default ResetScene;
