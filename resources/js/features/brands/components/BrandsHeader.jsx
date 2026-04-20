import { Button } from '@/shared/components/ui/button';
import { Link } from '@inertiajs/react';
import { Download, FileUp, Plus } from 'lucide-react';

export default function BrandsHeader({ onImport, onCreate }) {
    return (
        <div className="mb-2 border-primary rounded-lg px-5 py-5 bg-accent text-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Brands</h1>
                    <p className="text-sm">
                        Manage brands, their product models, and CSV import/export
                        flows.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={onImport}>
                        <FileUp className="size-4" />
                        Import CSV
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('brands.export')}>
                            <Download className="size-4" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button type="button" onClick={onCreate}>
                        <Plus className="size-4" />
                        Add Brand
                    </Button>
                </div>
            </div>
        </div>
    );
}
