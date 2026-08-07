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
import React, { createContext, useContext, useReducer } from "react";

const ObstacleContext = createContext();

const initialState = { obstacles: [], selectedObstacle: null };

function obstacleReducer(state, action) {
  switch (action.type) {
    case "SET_OBSTACLES":
      // Replace the obstacles array with the payload
      return { ...state, obstacles: action.payload };
    case "APPEND_OBSTACLE":
      // Append a single obstacle to the array
      return { ...state, obstacles: [...state.obstacles, action.payload] };
    case "SET_SELECTED":
      return {
        ...state,
        selectedObstacle: action.payload,
      };
    default:
      return state;
  }
}

export function ObstacleProvider({ children }) {
  const [state, dispatch] = useReducer(obstacleReducer, initialState);

  // Use this to replace the obstacles array
  const setObstacles = (obstacles) => {
    //console.trace("setObstacles called from:");
    dispatch({ type: "SET_OBSTACLES", payload: obstacles });
  };

  // Use this to append a single obstacle
  const appendObstacle = (obstacle) => {
    dispatch({ type: "APPEND_OBSTACLE", payload: obstacle });
  };

  const setSelected = (obstacle) => {
    dispatch({ type: "SET_SELECTED", payload: obstacle });
  };

  return (
    <ObstacleContext.Provider value={{ state, setObstacles, appendObstacle, setSelected }}>
      {children}
    </ObstacleContext.Provider>
  );
}

export function useObstacleContext() {
  return useContext(ObstacleContext);
}
