const PSGC_API_BASE = "https://psgc.gitlab.io/api";
const REQUEST_TIMEOUT_MS = 10000;

const requestCache = new Map();

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`PSGC request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const fetchCachedJson = async (url) => {
  if (!requestCache.has(url)) {
    const request = fetchWithTimeout(url).catch((error) => {
      requestCache.delete(url);
      throw error;
    });

    requestCache.set(url, request);
  }

  return requestCache.get(url);
};

const normalizeOptions = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry) => ({
      value: entry.code,
      label: entry.name,
      raw: entry,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

export const fetchPsgcRegions = async () =>
  normalizeOptions(await fetchCachedJson(`${PSGC_API_BASE}/regions/`));

export const fetchPsgcProvincesByRegion = async (regionCode) =>
  normalizeOptions(await fetchCachedJson(`${PSGC_API_BASE}/regions/${regionCode}/provinces/`));

export const fetchPsgcCitiesMunicipalitiesByRegion = async (regionCode) =>
  normalizeOptions(await fetchCachedJson(`${PSGC_API_BASE}/regions/${regionCode}/cities-municipalities/`));

export const fetchPsgcCitiesMunicipalitiesByProvince = async (provinceCode) =>
  normalizeOptions(await fetchCachedJson(`${PSGC_API_BASE}/provinces/${provinceCode}/cities-municipalities/`));

export const fetchPsgcBarangaysByCityMunicipality = async (cityMunicipalityCode) =>
  normalizeOptions(await fetchCachedJson(`${PSGC_API_BASE}/cities-municipalities/${cityMunicipalityCode}/barangays/`));
