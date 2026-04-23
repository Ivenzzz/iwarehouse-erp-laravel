import { Button } from '@/shared/components/ui/button';
import { Download, FileUp, Plus } from 'lucide-react';


export default function ProductMastersHeader({ onImport, onCreate }) {
    return (
        <div className="px-5 py-5 bg-accent mb-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1 text-foreground">
                    <h1 className="text-2xl font-semibold">
                        Product Masters
                    </h1>
                    <p className="text-xs">
                        Manage product masters and their variants
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={onImport}>
                        <FileUp className="size-4" />
                        Import CSV
                    </Button>
                    <Button variant="outline" onClick={() => { window.location.href = route('product-masters.export'); }}>
                        <Download className="size-4" />
                        Export CSV
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
