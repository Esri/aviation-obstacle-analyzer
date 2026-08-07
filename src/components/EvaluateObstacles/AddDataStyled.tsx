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
import { CalciteSelect } from "@esri/calcite-components-react";

export const StyledCalciteSelect = styled(CalciteSelect)`
  align-self: center;
`;

export const AddDataContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding: 1rem;
  background: #fff;

  & div:first-of-type {
    display: flex;
    padding: 1rem;
    gap: 1rem;
    flex-direction: column;
    border-right: 1px solid var(--border);
    align-items: center;
    padding-left: 0;

    .btn {
        width: 8rem;
    }
  }

  & div:last-of-type {
    flex-grow: 1;
    display: flex;
    padding: 1rem;
    gap: 1rem;
    flex-direction: column;
    padding-right: 0;

    #add-point {
        width: min-content;
        align-self: flex-end;
    }
  }

  & div:first-of-type > div,
  & div:last-of-type > div {
    flex-direction: row;
    padding: 0;
    border: none;
  }
`;