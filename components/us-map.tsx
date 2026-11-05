"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography
} from "react-simple-maps";
import { stateRankings } from "@/data/state-rankings";
import { gradeForRank } from "@/lib/state-grade";

const GEO_URL = "/us-states.json";
const rankingsByName = new Map(stateRankings.map((ranking) => [ranking.name, ranking]));

export function USMap() {
  const router = useRouter();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const hoveredRanking = hoveredState ? rankingsByName.get(hoveredState) : undefined;

  function selectState(name: string) {
    const ranking = rankingsByName.get(name);
    if (!ranking) return;

    setSelectedState(ranking.abbreviation);
    router.push(`/check?state=${ranking.abbreviation}`);
  }

  return (
    <div className="map-shell">
      <div className="map-status" aria-live="polite">
        {hoveredState ? (
          <span role="tooltip">
            {hoveredState}
            {hoveredRanking && (
              <>
                {" · Rank #"}{hoveredRanking.rank}
                {" · Grade "}{gradeForRank(hoveredRanking.rank)}
              </>
            )}
          </span>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </div>
      <ComposableMap
        aria-label="Map of the United States. Choose Pennsylvania to begin."
        role="group"
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1050 }}
        width={960}
        height={600}
        className="us-map"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geography) => rankingsByName.has(geography.properties.name as string))
              .map((geography) => {
                const name = geography.properties.name as string;
                const ranking = rankingsByName.get(name);
                if (!ranking) return null;

                const abbreviation = ranking.abbreviation;
                const isSelected = selectedState === abbreviation;
                const isHovered = hoveredState === name;

                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    role="button"
                    tabIndex={0}
                    aria-label={`${name}, rank ${ranking.rank} of 50, grade ${gradeForRank(ranking.rank)}; view state benefits`}
                    aria-pressed={isSelected}
                    className="state-shape"
                    onMouseEnter={() => {
                      setHoveredState(name);
                    }}
                    onMouseLeave={() => setHoveredState(null)}
                    onFocus={() => {
                      setHoveredState(name);
                    }}
                    onBlur={() => setHoveredState(null)}
                    onClick={() => selectState(name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectState(name);
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
        Select any state to browse benefits. Hover or tab to see its rank and grade.
      </p>
      <section className="ranking-list" aria-labelledby="ranking-list-title">
        <h2 id="ranking-list-title">State rankings</h2>
        <p>Hover over a state to see its rank and grade.</p>
        <ol>
          {stateRankings.map((ranking) => (
            <li key={ranking.abbreviation}>
              <span>#{ranking.rank} {ranking.name}</span>
              <span className="ranking-grade" aria-label={`Grade ${gradeForRank(ranking.rank)}`}>
                {gradeForRank(ranking.rank)}
              </span>
            </li>
          ))}
        </ol>
        <p className="ranking-source">
          Comparison source:{" "}
          <a href="https://wallethub.com/edu/best-states-for-military-retirees/3915"
            target="_blank" rel="noreferrer">
            WalletHub&apos;s Best &amp; Worst States for Military Retirees
          </a>
          . It measures overall retirement conditions, not state benefits alone. Grades
          are our own rank bands. Accessed 2026-11-05; D.C. excluded.
        </p>
      </section>
    </div>
  );
}
