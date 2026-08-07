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
// General UI management
// #region ========================= IMPORTS ====================================
import React, { createContext, useContext, useState } from "react";
// #endregion --------------------- IMPORTS ------------------------------------

// #region ========================= TYPES ===================================
type Props = { children: React.ReactNode };

export type AppContextType = {
  usingMeters: boolean;
  setUsingMeters: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCard: "Evaluation" | "Details";
  setSelectedCard: React.Dispatch<React.SetStateAction<"Evaluation" | "Details">>;
};

// #endregion ====================== TYPES ====================================
const AppContext = createContext<AppContextType | null>(null);

// #region ====================== EXPORTED HOOK ================================
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within a AppProvider");
  }
  return context;
};
// #endregion =================== EXPORTED HOOK ================================

// #region ==================== EXPORTED PROVIDER ==============================
export const AppContextProvider = ({ children }: Props) => {
  // #region -------------------- Hooks (State) --------------------------------
  const [usingMeters, setUsingMeters] = useState(true);
  const [selectedCard, setSelectedCard] = useState<"Evaluation" | "Details">("Evaluation");
  // #endregion ----------------- Hooks (State) --------------------------------

  return (
    <AppContext.Provider value={{ usingMeters, setUsingMeters, selectedCard, setSelectedCard }}>
      {children}
    </AppContext.Provider>
  );
};
// #endregion ================= EXPORTED PROVIDER ==============================
