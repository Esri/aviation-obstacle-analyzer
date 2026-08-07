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
import * as XLSX from "xlsx";
import { displayMeasurement } from "@/utils/math";
import { ObstacleType, SurfaceResultType } from "@/contexts/ObstacleTypes";

// Constants for aliasing and ordering
const DETAILS_ALIAS_MAP: Record<string, string> = {
    obsName: "Point",
    obsHasPenetration: "Status",
    obsHeightAGL: "HeightAGL (m/ft)",
    obsHeightAMSL: "HeightAMSL (m/ft)",
    x: "X Coordinate",            // Changed from latitude
    y: "Y Coordinate",  
    gndElevation: "Ground Elevation (m/ft)",
    uniqueId: "UniqueID",
    obsWasAnalyzed: "Analyzed",
};

const COLLISIONS_ALIAS_MAP: Record<string, string> = {
    surfaceName: "Surface Name",
    runwayName: "Runway Name",
    didObstaclePenetrate: "Status",
    obsDeltaZ: "Delta Z (m/ft)",
    obsOISZ: "OISZ (m/ft)",
    surfaceLayerName: "Surface Layer Name",
    surfaceOID: "SurfaceOID",
};

function getCollisionAliasMap(usingMeters: boolean): Record<string, string> {
    return {
        ...COLLISIONS_ALIAS_MAP,
        obsDeltaZ: `Delta Z (${usingMeters ? "m" : "ft"})`,
        obsOISZ: `OISZ (${usingMeters ? "m" : "ft"})`,
    };
}

const DETAILS_ORDER = [
    "obsName",
    "obsHasPenetration",
    "obsHeightAGL",
    "obsHeightAMSL",
    "x",
    "y",
    "gndElevation",
    "uniqueId",
    "obsWasAnalyzed"
];

/** Excel-safe sheet name (<=31 chars, no []:*?/\\) */
function safeSheetName(name: string): string {
    const cleaned = name.replace(/[[\]:*?/\\]/g, "").slice(0, 31).trim();
    return cleaned || "Sheet";
}

/** Make names unique: append -2, -3, ... if needed */
function uniquify(name: string, used: Set<string>): string {
    let n = name;
    let i = 2;
    while (used.has(n)) {
        const base = name.slice(0, Math.max(0, 31 - (`-${i}`.length)));
        n = `${base}-${i}`;
        i++;
    }
    used.add(n);
    return n;
}

/** Primitive value guard (keeps numbers, strings, booleans, null/undefined) */
function isPrimitive(val: unknown): boolean {
    return (
        val === null ||
        val === undefined ||
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
    );
}

/** Build a 2-col key/value array from an object's primitive properties */
function detailsRowsFromAttributes(attrs: Record<string, any>, collisionsKey: string) {
    const rows: Array<{ Property: string; Value: any }> = [];
    Object.keys(attrs).forEach((k) => {
        if (k === collisionsKey) return;
        const v = attrs[k];
        if (isPrimitive(v)) {
            rows.push({ Property: k, Value: v });
        }
    });
    // Sort for stable appearance
    rows.sort((a, b) => a.Property.localeCompare(b.Property));
    return rows;
}

/** Get union of keys across all collisions for the header */
function collisionHeaders(collisions: Array<Record<string, any>>): string[] {
    const set = new Set<string>();
    collisions.forEach((c) => Object.keys(c ?? {}).forEach((k) => set.add(k)));
    return Array.from(set);
}

/** Add AutoFilter to a worksheet range */
function addAutoFilter(ws: XLSX.WorkSheet, ref: string) {
    (ws as any)["!autofilter"] = { ref };
}

/** Add column widths (wch: chars). Adjust as you like. */
function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
    (ws as any)["!cols"] = widths.map((wch) => ({ wch }));
}

/** Encode an A1 range from top-left and bottom-right coordinates */
function encodeRange(r1: number, c1: number, r2: number, c2: number): string {
    return XLSX.utils.encode_range({
        s: { r: r1, c: c1 },
        e: { r: r2, c: c2 },
    });
}

/**
 * Export features to an Excel file with index and details/collisions sheets.
 * @param features Array of ObstacleType features
 * @param filename Output filename
 * @param options Export options
 * @param usingMeters Whether to use meters (true) or feet (false)
 */
export function exportFeaturesToXLSX(
    features: ObstacleType[],
    filename = "obstacle_evaluation_results.xlsx",
    options?: {
        collisionsKey?: string;
        nameKey?: string;
        indexColumns?: {
            includeCollisionCount?: boolean;
        };
    },
    usingMeters: boolean = true
) {
    if (!features || !features.length) {
        console.warn("No features provided for export.");
        return;
    }

    const collisionsKey = options?.collisionsKey ?? "collisions";
    const nameKey = options?.nameKey ?? "obsName";

    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();

    // Pre-compute sheet names
    const displayNames: string[] = features.map((f, i) => {
        let attrs: ObstacleType = f;
        const nm =
            (attrs?.[nameKey] as string) ||
            (attrs?.obsName as string) ||
            `Feature_${i + 1}`;
        return nm;
    });
    const sheetNames: string[] = displayNames.map((nm) =>
        uniquify(safeSheetName(nm), usedSheetNames)
    );

    // Define the order and keys for the index sheet
    const indexKeys = [
        "obsName",
        "obsWasAnalyzed",
        "obsHasPenetration",
        "obsHeightAGL",
        "obsHeightAMSL",
        "x",        // Changed from "latitude"
        "y"         // Changed from "longitude"
    ];

    // Build all feature sheets and index rows
    const indexRows: Record<string, any>[] = [];
    const detailsSheets: { name: string; sheet: XLSX.WorkSheet }[] = [];
    features.forEach((feature, idx) => {
        const attrs: ObstacleType = feature;
        const collisions = (attrs[collisionsKey] as SurfaceResultType[]) ?? [];
        const sheetDisplayName = displayNames[idx];
        const indexRow = buildIndexRow(attrs, collisions, sheetDisplayName, indexKeys, usingMeters, options);
        indexRows.push(indexRow);

        // Details sheet
        const detailsSheet = buildDetailsSheet(attrs, collisions, usingMeters);
        detailsSheets.push({ name: sheetNames[idx], sheet: detailsSheet });
    });

    // Index sheet (add first)
    const indexSheet = buildIndexSheet(indexRows, displayNames, sheetNames);
    XLSX.utils.book_append_sheet(wb, indexSheet, "Index");

    // Add detail sheets after index
    detailsSheets.forEach(({ name, sheet }) => {
        XLSX.utils.book_append_sheet(wb, sheet, name);
    });

    // Write and trigger download
    const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([xlsxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Build the details/collisions worksheet for a feature.
 */
function buildDetailsSheet(
    attrs: ObstacleType,
    collisions: SurfaceResultType[],
    usingMeters: boolean
): XLSX.WorkSheet {
    // Details rows
    const detailsAliasMap = { ...DETAILS_ALIAS_MAP };
    detailsAliasMap.obsHeightAGL = `HeightAGL (${usingMeters ? "m" : "ft"})`;
    detailsAliasMap.obsHeightAMSL = `HeightAMSL (${usingMeters ? "m" : "ft"})`;
    detailsAliasMap.gndElevation = `Ground Elevation (${usingMeters ? "m" : "ft"})`;
    const detailRowsRaw = detailsRowsFromAttributes(attrs, "collisions");
    const detailRowsMapped = detailRowsRaw.map(row => {
        let friendly = detailsAliasMap[row.Property] || row.Property;
        let value = row.Value;
        if (row.Property === "obsHasPenetration") {
            value = row.Value ? "Penetrates" : "Does Not Penetrate";
        } else if ((row.Property === "obsHeightAGL" || row.Property === "obsHeightAMSL" || row.Property === "gndElevation") && typeof row.Value === "number") {
            value = displayMeasurement(row.Value, usingMeters);
        }
        return { Property: friendly, Value: value, _key: row.Property };
    });
    const detailRows = [
        ...DETAILS_ORDER
            .map(key => detailRowsMapped.find(row => row._key === key))
            .filter(Boolean),
        ...detailRowsMapped.filter(row => !DETAILS_ORDER.includes(row._key))
    ].map(({ Property, Value }) => ({ Property, Value }));

    const ws = XLSX.utils.json_to_sheet([], {});
    XLSX.utils.sheet_add_aoa(ws, [["Details"]], { origin: "A1" });
    XLSX.utils.sheet_add_json(ws, detailRows, {
        header: ["Property", "Value"],
        origin: "A2",
        skipHeader: true,
    });

    // Collisions section
    const collisionAliasMap = getCollisionAliasMap(usingMeters);
    const headersRaw = collisionHeaders(collisions);
    const headers = headersRaw.map(h => collisionAliasMap[h] || h);
    XLSX.utils.sheet_add_aoa(ws, [["Collisions"]], { origin: "D1" });
    if (collisions.length > 0 && headers.length > 0) {
        const normalized = collisions.map((c) => {
            const row: Record<string, any> = {};
            headersRaw.forEach((origKey) => {
                const friendly = collisionAliasMap[origKey] || origKey;
                if (origKey === "didObstaclePenetrate") {
                    row[friendly] = c?.[origKey] ? "Penetrates" : "Does Not Penetrate";
                } else if ((origKey === "obsDeltaZ" || origKey === "obsOISZ") && typeof c?.[origKey] === "number") {
                    row[friendly] = displayMeasurement(c[origKey], usingMeters);
                } else {
                    row[friendly] = c?.[origKey] ?? "";
                }
            });
            return row;
        });
        XLSX.utils.sheet_add_json(ws, normalized, {
            header: headers,
            origin: "D2",
            skipHeader: false,
        });
        const detailsColWidths = [24, 32];
        const gapColWidth = [4];
        const collisionsColWidths = headers.map(() => 16);
        setColumnWidths(ws, [...detailsColWidths, ...gapColWidth, ...collisionsColWidths]);
        const lastRow = 2 + normalized.length;
        const lastCol = 3 + headers.length - 1;
        const filterRef = encodeRange(1, 3, lastRow - 1, lastCol);
        addAutoFilter(ws, filterRef);
    } else {
        XLSX.utils.sheet_add_aoa(ws, [["(no collisions)"]], { origin: "D2" });
        setColumnWidths(ws, [24, 32, 4, 24]);
    }
    return ws;
}

/**
 * Build the index row for a feature.
 */
function buildIndexRow(
    attrs: ObstacleType,
    collisions: SurfaceResultType[],
    sheetDisplayName: string,
    indexKeys: string[],
    usingMeters: boolean,
    options?: any
): Record<string, any> {
    const indexRow: Record<string, any> = {};
    indexKeys.forEach((attrKey) => {
        let colHeader = DETAILS_ALIAS_MAP[attrKey] || attrKey;
        // Dynamically set units for height fields
        if (attrKey === "obsHeightAGL") {
            colHeader = `HeightAGL (${usingMeters ? "m" : "ft"})`;
        } else if (attrKey === "obsHeightAMSL") {
            colHeader = `HeightAMSL (${usingMeters ? "m" : "ft"})`;
        }
        if (attrKey === "obsHasPenetration") {
            indexRow[colHeader] = attrs[attrKey] ? "Penetrates" : "Does Not Penetrate";
        } else if ((attrKey === "obsHeightAGL" || attrKey === "obsHeightAMSL") && typeof attrs[attrKey] === "number") {
            indexRow[colHeader] = displayMeasurement(attrs[attrKey], usingMeters);
        } else {
            indexRow[colHeader] = attrs[attrKey];
        }
    });
    if (options?.indexColumns?.includeCollisionCount !== false) {
        indexRow["# Collisions"] = collisions.length;
    }
    indexRow["Point (link)"] = sheetDisplayName;
    return indexRow;
}

/**
 * Build the index worksheet for all features.
 */
function buildIndexSheet(
    indexRows: Record<string, any>[],
    displayNames: string[],
    sheetNames: string[]
): XLSX.WorkSheet {
    const indexHeaders = Object.keys(indexRows[0] ?? {});
    const indexSheet = XLSX.utils.json_to_sheet(indexRows, { header: indexHeaders });
    // Add hyperlinks in the first column to each feature sheet
    for (let i = 0; i < indexRows.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 0 });
        const display = displayNames[i];
        const targetSheet = sheetNames[i];
        (indexSheet as any)[cellRef] = {
            t: "s",
            f: `HYPERLINK("#'${targetSheet}'!A1","${display}")`,
        };
    }
    // Remove the 'Point (link)' column from the Index sheet
    const indexHeadersArr = indexHeaders.slice();
    const linkColIdx = indexHeadersArr.indexOf("Point (link)");
    if (linkColIdx !== -1) {
        for (let r = 0; r <= indexRows.length; r++) {
            const cellRef = XLSX.utils.encode_cell({ r, c: linkColIdx });
            delete (indexSheet as any)[cellRef];
        }
        indexHeadersArr.splice(linkColIdx, 1);
        const newRange = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: indexRows.length, c: indexHeadersArr.length - 1 }
        });
        indexSheet["!ref"] = newRange;
        setColumnWidths(indexSheet, Array(indexHeadersArr.length).fill(16));
    } else {
        setColumnWidths(indexSheet, [24, 16, 14, 14, 16, 16, 14]);
    }
    const indexRange = indexSheet["!ref"];
    if (indexRange) addAutoFilter(indexSheet, indexRange);
    return indexSheet;
}
