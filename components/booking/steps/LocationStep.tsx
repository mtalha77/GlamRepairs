"use client";

import { useEffect, useRef, useState } from "react";
import { StepBody, StepHeader, StepRequiredError } from "@/components/steps";
import {
  useStepAnswer,
  useStepGate,
  useStepRequiredError,
} from "@/lib/funnel/useStepAnswer";
import {
  fetchEnvironment,
  formatCityLabel,
  searchCities,
  type CityResult,
  type EnvironmentData,
} from "@/lib/funnel/geo";

const inputClassName =
  "w-full rounded-2xl border border-brand-border-light/70 bg-white px-4 py-3.5 text-sm text-brand-ink shadow-sm outline-none transition-colors placeholder:text-brand-gray/45 focus:border-brand-primary sm:py-4 sm:text-[15px]";

function PollutionIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7 text-brand-light sm:h-8 sm:w-8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 20H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 20V12H10V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 20V8H16V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 20V14H20V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function UvIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-brand-light sm:h-8 sm:w-8" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2V4M12 20V22M2 12H4M20 12H22M4.9 4.9L6.3 6.3M17.7 17.7L19.1 19.1M19.1 4.9L17.7 6.3M6.3 17.7L4.9 19.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HumidityIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-brand-light sm:h-8 sm:w-8" fill="none">
      <path
        d="M12 3C12 3 5 10.5 5 15a7 7 0 1014 0c0-4.5-7-12-7-12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EnvironmentStat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <span className="flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9">
        {children}
      </span>
      <span className="mt-2 text-[11px] capitalize text-brand-gray sm:text-xs">
        {label}
      </span>
      <span className="mt-0.5 text-sm font-semibold text-brand-ink sm:text-[0.9375rem]">
        {value}
      </span>
    </div>
  );
}

export default function LocationStep() {
  const [location, setLocation] = useStepAnswer<string>("booking.location", "");
  const [lat, setLat] = useStepAnswer<number | null>("booking.locationLat", null);
  const [lon, setLon] = useStepAnswer<number | null>("booking.locationLon", null);
  useStepGate(location.trim().length > 0);
  const error = useStepRequiredError(
    location.trim().length === 0,
    "Location is required.",
  );

  const [query, setQuery] = useState(location);
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [env, setEnv] = useState<EnvironmentData | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const selectedLabelRef = useRef(location);

  // Debounced city search (skips when the input still equals the chosen city).
  useEffect(() => {
    if (query === selectedLabelRef.current || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const cities = await searchCities(query, controller.signal);
        setResults(cities);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  // Load environment data for an already-selected city (e.g. on revisit).
  useEffect(() => {
    if (lat === null || lon === null) return;
    const controller = new AbortController();
    let active = true;

    void (async () => {
      setEnvLoading(true);
      try {
        const data = await fetchEnvironment(lat, lon, controller.signal);
        if (active) setEnv(data);
      } catch {
        if (active) setEnv(null);
      } finally {
        if (active) setEnvLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [lat, lon]);

  const handleSelect = (city: CityResult) => {
    const label = formatCityLabel(city);
    selectedLabelRef.current = label;
    setLocation(label);
    setQuery(label);
    setLat(city.latitude);
    setLon(city.longitude);
    setResults([]);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    // Clear a previous selection if the user edits the field.
    if (value !== selectedLabelRef.current) {
      selectedLabelRef.current = "";
      setLocation("");
      setLat(null);
      setLon(null);
    }
  };

  const showStats = location.trim().length > 0;
  const cityName = location.split(",")[0]?.trim();
  const headingTitle = cityName ? `I live in ${cityName}` : "I live in.....";

  return (
    <div>
      <StepHeader
        title={headingTitle}
        subtitle="Your local climate, air quality, and sun exposure impact your skin. We use location to tailor our recommendations"
      />

      <StepBody>
        <div
          className={`relative ${
            results.length > 0 || searching ? "z-50 mb-48 sm:mb-52" : ""
          }`}
        >
          <label htmlFor="location" className="sr-only">
            City, Country
          </label>
          <input
            id="location"
            name="location"
            type="text"
            autoComplete="off"
            placeholder="Search your city..."
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            className={inputClassName}
          />

          {(results.length > 0 || searching) && (
            <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-2xl border border-brand-border-light/70 bg-white py-1 shadow-lg">
              {searching && results.length === 0 ? (
                <li className="px-4 py-2.5 text-sm text-brand-gray">Searching...</li>
              ) : (
                results.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(city)}
                      className="flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-brand-purple-soft/40"
                    >
                      <span className="text-sm text-brand-ink sm:text-[0.9375rem]">
                        {city.name}
                      </span>
                      <span className="text-xs text-brand-gray">
                        {[city.admin1, city.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <StepRequiredError message={error} />

        {showStats && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-brand-border-light/50 bg-white px-4 py-4 shadow-sm sm:mt-6 sm:gap-4 sm:px-5 sm:py-5">
            <EnvironmentStat
              label="UV index"
              value={
                envLoading
                  ? "..."
                  : env?.uvIndex != null
                    ? String(Math.round(env.uvIndex))
                    : "—"
              }
            >
              <UvIcon />
            </EnvironmentStat>
            <EnvironmentStat
              label="Humidity"
              value={
                envLoading
                  ? "..."
                  : env?.humidity != null
                    ? `${Math.round(env.humidity)}%`
                    : "—"
              }
            >
              <HumidityIcon />
            </EnvironmentStat>
            <EnvironmentStat
              label="Pollution (AQI)"
              value={
                envLoading
                  ? "..."
                  : env?.aqi != null
                    ? String(Math.round(env.aqi))
                    : "—"
              }
            >
              <PollutionIcon />
            </EnvironmentStat>
          </div>
        )}
      </StepBody>
    </div>
  );
}
