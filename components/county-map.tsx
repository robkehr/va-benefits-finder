"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography
} from "react-simple-maps";
import type { StateCountyData } from "@/lib/county-schema";
import { stateFips } from "@/lib/state-fips";

const GEO_URL = "/us-counties.json";

const projectionByState: Record<string, { center: [number, number]; scale: number }> = {
  PA: { center: [-77.75, 41.1], scale: 8000 }
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
  const fips = stateFips[stateCode];
  const projection = projectionByState[stateCode];
  const countiesByName = new Map(countyData.counties.map((county) => [county.name, county]));
  const selected = selectedCounty ? countiesByName.get(selectedCounty) : undefined;

  if (!fips || !projection) return null;

  return (
    <section className="county-section" aria-labelledby="county-map-title">
      <h2 id="county-map-title">{stateName} counties</h2>
      <p className="county-program-summary">{countyData.program.summary}</p>
      <div className="map-status" aria-live="polite">
        {hoveredCounty ? (
          <span role="tooltip">{hoveredCounty} County</span>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </div>
      <ComposableMap
        aria-label={`Map of ${stateName} counties. Choose a county for local details.`}
        role="group"
        projection="geoMercator"
        projectionConfig={{ center: projection.center, scale: projection.scale }}
        width={960}
        height={560}
        className="us-map county-map"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geography) => String(geography.id).startsWith(fips))
              .map((geography) => {
                const name = geography.properties.name as string;
                const isSelected = selectedCounty === name;
                const isHovered = hoveredCounty === name;

                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    role="button"
                    tabIndex={0}
                    aria-label={`${name} County; view local details`}
                    aria-pressed={isSelected}
                    className="state-shape county-shape"
                    onMouseEnter={() => setHoveredCounty(name)}
                    onMouseLeave={() => setHoveredCounty(null)}
                    onFocus={() => setHoveredCounty(name)}
                    onBlur={() => setHoveredCounty(null)}
                    onClick={() => setSelectedCounty(name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCounty(name);
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
      </ComposableMap>
      <p className="map-hint">
        Select a county to see local property-tax exemption details. Tab between counties, Enter to select.
      </p>

      {selected ? (
        <article className="county-detail" aria-labelledby="county-detail-title">
          <h3 id="county-detail-title">{selected.name} County</h3>
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
          ) : (
            <a href={countyData.program.source_url} target="_blank" rel="noreferrer">
              {countyData.program.source_name}
            </a>
          )}
        </article>
      ) : (
        <p className="county-detail county-detail-empty">
          No county selected. Choose a county on the map for its income limit and exemption details.
        </p>
      )}
    </section>
  );
}
