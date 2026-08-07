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
import "@esri/calcite-components/dist/components/calcite-segmented-control";
import "@esri/calcite-components/dist/components/calcite-segmented-control-item";

import { CalciteSegmentedControl, CalciteSegmentedControlItem } from "@esri/calcite-components-react";
import { useAppContext } from "@/contexts";

const UnitSwitcher = () => {
    const { usingMeters, setUsingMeters } = useAppContext();

    return (
        <CalciteSegmentedControl
            onCalciteSegmentedControlChange={(e) => {
                setUsingMeters(e.target.value === "true");
            }}
            scale="s"
        >
            <CalciteSegmentedControlItem
                checked={!usingMeters}
                value="false"
            >
                Feet
            </CalciteSegmentedControlItem>
            <CalciteSegmentedControlItem
                checked={usingMeters}
                value="true"
            >
                Meters
            </CalciteSegmentedControlItem>
        </CalciteSegmentedControl>
    );
};

export default UnitSwitcher;