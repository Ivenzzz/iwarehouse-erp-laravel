import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/shared/components/ui/combobox";
import { AlertCircle, Loader2, MapPinned, RefreshCcw, UserPlus } from "lucide-react";

import {
  fetchPsgcBarangaysByCityMunicipality,
  fetchPsgcCitiesMunicipalitiesByProvince,
  fetchPsgcCitiesMunicipalitiesByRegion,
  fetchPsgcProvincesByRegion,
  fetchPsgcRegions,
} from "@/features/pos/sale/services/psgcService";

const EMPTY_LOADING_STATE = {
  regions: false,
  provinces: false,
  cities: false,
  barangays: false,
};

const EMPTY_ERROR_STATE = {
  regions: "",
  provinces: "",
  cities: "",
  barangays: "",
};

const EMPTY_OPTION_LIST = [];

export default function CustomerDialog({
  open,
  onOpenChange,
  newCustomer,
  setNewCustomer,
  currentCustomerId = null,
  dialogTitle = "Add New Customer",
  submitLabel = "Create Customer",
  onCreateCustomer,
  customers = [],
}) {
  const normalizedPhone = (newCustomer.phone || "").trim();
  const isDuplicate = customers.some((customer) => customer.id !== currentCustomerId && customer.phone === normalizedPhone);

  const [regionOptions, setRegionOptions] = useState(EMPTY_OPTION_LIST);
  const [provinceOptions, setProvinceOptions] = useState(EMPTY_OPTION_LIST);
  const [cityOptions, setCityOptions] = useState(EMPTY_OPTION_LIST);
  const [barangayOptions, setBarangayOptions] = useState(EMPTY_OPTION_LIST);
  const [loadingState, setLoadingState] = useState(EMPTY_LOADING_STATE);
  const [errorState, setErrorState] = useState(EMPTY_ERROR_STATE);
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");

  const address = newCustomer.address_json || {};
  const requiresProvinceSelection = Boolean(selectedRegionCode) && !loadingState.provinces && provinceOptions.length > 0;
  const usesRegionLevelCities = Boolean(selectedRegionCode) && !loadingState.provinces && provinceOptions.length === 0 && !errorState.provinces;
  const isBusy = Object.values(loadingState).some(Boolean);
  const hasBlockingError = Object.values(errorState).some(Boolean);
  const hasBasicInformation = Boolean(
    (newCustomer.first_name || "").trim()
    && (newCustomer.last_name || "").trim()
    && normalizedPhone,
  );
  const hasCompletePsgcSelection = Boolean(
    selectedRegionCode
    && selectedCityCode
    && selectedBarangayCode
    && (!requiresProvinceSelection || selectedProvinceCode),
  );
  const canSubmit = hasBasicInformation && hasCompletePsgcSelection && !hasBlockingError && !isBusy && !isDuplicate;

  const regionLabelByCode = useMemo(
    () => new Map(regionOptions.map((option) => [String(option.value), option.label])),
    [regionOptions],
  );
  const provinceLabelByCode = useMemo(
    () => new Map(provinceOptions.map((option) => [String(option.value), option.label])),
    [provinceOptions],
  );
  const cityLabelByCode = useMemo(
    () => new Map(cityOptions.map((option) => [String(option.value), option.label])),
    [cityOptions],
  );
  const barangayLabelByCode = useMemo(
    () => new Map(barangayOptions.map((option) => [String(option.value), option.label])),
    [barangayOptions],
  );

  const updateAddress = (key, value) => {
    setNewCustomer((previous) => ({
      ...previous,
      address_json: {
        ...(previous.address_json || {}),
        [key]: value,
      },
    }));
  };

  const updateAddressFields = (updates) => {
    setNewCustomer((previous) => ({
      ...previous,
      address_json: {
        ...(previous.address_json || {}),
        ...updates,
      },
    }));
  };

  const resetDependentSelections = (level) => {
    if (level === "region") {
      setSelectedProvinceCode("");
      setSelectedCityCode("");
      setSelectedBarangayCode("");
      setProvinceOptions(EMPTY_OPTION_LIST);
      setCityOptions(EMPTY_OPTION_LIST);
      setBarangayOptions(EMPTY_OPTION_LIST);
      setErrorState((previous) => ({
        ...previous,
        provinces: "",
        cities: "",
        barangays: "",
      }));
      return;
    }

    if (level === "province") {
      setSelectedCityCode("");
      setSelectedBarangayCode("");
      setCityOptions(EMPTY_OPTION_LIST);
      setBarangayOptions(EMPTY_OPTION_LIST);
      setErrorState((previous) => ({
        ...previous,
        cities: "",
        barangays: "",
      }));
      return;
    }

    if (level === "city") {
      setSelectedBarangayCode("");
      setBarangayOptions(EMPTY_OPTION_LIST);
      setErrorState((previous) => ({
        ...previous,
        barangays: "",
      }));
    }
  };

  const loadRegions = async () => {
    setLoadingState((previous) => ({ ...previous, regions: true }));
    setErrorState((previous) => ({ ...previous, regions: "" }));

    try {
      const options = await fetchPsgcRegions();
      setRegionOptions(options);
    } catch (error) {
      setErrorState((previous) => ({
        ...previous,
        regions: "Unable to load PSGC regions. Please retry.",
      }));
    } finally {
      setLoadingState((previous) => ({ ...previous, regions: false }));
    }
  };

  const loadProvinces = async (regionCode) => {
    setLoadingState((previous) => ({ ...previous, provinces: true }));
    setErrorState((previous) => ({ ...previous, provinces: "" }));

    try {
      const options = await fetchPsgcProvincesByRegion(regionCode);
      setProvinceOptions(options);
    } catch (error) {
      setErrorState((previous) => ({
        ...previous,
        provinces: "Unable to load provinces. Please retry.",
      }));
      setProvinceOptions(EMPTY_OPTION_LIST);
    } finally {
      setLoadingState((previous) => ({ ...previous, provinces: false }));
    }
  };

  const loadCities = async ({ regionCode, provinceCode }) => {
    setLoadingState((previous) => ({ ...previous, cities: true }));
    setErrorState((previous) => ({ ...previous, cities: "" }));

    try {
      const options = provinceCode
        ? await fetchPsgcCitiesMunicipalitiesByProvince(provinceCode)
        : await fetchPsgcCitiesMunicipalitiesByRegion(regionCode);
      setCityOptions(options);
    } catch (error) {
      setErrorState((previous) => ({
        ...previous,
        cities: "Unable to load cities and municipalities. Please retry.",
      }));
      setCityOptions(EMPTY_OPTION_LIST);
    } finally {
      setLoadingState((previous) => ({ ...previous, cities: false }));
    }
  };

  const loadBarangays = async (cityCode) => {
    setLoadingState((previous) => ({ ...previous, barangays: true }));
    setErrorState((previous) => ({ ...previous, barangays: "" }));

    try {
      const options = await fetchPsgcBarangaysByCityMunicipality(cityCode);
      setBarangayOptions(options);
    } catch (error) {
      setErrorState((previous) => ({
        ...previous,
        barangays: "Unable to load barangays. Please retry.",
      }));
      setBarangayOptions(EMPTY_OPTION_LIST);
    } finally {
      setLoadingState((previous) => ({ ...previous, barangays: false }));
    }
  };

  useEffect(() => {
    if (!open || regionOptions.length > 0 || loadingState.regions || errorState.regions) {
      return;
    }

    loadRegions();
  }, [open, regionOptions.length, loadingState.regions, errorState.regions]);

  useEffect(() => {
    if (!open || !selectedRegionCode) {
      return;
    }

    loadProvinces(selectedRegionCode);
  }, [open, selectedRegionCode]);

  useEffect(() => {
    if (!open || !selectedRegionCode || loadingState.provinces || errorState.provinces) {
      return;
    }

    if (requiresProvinceSelection || !usesRegionLevelCities) {
      return;
    }

    loadCities({ regionCode: selectedRegionCode });
  }, [open, selectedRegionCode, loadingState.provinces, errorState.provinces, requiresProvinceSelection, usesRegionLevelCities]);

  useEffect(() => {
    if (!open || !selectedProvinceCode) {
      return;
    }

    loadCities({ regionCode: selectedRegionCode, provinceCode: selectedProvinceCode });
  }, [open, selectedProvinceCode, selectedRegionCode]);

  useEffect(() => {
    if (!open || !selectedCityCode) {
      return;
    }

    loadBarangays(selectedCityCode);
  }, [open, selectedCityCode]);

  useEffect(() => {
    const hasResetDraft = !open
      && !address.region
      && !address.province
      && !address.city_municipality
      && !address.barangay
      && !address.street
      && !address.postal_code;

    if (!hasResetDraft) {
      return;
    }

    setSelectedRegionCode("");
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setSelectedBarangayCode("");
    setProvinceOptions(EMPTY_OPTION_LIST);
    setCityOptions(EMPTY_OPTION_LIST);
    setBarangayOptions(EMPTY_OPTION_LIST);
    setErrorState(EMPTY_ERROR_STATE);
  }, [open, address.region, address.province, address.city_municipality, address.barangay, address.street, address.postal_code]);

  const handleRegionChange = (regionCode) => {
    setSelectedRegionCode(regionCode);
    setLoadingState((previous) => ({ ...previous, provinces: Boolean(regionCode), cities: false, barangays: false }));
    resetDependentSelections("region");

    updateAddressFields({
      country: "Philippines",
      country_code: "PH",
      region: regionLabelByCode.get(regionCode) || "",
      province: "",
      city_municipality: "",
      barangay: "",
    });
  };

  const handleProvinceChange = (provinceCode) => {
    setSelectedProvinceCode(provinceCode);
    resetDependentSelections("province");

    updateAddressFields({
      province: provinceLabelByCode.get(provinceCode) || "",
      city_municipality: "",
      barangay: "",
    });
  };

  const handleCityChange = (cityCode) => {
    setSelectedCityCode(cityCode);
    resetDependentSelections("city");

    updateAddressFields({
      city_municipality: cityLabelByCode.get(cityCode) || "",
      barangay: "",
    });
  };

  const handleBarangayChange = (barangayCode) => {
    setSelectedBarangayCode(barangayCode);

    updateAddress("barangay", barangayLabelByCode.get(barangayCode) || "");
  };

  const renderRetry = (level, onRetry) => (
    <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      <span>{errorState[level]}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-7 gap-1 px-2 text-xs">
        <RefreshCcw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-slate-100 text-xl font-bold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div className="space-y-4 border-b border-gray-100 pb-2 md:col-span-2 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-cyan-400">
              <UserPlus className="h-4 w-4" />
              Basic Information
            </h3>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">First Name</Label>
            <Input
              value={newCustomer.first_name || ""}
              onChange={(event) => setNewCustomer((previous) => ({ ...previous, first_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Last Name</Label>
            <Input
              value={newCustomer.last_name || ""}
              onChange={(event) => setNewCustomer((previous) => ({ ...previous, last_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Phone</Label>
            <Input
              value={newCustomer.phone || ""}
              onChange={(event) => setNewCustomer((previous) => ({ ...previous, phone: event.target.value }))}
            />
            {isDuplicate && (
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                A customer with this phone number already exists.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Email</Label>
            <Input
              type="email"
              value={newCustomer.email || ""}
              onChange={(event) => setNewCustomer((previous) => ({ ...previous, email: event.target.value }))}
            />
          </div>

          <div className="space-y-4 border-b border-gray-100 pb-2 mt-2 md:col-span-2 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-cyan-400">
              <MapPinned className="h-4 w-4" />
              Address
            </h3>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-700 dark:text-slate-300">Street</Label>
            <Input
              value={address.street || ""}
              onChange={(event) => updateAddress("street", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-700 dark:text-slate-300">Country</Label>
            <Input value="Philippines" readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Region</Label>
            <Combobox
              value={selectedRegionCode}
              onValueChange={handleRegionChange}
              options={regionOptions}
              loading={loadingState.regions}
              placeholder={loadingState.regions ? "Loading regions..." : "Select region"}
              searchPlaceholder="Search regions..."
              emptyText="No regions found"
              disabled={loadingState.regions}
            />
            {errorState.regions ? renderRetry("regions", loadRegions) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Province</Label>
            {usesRegionLevelCities ? (
              <Input value="Not applicable for selected region" readOnly disabled />
            ) : (
              <Combobox
                value={selectedProvinceCode}
                onValueChange={handleProvinceChange}
                options={provinceOptions}
                loading={loadingState.provinces}
                placeholder={
                  !selectedRegionCode
                    ? "Select region first"
                    : loadingState.provinces
                      ? "Loading provinces..."
                      : "Select province"
                }
                searchPlaceholder="Search provinces..."
                emptyText="No provinces found"
                disabled={!selectedRegionCode || loadingState.provinces || Boolean(errorState.regions)}
              />
            )}
            {errorState.provinces ? renderRetry("provinces", () => loadProvinces(selectedRegionCode)) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">City / Municipality</Label>
            <Combobox
              value={selectedCityCode}
              onValueChange={handleCityChange}
              options={cityOptions}
              loading={loadingState.cities}
              placeholder={
                !selectedRegionCode
                  ? "Select region first"
                  : requiresProvinceSelection && !selectedProvinceCode
                    ? "Select province first"
                    : loadingState.cities
                      ? "Loading cities / municipalities..."
                      : "Select city / municipality"
              }
              searchPlaceholder="Search cities or municipalities..."
              emptyText="No city or municipality found"
              disabled={
                !selectedRegionCode
                || (requiresProvinceSelection && !selectedProvinceCode)
                || loadingState.cities
                || Boolean(errorState.regions)
                || Boolean(errorState.provinces)
              }
            />
            {errorState.cities ? renderRetry("cities", () => loadCities({
              regionCode: selectedRegionCode,
              provinceCode: requiresProvinceSelection ? selectedProvinceCode : "",
            })) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Barangay</Label>
            <Combobox
              value={selectedBarangayCode}
              onValueChange={handleBarangayChange}
              options={barangayOptions}
              loading={loadingState.barangays}
              placeholder={
                !selectedCityCode
                  ? "Select city / municipality first"
                  : loadingState.barangays
                    ? "Loading barangays..."
                    : "Select barangay"
              }
              searchPlaceholder="Search barangays..."
              emptyText="No barangay found"
              disabled={!selectedCityCode || loadingState.barangays || Boolean(errorState.cities)}
            />
            {errorState.barangays ? renderRetry("barangays", () => loadBarangays(selectedCityCode)) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-slate-300">Postal Code</Label>
            <Input
              value={address.postal_code || ""}
              onChange={(event) => updateAddress("postal_code", event.target.value)}
            />
          </div>

          {!canSubmit && (hasBlockingError || isBusy) ? (
            <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {isBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading PSGC address data...
                </span>
              ) : (
                "Customer creation is disabled until all PSGC address selectors are completed."
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreateCustomer} disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
