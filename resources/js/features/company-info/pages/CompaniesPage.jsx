import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, useForm, usePage } from '@inertiajs/react';

function buildFormData(company) {
    return {
        company_name: company?.company_name ?? '',
        legal_name: company?.legal_name ?? '',
        tax_id: company?.tax_id ?? '',
        address: company?.address ?? '',
        phone: company?.phone ?? '',
        email: company?.email ?? '',
        website: company?.website ?? '',
        logo: null,
        remove_logo: false,
    };
}

export default function CompaniesPage({ company = null }) {
    const { errors, flash } = usePage().props;
    const form = useForm(buildFormData(company));
    const logoRemoved = form.data.remove_logo;
    const hasExistingLogo = Boolean(company?.logo_url);
    const showLogoPreview = hasExistingLogo && !logoRemoved;

    usePageToasts([flash?.success], 'default');
    usePageToasts(Object.values(errors ?? {}), 'destructive');

    const submit = (event) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            _method: 'put',
        }));

        form.post(route('settings.companies.update'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset('logo');
            },
        });
    };

    return (
        <AppShell title="Companies">
            <Head title="Companies" />

            <div className="mx-auto flex w-full max-w-full flex-col gap-4">
                <section className="bg-card shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <div className="border-b border-border px-5 py-5">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-semibold text-foreground">Companies</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage company profile details used across operational documents.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-5 px-5 py-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="company_name">Company Name</Label>
                                <Input
                                    id="company_name"
                                    value={form.data.company_name}
                                    onChange={(event) => form.setData('company_name', event.target.value)}
                                />
                                <InputError message={form.errors.company_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="legal_name">Legal Name</Label>
                                <Input
                                    id="legal_name"
                                    value={form.data.legal_name}
                                    onChange={(event) => form.setData('legal_name', event.target.value)}
                                />
                                <InputError message={form.errors.legal_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tax_id">Tax ID</Label>
                                <Input
                                    id="tax_id"
                                    value={form.data.tax_id}
                                    onChange={(event) => form.setData('tax_id', event.target.value)}
                                />
                                <InputError message={form.errors.tax_id} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(event) => form.setData('phone', event.target.value)}
                                />
                                <InputError message={form.errors.phone} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                />
                                <InputError message={form.errors.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={form.data.website}
                                    onChange={(event) => form.setData('website', event.target.value)}
                                />
                                <InputError message={form.errors.website} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <textarea
                                id="address"
                                value={form.data.address}
                                onChange={(event) => form.setData('address', event.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            />
                            <InputError message={form.errors.address} />
                        </div>

                        <div className="space-y-3 rounded-lg border border-border p-4">
                            <div className="space-y-2">
                                <Label htmlFor="logo">Company Logo</Label>
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => {
                                        form.setData('logo', event.target.files?.[0] ?? null);
                                        form.setData('remove_logo', false);
                                    }}
                                />
                                <InputError message={form.errors.logo} />
                            </div>

                            {showLogoPreview ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Current Logo</p>
                                    <img
                                        src={company.logo_url}
                                        alt="Company logo"
                                        className="h-20 max-w-[180px] rounded border border-border object-contain p-1"
                                    />
                                </div>
                            ) : null}

                            {hasExistingLogo ? (
                                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                                    <input
                                        type="checkbox"
                                        checked={logoRemoved}
                                        onChange={(event) => form.setData('remove_logo', event.target.checked)}
                                    />
                                    Remove existing logo
                                </label>
                            ) : null}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save Company'}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>
        </AppShell>
    );
}
