import BrandDialog from '@/features/brands/components/BrandDialog';
import BrandsHeader from '@/features/brands/components/BrandsHeader';
import BrandsTable from '@/features/brands/components/BrandsTable';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function BrandsPage({ brands }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const fileInputRef = useRef(null);

    const openCreate = () => {
        setEditingBrand(null);
        setDialogOpen(true);
    };

    const openEdit = (brand) => {
        setEditingBrand(brand);
        setDialogOpen(true);
    };

    const deleteBrand = (brand) => {
        if (!window.confirm(`Delete ${brand.name} and all associated models?`)) {
            return;
        }

        router.delete(route('brands.destroy', brand.id), {
            preserveScroll: true,
        });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('brands.import'),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    event.target.value = '';
                },
            },
        );
    };

    return (
        <AppShell title="Brands">
            <Head title="Brands" />

            <BrandDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                brand={editingBrand}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
                <section className="bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <BrandsHeader
                        onImport={() => fileInputRef.current?.click()}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5 px-5 py-5">
                        <section className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <BrandsTable
                                    brands={brands}
                                    onEdit={openEdit}
                                    onDelete={deleteBrand}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
