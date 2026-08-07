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
import {
  StyledPanel,
  StyledButton,
  StyledButtonContainer,
  StyledPanelHeader,
  StyledPanelSubHeader,
} from "./SampleObstaclesStyled";

const SampleObstacles = () => {
  return (
    <div>
      <StyledPanel>
        <StyledPanelHeader>
          Looking for some sample obstacles?
        </StyledPanelHeader>
        <StyledPanelSubHeader>Try the following:</StyledPanelSubHeader>
        <StyledButtonContainer>
          <StyledButton
            icon-start="download"
            scale="s"
            kind="neutral"
            appearance="outline-fill"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/obstacle-analysis/samples/KDEN.csv";
              link.download = "KDEN.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Sample Points
          </StyledButton>
          <StyledButton
            icon-start="download"
            scale="s"
            kind="neutral"
            appearance="outline-fill"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/obstacle-analysis/samples/Template.csv";
              link.download = "Template.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Blank Template
          </StyledButton>
        </StyledButtonContainer>
      </StyledPanel>
    </div>
  );
};

export default SampleObstacles;
