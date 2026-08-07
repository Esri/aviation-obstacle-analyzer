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

export const TableCard = styled.section`
  display: flex;
  flex-direction: column;

  background: #fff;
  font-size: 12px;

  table {
    width: 100%;
    border-collapse: collapse;
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

      > :first-child {
        margin-left: 0.5rem;
        --calcite-color-brand: var(--light-purple);
      }
    }

    th.no-style {
        /* color: #fff; */
        background-color: #fff;
        font-weight: 600;
        font-size: 14px;
        text-align: left;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
        border: 0px;
        height: 2.5rem;
        font-size: 12px;
        position: relative;
      }

      #reset-scene-results {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
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

export const TableHeader = styled.div`
  width: 100%;
  height: auto;
  padding: 1rem;
  border-top: 1px solid var(--borderer);
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  position: relative;

  h2 {
    color: var(--text-color);
    font-weight: 600;
    font-size: 14px;
  }

  #table-x-btn {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
  }

  #naCount {
    color: var(--gray);
  }

  .row {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    margin-bottom: 0.5rem;
    justify-content: flex-end;
    align-items: flex-start;

    h2 {
      flex-grow: 1;
    }

  }
`;

export const TableContainer = styled.div`
  width: 100%;
  min-height: 10rem;
  scrollbar-gutter: stable;

  overflow-y: auto;
  padding: 1rem;
`;