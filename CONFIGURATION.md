## Configuration

The application can be customized through the `AppConfig.json` file located in `public/config/`. This configuration file allows you to modify various aspects of the application including authentication, services, theming, and behavior.

### Upload CSV
You can add obstacle points to the map by uploading a CSV file. A sample CSV template is provided with the application and can be downloaded from the Information tab. To modify or extend these templates, update the files located in `public/samples/`.

### Configuration Structure

#### Portal and Authentication Settings

```json
{
  "PORTAL_URL": "https://your.portal.com/portal",
  "APP_ID": "PEjERwhm7hJUFM2E"
}
```

- **PORTAL_URL**: The URL of your ArcGIS Enterprise portal
- **APP_ID**: The registered application ID for OAuth authentication

#### Service URLs

```json
{
  "ELEVATION_LAYER_URL": "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
  "gpUrl": "https://your.portal.com/hosting/rest/services/AnalyzeRunwayObstacles/GPServer/Analyze%20Runway%20Obstacles",
  "sceneItemID": "049f1589e1154be29e084d5c212bd32a"
}
```

- **ELEVATION_LAYER_URL**: URL to the elevation service used for terrain analysis
- **gpUrl**: URL to the geoprocessing service that performs obstacle analysis
- **sceneItemID**: ID of the ArcGIS Scene item to display in the application

#### Theming and Branding

```json
{
  "themingUserConfig": {
    "logo": {
      "path": "/obstacle-analysis/assets/arcgis-aviation-airports-220.png",
      "altText": "Brand Logo"
    },
    "colorPalette": {
      "brandColor": "#007AC2",
      "passIndicator": "#5EF39C",
      "failIndicator": "#FF808C"
    },
    "font": {
      "fontFamily": "Inter",
      "fontColor": "#141414"
    }
  }
}
```

- **logo.path**: Path to your organization's logo image
- **logo.altText**: Accessible text description of your organization's logo
- **colorPalette.brandColor**: Primary brand color
- **colorPalette.passIndicator**: Color for obstacles that pass analysis
- **colorPalette.failIndicator**: Color for obstacles that fail analysis
- **font.fontFamily**: Font style used throughout the application
- **font.fontColor**: Primary text color

#### Display Unit Configuration

```json
{
  "displayUnitConfig": {
    "unitSwitcher": "off",
    "units": "feet"
  }
}
```

- **unitSwitcher**: Enable/disable unit switching functionality ("on" or "off")
- **units**: Display measurement units ("feet" or "meters")

#### Scene Layer Configuration

```json
{
  "arrSceneLayersUserConfig": [
    {
      "title": "Obstruction_MP_FINAL_11_14_WEB",
      "surfaceFriendlyNameField": "name",
      "surfaceUnfriendlyNameField": "descrip",
      "surfaceTypeField": "zoneuse",
      "surfaceStateField": "runwaystate"
    }
  ]
}
```

Tip: Reference your scene layer to pull relevant and available fields.

- **title**: Display title for the scene layer
- **surfaceFriendlyNameField**: Field containing user-friendly surface names
- **surfaceUnfriendlyNameField**: Field containing detailed surface descriptions
- **surfaceTypeField**: Field indicating the type of surface/zone use
- **surfaceStateField**: Field indicating the runway state (existing/future)

#### Layer Names

```json
{
  "LAYER_NAMES": {
    "GROUP_LAYER_MARKERS": "Markers Group",
    "PENDING_MARKER": "My Marker",
    "OBSTACLE_MARKERS": "Obstacle 2D Markers",
    "OBSTACLE_PILLARS": "Obstacle Pillars",
    "OBSTACLE_PILLARS_PENETRATES": "Penetrating Obstacle Pillars",
    "OBSTACLE_LABELS": "Obstacle Labels",
    "USER_INPUT_OBSTACLE_POINTS": "User Input Obstacle Points"
  }
}
```

Customize the display names for various map layers in the application.

#### Analysis Status Configuration

```json
{
  "ANALYSIS_STATUS": {
    "DONE": "Analyzed",
    "NOT_DONE": "Not Analyzed",
    "FAILED": "FAILED",
    "IN_PROGRESS": "In Progress",
    "STARTING": "Starting"
  }
}
```

Define the text labels for different analysis states.

#### Surface Sorting Configuration

```json
{
  "SURFACE_SORT_METHODS": {
    "BY_OBS_DELTA_Z": {
      "label": "Delta Z",
      "field": "obsDeltaZ"
    },
    "BY_RUNWAY_NAME": {
      "label": "Runway Name",
      "field": "runwayName"
    }
  }
}
```

Configure available sorting methods for evaluated surfaces.

#### Runway State Configuration

```json
{
  "RUNWAY_STATE": {
    "Existing Runway": "EXISTING",
    "Future Planned Runway": "FUTURE"
  }
}
```

Define runway state mappings for analysis. This should only be included if the Scene Layer has been configured with surfaceStateField, and should correspond with its available runway states.

### Customization Examples

#### Example 1: Changing Brand Colors

To match your organization's brand colors:

```json
{
  "themingUserConfig": {
    "colorPalette": {
      "brandColor": "#FF6B35",
      "passIndicator": "#4CAF50",
      "failIndicator": "#F44336"
    }
  }
}
```

#### Example 2: Using Different Measurement Units

To use metric units by default:

```json
{
  "displayUnitConfig": {
    "unitSwitcher": "on",
    "units": "meters"
  }
}
```

#### Example 3: Custom Logo

To use your organization's logo:

```json
{
  "themingUserConfig": {
    "logo": {
      "path": "/obstacle-analysis/assets/my-organization-logo.png",
      "altText": "My Organization Logo"
    }
  }
}
```

### Notes

- After modifying the configuration file, restart the application for changes to take effect
- Ensure all URLs point to valid, accessible services
- Use valid hex color codes for color customization
- Logo images should be in PNG or SVG format for best results
- Test thoroughly after making configuration changes