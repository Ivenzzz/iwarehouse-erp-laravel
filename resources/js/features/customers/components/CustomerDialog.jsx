import { buildCustomerFormData } from '@/features/customers/lib/customerForm';
import {
    fetchPsgcBarangaysByCityMunicipality,
    fetchPsgcCitiesMunicipalitiesByProvince,
    fetchPsgcCitiesMunicipalitiesByRegion,
    fetchPsgcProvincesByRegion,
    fetchPsgcRegions,
} from '@/features/pos/lib/services/sale/psgcService';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Combobox } from '@/shared/components/ui/combobox';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useForm } from '@inertiajs/react';
import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const EMPTY_LIST = [];
const EMPTY_LOADING = { regions: false, provinces: false, cities: false, barangays: false };
const EMPTY_ERRORS = { regions: '', provinces: '', cities: '', barangays: '' };

export default function CustomerDialog({
    open,
    onOpenChange,
    customer = null,
    customerGroups = [],
    customerTypes = [],
    statuses = [],
}) {
    const isEditing = customer !== null;
    const form = useForm(buildCustomerFormData(customer, customerGroups, customerTypes));
    const [regionOptions, setRegionOptions] = useState(EMPTY_LIST);
    const [provinceOptions, setProvinceOptions] = useState(EMPTY_LIST);
    const [cityOptions, setCityOptions] = useState(EMPTY_LIST);
    const [barangayOptions, setBarangayOptions] = useState(EMPTY_LIST);
    const [loadingState, setLoadingState] = useState(EMPTY_LOADING);
    const [errorState, setErrorState] = useState(EMPTY_ERRORS);
    const [selectedRegionCode, setSelectedRegionCode] = useState('');
    const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
    const [selectedCityCode, setSelectedCityCode] = useState('');
    const [selectedBarangayCode, setSelectedBarangayCode] = useState('');

    useEffect(() => {
        form.setData(buildCustomerFormData(customer, customerGroups, customerTypes));
        form.clearErrors();
        setSelectedRegionCode('');
        setSelectedProvinceCode('');
        setSelectedCityCode('');
        setSelectedBarangayCode('');
        setProvinceOptions(EMPTY_LIST);
        setCityOptions(EMPTY_LIST);
        setBarangayOptions(EMPTY_LIST);
        setErrorState(EMPTY_ERRORS);
    }, [customer]);

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

    const requiresProvinceSelection = Boolean(selectedRegionCode) && !loadingState.provinces && provinceOptions.length > 0;
    const usesRegionLevelCities = Boolean(selectedRegionCode) && !loadingState.provinces && provinceOptions.length === 0 && !errorState.provinces;
    const hasCompletePsgcSelection = Boolean(
        form.data.region &&
            form.data.city_municipality &&
            form.data.barangay &&
            (!requiresProvinceSelection || form.data.province),
    );
    const hasPsgcError = Object.values(errorState).some(Boolean);
    const isLoadingPsgc = Object.values(loadingState).some(Boolean);

    const loadRegions = async () => {
        setLoadingState((previous) => ({ ...previous, regions: true }));
        setErrorState((previous) => ({ ...previous, regions: '' }));

        try {
            setRegionOptions(await fetchPsgcRegions());
        } catch {
            setErrorState((previous) => ({ ...previous, regions: 'Unable to load PSGC regions.' }));
        } finally {
            setLoadingState((previous) => ({ ...previous, regions: false }));
        }
    };

    const loadProvinces = async (regionCode) => {
        setLoadingState((previous) => ({ ...previous, provinces: true }));
        setErrorState((previous) => ({ ...previous, provinces: '' }));

        try {
            setProvinceOptions(await fetchPsgcProvincesByRegion(regionCode));
        } catch {
            setProvinceOptions(EMPTY_LIST);
            setErrorState((previous) => ({ ...previous, provinces: 'Unable to load provinces.' }));
        } finally {
            setLoadingState((previous) => ({ ...previous, provinces: false }));
        }
    };

    const loadCities = async ({ regionCode, provinceCode }) => {
        setLoadingState((previous) => ({ ...previous, cities: true }));
        setErrorState((previous) => ({ ...previous, cities: '' }));

        try {
            setCityOptions(
                provinceCode
                    ? await fetchPsgcCitiesMunicipalitiesByProvince(provinceCode)
                    : await fetchPsgcCitiesMunicipalitiesByRegion(regionCode),
            );
        } catch {
            setCityOptions(EMPTY_LIST);
            setErrorState((previous) => ({ ...previous, cities: 'Unable to load cities and municipalities.' }));
        } finally {
            setLoadingState((previous) => ({ ...previous, cities: false }));
        }
    };

    const loadBarangays = async (cityCode) => {
        setLoadingState((previous) => ({ ...previous, barangays: true }));
        setErrorState((previous) => ({ ...previous, barangays: '' }));

        try {
            setBarangayOptions(await fetchPsgcBarangaysByCityMunicipality(cityCode));
        } catch {
            setBarangayOptions(EMPTY_LIST);
            setErrorState((previous) => ({ ...previous, barangays: 'Unable to load barangays.' }));
        } finally {
            setLoadingState((previous) => ({ ...previous, barangays: false }));
        }
    };

    useEffect(() => {
        if (open && regionOptions.length === 0 && !loadingState.regions && !errorState.regions) {
            loadRegions();
        }
    }, [open, regionOptions.length, loadingState.regions, errorState.regions]);

    useEffect(() => {
        if (open && selectedRegionCode) {
            loadProvinces(selectedRegionCode);
        }
    }, [open, selectedRegionCode]);

    useEffect(() => {
        if (open && selectedRegionCode && usesRegionLevelCities) {
            loadCities({ regionCode: selectedRegionCode });
        }
    }, [open, selectedRegionCode, usesRegionLevelCities]);

    useEffect(() => {
        if (open && selectedProvinceCode) {
            loadCities({ regionCode: selectedRegionCode, provinceCode: selectedProvinceCode });
        }
    }, [open, selectedProvinceCode, selectedRegionCode]);

    useEffect(() => {
        if (open && selectedCityCode) {
            loadBarangays(selectedCityCode);
        }
    }, [open, selectedCityCode]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
    };

    const setData = (field, value) => form.setData(field, value);

    const handleRegionChange = (regionCode) => {
        setSelectedRegionCode(regionCode);
        setSelectedProvinceCode('');
        setSelectedCityCode('');
        setSelectedBarangayCode('');
        setProvinceOptions(EMPTY_LIST);
        setCityOptions(EMPTY_LIST);
        setBarangayOptions(EMPTY_LIST);
        form.setData({
            ...form.data,
            region: regionLabelByCode.get(regionCode) || '',
            province: '',
            city_municipality: '',
            barangay: '',
        });
    };

    const handleProvinceChange = (provinceCode) => {
        setSelectedProvinceCode(provinceCode);
        setSelectedCityCode('');
        setSelectedBarangayCode('');
        setCityOptions(EMPTY_LIST);
        setBarangayOptions(EMPTY_LIST);
        form.setData({
            ...form.data,
            province: provinceLabelByCode.get(provinceCode) || '',
            city_municipality: '',
            barangay: '',
        });
    };

    const handleCityChange = (cityCode) => {
        setSelectedCityCode(cityCode);
        setSelectedBarangayCode('');
        setBarangayOptions(EMPTY_LIST);
        form.setData({
            ...form.data,
            city_municipality: cityLabelByCode.get(cityCode) || '',
            barangay: '',
        });
    };

    const handleBarangayChange = (barangayCode) => {
        setSelectedBarangayCode(barangayCode);
        setData('barangay', barangayLabelByCode.get(barangayCode) || '');
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (isEditing) {
            form.put(route('customers.update', customer.id), options);
            return;
        }

        form.post(route('customers.store'), options);
    };

    const renderRetry = (level, onRetry) =>
        errorState[level] ? (
            <div className="flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>{errorState[level]}</span>
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    <RefreshCcw className="size-3" />
                    Retry
                </Button>
            </div>
        ) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
                    <DialogDescription>
                        Manage customer identity, primary contact, and primary address.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
                        <section className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="customer-kind">Customer Kind</Label>
                                <select
                                    id="customer-kind"
                                    value={form.data.customer_kind}
                                    onChange={(event) => setData('customer_kind', event.target.value)}
                                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <option value="person">Person</option>
                                    <option value="organization">Organization</option>
                                </select>
                                <InputError message={form.errors.customer_kind} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-status">Status</Label>
                                <select
                                    id="customer-status"
                                    value={form.data.status}
                                    onChange={(event) => setData('status', event.target.value)}
                                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.status} />
                            </div>

                            {form.data.customer_kind === 'person' ? (
                                <>
                                    <Field id="firstname" label="First Name" value={form.data.firstname} error={form.errors.firstname} onChange={(value) => setData('firstname', value)} />
                                    <Field id="lastname" label="Last Name" value={form.data.lastname} error={form.errors.lastname} onChange={(value) => setData('lastname', value)} />
                                </>
                            ) : (
                                <Field id="organization-name" label="Organization Name" value={form.data.organization_name} error={form.errors.organization_name} onChange={(value) => setData('organization_name', value)} className="md:col-span-2" />
                            )}

                            <Field id="legal-name" label="Legal Name" value={form.data.legal_name} error={form.errors.legal_name} onChange={(value) => setData('legal_name', value)} />
                            <Field id="tax-id" label="Tax ID" value={form.data.tax_id} error={form.errors.tax_id} onChange={(value) => setData('tax_id', value)} />
                            <Field id="date-of-birth" label="Date of Birth" type="date" value={form.data.date_of_birth} error={form.errors.date_of_birth} onChange={(value) => setData('date_of_birth', value)} />

                            <div className="space-y-2">
                                <Label htmlFor="customer-group">Group</Label>
                                <select id="customer-group" value={form.data.customer_group_id} onChange={(event) => setData('customer_group_id', event.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                                    {customerGroups.map((group) => <option key={group.id} value={String(group.id)}>{group.name}</option>)}
                                </select>
                                <InputError message={form.errors.customer_group_id} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-type">Type</Label>
                                <select id="customer-type" value={form.data.customer_type_id} onChange={(event) => setData('customer_type_id', event.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                                    {customerTypes.map((type) => <option key={type.id} value={String(type.id)}>{type.name}</option>)}
                                </select>
                                <InputError message={form.errors.customer_type_id} />
                            </div>
                        </section>

                        <section className="grid gap-4 md:grid-cols-2">
                            <h3 className="text-sm font-semibold text-slate-800 md:col-span-2">Primary Contact</h3>
                            <Field id="contact-firstname" label="Contact First Name" value={form.data.contact_firstname} error={form.errors.contact_firstname} onChange={(value) => setData('contact_firstname', value)} />
                            <Field id="contact-lastname" label="Contact Last Name" value={form.data.contact_lastname} error={form.errors.contact_lastname} onChange={(value) => setData('contact_lastname', value)} />
                            <Field id="email" label="Email" type="email" value={form.data.email} error={form.errors.email} onChange={(value) => setData('email', value)} />
                            <Field id="phone" label="Phone" value={form.data.phone} error={form.errors.phone} onChange={(value) => setData('phone', value)} />
                        </section>

                        <section className="grid gap-4 md:grid-cols-2">
                            <h3 className="text-sm font-semibold text-slate-800 md:col-span-2">Primary Address</h3>
                            <Field id="street" label="Street" value={form.data.street} error={form.errors.street} onChange={(value) => setData('street', value)} className="md:col-span-2" />
                            <div className="space-y-2">
                                <Label>Region</Label>
                                <Combobox value={selectedRegionCode} onValueChange={handleRegionChange} options={regionOptions} loading={loadingState.regions} placeholder={form.data.region || 'Select region'} searchPlaceholder="Search regions..." disabled={loadingState.regions} />
                                {renderRetry('regions', loadRegions)}
                                <InputError message={form.errors.region} />
                            </div>
                            <div className="space-y-2">
                                <Label>Province</Label>
                                {usesRegionLevelCities ? (
                                    <Input value="Not applicable for selected region" disabled readOnly />
                                ) : (
                                    <Combobox value={selectedProvinceCode} onValueChange={handleProvinceChange} options={provinceOptions} loading={loadingState.provinces} placeholder={form.data.province || 'Select province'} searchPlaceholder="Search provinces..." disabled={!selectedRegionCode || loadingState.provinces || Boolean(errorState.regions)} />
                                )}
                                {renderRetry('provinces', () => loadProvinces(selectedRegionCode))}
                                <InputError message={form.errors.province} />
                            </div>
                            <div className="space-y-2">
                                <Label>City / Municipality</Label>
                                <Combobox value={selectedCityCode} onValueChange={handleCityChange} options={cityOptions} loading={loadingState.cities} placeholder={form.data.city_municipality || 'Select city / municipality'} searchPlaceholder="Search cities or municipalities..." disabled={!selectedRegionCode || (requiresProvinceSelection && !selectedProvinceCode) || loadingState.cities || Boolean(errorState.provinces)} />
                                {renderRetry('cities', () => loadCities({ regionCode: selectedRegionCode, provinceCode: selectedProvinceCode }))}
                                <InputError message={form.errors.city_municipality} />
                            </div>
                            <div className="space-y-2">
                                <Label>Barangay</Label>
                                <Combobox value={selectedBarangayCode} onValueChange={handleBarangayChange} options={barangayOptions} loading={loadingState.barangays} placeholder={form.data.barangay || 'Select barangay'} searchPlaceholder="Search barangays..." disabled={!selectedCityCode || loadingState.barangays || Boolean(errorState.cities)} />
                                {renderRetry('barangays', () => loadBarangays(selectedCityCode))}
                                <InputError message={form.errors.barangay} />
                            </div>
                            <Field id="postal-code" label="Postal Code" value={form.data.postal_code} error={form.errors.postal_code} onChange={(value) => setData('postal_code', value)} />
                        </section>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={form.processing || !hasCompletePsgcSelection || hasPsgcError || isLoadingPsgc}>
                            {isEditing ? 'Save Changes' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({ id, label, value, onChange, error, type = 'text', className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
            <InputError message={error} />
        </div>
    );
}
