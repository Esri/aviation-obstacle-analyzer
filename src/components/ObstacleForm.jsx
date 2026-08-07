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
import React, { useState } from "react";
import { useObstacleContext } from "@/contexts/ObstacleContext";

export default function ObstacleForm() {
  const { dispatch } = useObstacleContext();
  const [form, setForm] = useState({
    obsName: "",
    obsHtAglMet: "",
    coord_Y: "",
    coord_X: "",
    // ...other fields
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({
      type: "ADD_OBSTACLE",
      payload: { ...form, sUid: Math.random().toString(16).slice(2) },
    });
    setForm({ obsName: "", obsHtAglMet: "", coord_Y: "", coord_X: "" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="obsName"
        value={form.obsName}
        onChange={handleChange}
        placeholder="Name"
      />
      <input
        name="obsHtAglMet"
        value={form.obsHtAglMet}
        onChange={handleChange}
        placeholder="Height (m)"
      />
      <input
        name="coord_Y"
        value={form.coord_Y}
        onChange={handleChange}
        placeholder="Latitude"
      />
      <input
        name="coord_X"
        value={form.coord_X}
        onChange={handleChange}
        placeholder="Longitude"
      />
      <button type="submit">Add Obstacle</button>
    </form>
  );
}
