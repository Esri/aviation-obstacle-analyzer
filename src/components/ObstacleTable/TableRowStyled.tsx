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
import styled from "styled-components";

// #region Styles ===================================================
export const StyledTableRow = styled.tr`
  --table-row-text-color: var(--text-color);
  height: 2.5rem;
  width: 100%;
  background-color: var(--table-row-bg, white);

  td.status-cell {
    color: var(--table-row-text-color, var(--text-color));
  }

  button {
    background-color: transparent;
    border: none;
    color: var(--text-color);
    text-decoration: underline;
    cursor: pointer;
    white-space: nowrap;
    margin: 0;
    padding: 0;
    text-align: center;

    &:disabled {
      color: lightgrey;
    }
  }
`;

export const SuccessRow = styled(StyledTableRow)`
  // --table-row-text-color: var(--text-color);
  --table-row-bg: var(--pass-indicator-color);
`;

export const FailureRow = styled(StyledTableRow)`
  // --table-row-text-color: var(--text-color);
  --table-row-bg: var(--fail-indicator-color);
`;

// #endregion Styles ================================================