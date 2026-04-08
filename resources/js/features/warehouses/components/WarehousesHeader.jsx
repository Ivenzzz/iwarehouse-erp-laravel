import { Button } from '@/shared/components/ui/button';
import { Link } from '@inertiajs/react';
import { Download, FileUp, Plus } from 'lucide-react';

export default function WarehousesHeader({ onImport, onCreate }) {
    return (
        <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold text-slate-800">Warehouses</h1>
                    <p className="text-sm text-slate-500">
                        Manage warehouses, contact/location details, and CSV import/export flows.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={onImport}>
                        <FileUp className="size-4" />
                        Import CSV
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('warehouses.export')}>
                            <Download className="size-4" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button type="button" onClick={onCreate}>
                        <Plus className="size-4" />
                        Add Warehouse
                    </Button>
                </div>
            </div>
        </div>
    );
}
