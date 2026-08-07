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
import Graphic from "@arcgis/core/Graphic.js";

export function exportFeaturesToCSV(features: Graphic[], filename = "evaluation_results.csv") {
    if (!features || !features.length) return;
    const headers = Object.keys(features[0].attributes);
    const rows = features.map(f => headers.map(h => JSON.stringify(f.attributes[h] ?? "")));
    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
