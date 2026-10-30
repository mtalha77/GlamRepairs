/**
 * The IANA timezones in each country GlamRepairs prices or recruits in
 * (Talha, 29 October 2026: "selection of timezone should be according to
 * the region"). The first zone is the most populous and is the default when
 * the country is picked. A practitioner's weekly hours are generated in the
 * zone chosen here, so it has to be one that really exists in their country.
 *
 * Add a country here when it is added to Studio → Countries.
 */
export const COUNTRY_TIMEZONES: Record<string, string[]> = {
  PK: ["Asia/Karachi"],
  AE: ["Asia/Dubai"],
  GB: ["Europe/London"],
  IN: ["Asia/Kolkata"],
  NG: ["Africa/Lagos"],
  US: [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  AU: [
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Adelaide",
    "Australia/Perth",
    "Australia/Darwin",
    "Australia/Hobart",
  ],
  BD: ["Asia/Dhaka"],
  BH: ["Asia/Bahrain"],
  BR: ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Belem", "America/Cuiaba", "America/Rio_Branco"],
  CA: [
    "America/Toronto",
    "America/Vancouver",
    "America/Edmonton",
    "America/Winnipeg",
    "America/Halifax",
    "America/Regina",
    "America/St_Johns",
  ],
  DE: ["Europe/Berlin"],
  EG: ["Africa/Cairo"],
  ES: ["Europe/Madrid", "Atlantic/Canary"],
  ET: ["Africa/Addis_Ababa"],
  FR: ["Europe/Paris"],
  GH: ["Africa/Accra"],
  ID: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"],
  IE: ["Europe/Dublin"],
  IT: ["Europe/Rome"],
  JO: ["Asia/Amman"],
  KE: ["Africa/Nairobi"],
  KW: ["Asia/Kuwait"],
  LK: ["Asia/Colombo"],
  MA: ["Africa/Casablanca"],
  MX: ["America/Mexico_City", "America/Cancun", "America/Monterrey", "America/Chihuahua", "America/Tijuana"],
  MY: ["Asia/Kuala_Lumpur"],
  NL: ["Europe/Amsterdam"],
  NP: ["Asia/Kathmandu"],
  NZ: ["Pacific/Auckland"],
  OM: ["Asia/Muscat"],
  PH: ["Asia/Manila"],
  PL: ["Europe/Warsaw"],
  QA: ["Asia/Qatar"],
  RW: ["Africa/Kigali"],
  SA: ["Asia/Riyadh"],
  SE: ["Europe/Stockholm"],
  TR: ["Europe/Istanbul"],
  TZ: ["Africa/Dar_es_Salaam"],
  UG: ["Africa/Kampala"],
  ZA: ["Africa/Johannesburg"],
};

export function timezonesFor(countryCode: string | null | undefined): string[] {
  return (countryCode && COUNTRY_TIMEZONES[countryCode.toUpperCase()]) || [];
}

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Lagos (UTC+1)", for a select option. */
export function timezoneLabel(zone: string, at = new Date()): string {
  const city = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
  try {
    const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${city} (${offset.replace("GMT", "UTC")})` : city;
  } catch {
    return city;
  }
}
