import { Button } from '@/shared/components/ui/button';
import { Link } from '@inertiajs/react';
import { Download, FileUp, Plus } from 'lucide-react';

export default function ProductMastersHeader({ onImport, onCreate }) {
    return (
        <div className="border-b border-slate-200 px-5 py-5 bg-background dark:bg-background dark:border-slate-700 dark:text-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1 text-foreground">
                    <h1 className="text-2xl font-semibold">
                        Product Masters
                    </h1>
                    <p className="text-sm">
                        Manage normalized catalog masters, images, specifications, and
                        CSV import/export flows.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={onImport}>
                        <FileUp className="size-4" />
                        Import CSV
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('product-masters.export')}>
                            <Download className="size-4" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button type="button" onClick={onCreate}>
                        <Plus className="size-4" />
                        Add Product Master
                    </Button>
                </div>
            </div>
        </div>
    );
}
