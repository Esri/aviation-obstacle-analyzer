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
export const TableCard = styled.section`
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  font-size: 12px;
  //border-top: 1px solid var(--borderer);
  --details-bg: white;
  background-color: var(--details-bg);
`;

export const TableHeader = styled.div`
  height: auto;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--details-bg);

  h2 {
    color: var(--status-text-color, var(--text-color));
    font-weight: 600;
    font-size: 14px;
  }

  p {
    color: var(--status-text-color, var(--text-color));
    font-size: 12px;
    margin-bottom: 1rem;
  }

  #details-x-btn {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
  }

  .row {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    margin-bottom: 0.5rem;
    justify-content: flex-start;
  }
`;

export const SuccessHeader = styled(TableHeader)`
  --status-text-color: var(--text-color);
  --details-bg: var(--pass-indicator-color);
`;

export const FailureHeader = styled(TableHeader)`
  --status-text-color: var(--text-color);
  --details-bg: var(--fail-indicator-color);
`;

export const TableContainer = styled.div`
  width: 100%;
  min-height: 10rem;
  // height: 15rem; // Placeholder, adjust as needed
  overflow-y: auto;
  padding: 1rem;

  table {
    border-collapse: collapse;
    width: 100%;
    th {
      color: var(--text-color);
      background-color: var(--calcite-color-foreground-2);
      font-weight: 600;
      font-size: 14px;
      text-align: left;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      border: 1px solid var(--border);
      height: 2.5rem;
      font-size: 12px;
    }
    td {
      color: var(--text-color);
      max-width: 10rem;
      border: 1px solid var(--border);
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      text-overflow: ellipsis;
    }
  }
`;
// #endregion Styles ================================================
