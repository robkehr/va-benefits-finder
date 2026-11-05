"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import type { StateCountyData } from "@/lib/county-schema";
import { stateFips } from "@/lib/state-fips";

const GEO_URL = "/us-counties.json";
const MAP_WIDTH = 960;
const MAP_HEIGHT = 560;

// Hand-tuned projection (center lon/lat + Mercator scale) per state.
const projectionByState: Record<string, { center: [number, number]; scale: number }> = {
  AL: { center: [-86.8, 32.8], scale: 4200 }, AK: { center: [-152.5, 64.5], scale: 700 },
  AZ: { center: [-111.7, 34.3], scale: 3300 }, AR: { center: [-92.4, 34.9], scale: 4800 },
  CA: { center: [-119.6, 37.2], scale: 1900 }, CO: { center: [-105.5, 39.0], scale: 3600 },
  CT: { center: [-72.7, 41.6], scale: 14000 }, DE: { center: [-75.5, 39.0], scale: 14000 },
  FL: { center: [-82.5, 28.6], scale: 3000 }, GA: { center: [-83.4, 32.7], scale: 4000 },
  HI: { center: [-157.8, 20.8], scale: 5500 }, ID: { center: [-114.6, 44.4], scale: 2800 },
  IL: { center: [-89.2, 40.0], scale: 3600 }, IN: { center: [-86.3, 39.9], scale: 4800 },
  IA: { center: [-93.5, 42.0], scale: 4800 }, KS: { center: [-98.4, 38.5], scale: 3600 },
  KY: { center: [-85.3, 37.5], scale: 4400 }, LA: { center: [-91.9, 31.0], scale: 4000 },
  ME: { center: [-69.2, 45.3], scale: 3600 }, MD: { center: [-77.0, 39.0], scale: 8000 },
  MA: { center: [-71.8, 42.3], scale: 11000 }, MI: { center: [-85.4, 44.3], scale: 2600 },
  MN: { center: [-94.6, 46.4], scale: 2600 }, MS: { center: [-89.7, 32.7], scale: 4200 },
  MO: { center: [-92.5, 38.4], scale: 3600 }, MT: { center: [-110.0, 47.0], scale: 2200 },
  NE: { center: [-99.8, 41.5], scale: 3200 }, NV: { center: [-116.6, 39.3], scale: 2600 },
  NH: { center: [-71.6, 43.7], scale: 9000 }, NJ: { center: [-74.7, 40.1], scale: 9000 },
  NM: { center: [-106.1, 34.4], scale: 2800 }, NY: { center: [-75.5, 42.9], scale: 3600 },
  NC: { center: [-79.4, 35.5], scale: 4000 }, ND: { center: [-100.5, 47.5], scale: 3200 },
  OH: { center: [-82.8, 40.3], scale: 4800 }, OK: { center: [-97.5, 35.5], scale: 3600 },
  OR: { center: [-120.6, 43.9], scale: 2800 }, PA: { center: [-77.75, 41.1], scale: 8000 },
  RI: { center: [-71.5, 41.7], scale: 22000 }, SC: { center: [-80.9, 33.8], scale: 5200 },
  SD: { center: [-100.2, 44.4], scale: 3200 }, TN: { center: [-86.3, 35.8], scale: 4400 },
  TX: { center: [-99.3, 31.5], scale: 1600 }, UT: { center: [-111.6, 39.3], scale: 3000 },
  VT: { center: [-72.6, 44.1], scale: 9000 }, VA: { center: [-78.7, 37.5], scale: 4400 },
  WA: { center: [-120.7, 47.4], scale: 3200 }, WV: { center: [-80.6, 38.6], scale: 5600 },
  WI: { center: [-89.8, 44.6], scale: 3600 }, WY: { center: [-107.6, 43.0], scale: 2800 }
};

export function CountyMap({
  stateCode,
  stateName,
  countyData
}: {
  stateCode: string;
  stateName: string;
  countyData: StateCountyData;
}) {
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const fips = stateFips[stateCode];
  const projection = projectionByState[stateCode];
  const countiesByFips = useMemo(
    () => new Map(countyData.counties.map((county) => [county.fips, county])),
    [countyData]
  );
  const selected = selectedCounty ? countiesByFips.get(selectedCounty) : undefined;
  const hovered = hoveredCounty ? countiesByFips.get(hoveredCounty) : undefined;

  if (!fips || !projection) return null;

  const mapCenter = center ?? projection.center;

  function handleZoomIn() {
    setZoom((z) => Math.min(z * 1.5, 8));
  }
  function handleZoomOut() {
    setZoom((z) => Math.max(z / 1.5, 1));
  }
  function handleReset() {
    setZoom(1);
    setCenter(null);
  }

  return (
    <section className="county-section" aria-labelledby="county-map-title">
      <h2 id="county-map-title">{stateName} counties</h2>
      <p className="county-program-summary">
        {countyData.program
          ? countyData.program.summary
          : `Select a county for local contact details. We have not yet added a verified county-level program for ${stateName}; county veterans affairs and assessment offices administer local benefits and can confirm current programs.`}
      </p>
      <div className="map-status" aria-live="polite">
        {hovered ? (
          <span role="tooltip">{hovered.name} County</span>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </div>
      <div className="county-map-frame">
        <div className="county-zoom-controls" role="group" aria-label="Map zoom controls">
          <button type="button" onClick={handleZoomIn} aria-label="Zoom in">+</button>
          <button type="button" onClick={handleZoomOut} aria-label="Zoom out">−</button>
          <button type="button" onClick={handleReset} aria-label="Reset map view">Reset</button>
        </div>
        <ComposableMap
          aria-label={`Map of ${stateName} counties. Choose a county for local details.`}
          role="group"
          projection="geoMercator"
          projectionConfig={{ center: projection.center, scale: projection.scale }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="us-map county-map"
        >
          <ZoomableGroup
            zoom={zoom}
            center={mapCenter}
            onMoveEnd={({ coordinates, zoom: z }) => {
              setCenter(coordinates as [number, number]);
              setZoom(z);
            }}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies
                  .filter((geography) => String(geography.id).startsWith(fips))
                  .map((geography) => {
                    const geoFips = String(geography.id).padStart(5, "0");
                    const name = geography.properties.name as string;
                    const isSelected = selectedCounty === geoFips;
                    const isHovered = hoveredCounty === geoFips;

                    return (
                      <Geography
                        key={geography.rsmKey}
                        geography={geography}
                        role="button"
                        tabIndex={0}
                        aria-label={`${name} County; view local details`}
                        aria-pressed={isSelected}
                        className="state-shape county-shape"
                        onMouseEnter={() => setHoveredCounty(geoFips)}
                        onMouseLeave={() => setHoveredCounty(null)}
                        onFocus={() => setHoveredCounty(geoFips)}
                        onBlur={() => setHoveredCounty(null)}
                        onClick={() => setSelectedCounty(geoFips)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCounty(geoFips);
                          }
                        }}
                        style={{
                          default: {
                            fill: isSelected || isHovered ? "#dc2626" : "#ffffff",
                            outline: "none"
                          },
                          hover: { fill: "#dc2626", outline: "none" },
                          pressed: { fill: "#dc2626", outline: "none" }
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <p className="map-hint">
        Select a county for local details. Pinch, scroll, or use the +/− buttons to zoom; drag to pan. Tab between counties, Enter to select.
      </p>

      {selected ? (
        <article className="county-detail" aria-labelledby="county-detail-title">
          <h3 id="county-detail-title">{selected.name} County</h3>
          {countyData.program ? (
            <>
              <p><strong>Program:</strong> {countyData.program.name} ({countyData.program.statute})</p>
              <p><strong>Exemption:</strong> {selected.exemption}</p>
              <p>
                <strong>Income requirement:</strong>{" "}
                {selected.income_limit ??
                  "This county applies a financial-need test, but we have not verified its current income limit from an official source. Contact the county office below."}
              </p>
              <div>
                <strong>Base eligibility (statewide):</strong>
                <ul>
                  {countyData.program.base_eligibility.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>How to apply:</strong>
                <ul>
                  {countyData.program.how_to_apply.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>
              We have not yet verified a county-level veteran benefit program for {selected.name} County.
              Contact the {selected.name} County veterans affairs office or county assessor for current
              local programs, including any property-tax relief for disabled veterans.
            </p>
          )}
          {selected.notes && <p className="benefit-meta">{selected.notes}</p>}
          <p className="benefit-meta">
            {selected.last_verified
              ? `County details checked ${selected.last_verified.toISOString().slice(0, 10)}`
              : "County-specific details not yet verified"}
          </p>
          {selected.source_url ? (
            <a href={selected.source_url} target="_blank" rel="noreferrer">
              {selected.source_name ?? `${selected.name} County official source`}
            </a>
          ) : countyData.program ? (
            <a href={countyData.program.source_url} target="_blank" rel="noreferrer">
              {countyData.program.source_name}
            </a>
          ) : null}
        </article>
      ) : (
        <p className="county-detail county-detail-empty">
          No county selected. Choose a county on the map for its income limit and exemption details.
        </p>
      )}
    </section>
  );
}
