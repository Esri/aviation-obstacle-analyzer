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
import { CalciteButton } from "@esri/calcite-components-react";

import "@esri/calcite-components/dist/components/calcite-panel";
import "@esri/calcite-components/dist/components/calcite-button";

// #region Styles ===================================================
export const StyledPanel = styled.div`
  width: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
`;

export const StyledPanelHeader = styled.div`
  color: var(--calcite-color-brand);
  font-size: 18px;
  text-align: center;
  line-height: 2rem;
`;

export const StyledPanelSubHeader = styled.div`
  color: var(--calcite-color-gray-8);
  font-size: 16px;
  text-align: center;
`;

export const StyledButton = styled(CalciteButton)`
  margin: 0.5rem;
  width: 100%;
  max-width: 300px;
`;

export const StyledButtonContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 600px;
`;

// #endregion Styles ================================================
