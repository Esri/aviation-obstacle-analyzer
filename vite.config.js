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
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Default config file
  let configFile = "AppConfig.json";
  if (mode === "den") configFile = "AppConfig_DEN.json";

  return {
    base: "/obstacle-analysis/",
    plugins: [react()],
    resolve: {
      alias: {
        // Resolve the ~ alias to the src/ directory
        // This allows us to import like `import Button from '@/components/Button';`
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Disable minification to prevent geometry processing issues
      minify: false,
      // Enable source maps for debugging
      sourcemap: true,
    },
    define: {
      // Inject the config file name as an env variable
      "import.meta.env.VITE_CONFIG_FILE": JSON.stringify(configFile),
    },
  };
});