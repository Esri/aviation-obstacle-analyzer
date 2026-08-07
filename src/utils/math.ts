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
// #region Unit Conversion
export function toFeet (meters: number) {
  return meters / 0.3048;
};

export function toMeters (feet: number) {
  return feet * 0.3048;
};

export function displayMeasurement(measurementInMeters: number, usingMeters: boolean, precision: number = 3): string{
  return usingMeters ? measurementInMeters.toFixed(precision) : toFeet(measurementInMeters).toFixed(precision);
}
//#endregion Unit Conversion

export function dmsToDecimalDegrees(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimalDegrees = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
  if (direction === "S" || direction === "W") {
    decimalDegrees = -decimalDegrees;
  }
  return decimalDegrees;
}

export function truncateCoordinate(coord: number, desiredPrecision?: number): string {
  if (desiredPrecision === null || desiredPrecision === undefined) {
    desiredPrecision = 6;
  }
  return coord.toFixed(desiredPrecision);
}

export function isNumberKey(txt: HTMLInputElement, evt: KeyboardEvent, bAllowNegative: boolean): boolean {
  // 45 is -
  // 46 is .
  const charCode = evt.which ? evt.which : evt.keyCode;
  
  if (charCode === 46) {
    // Check if text already contains the "." character
    return txt.value.indexOf(".") === -1;
  }

  if (charCode === 45 && !bAllowNegative) {
    return false;
  }

  if (charCode !== 45 && charCode > 31 && (charCode < 48 || charCode > 57)) {
    return false;
  }

  return true;
}

export function getUniqueId(): string {
  return Math.random().toString(16).slice(2);
}

export function isRealValue(obj: any): boolean {
  return (
    obj !== null && obj !== undefined && obj !== "null" && obj !== "undefined"
  );
}