import { Button } from '@/shared/components/ui/button';
import { Link } from '@inertiajs/react';
import { Download, FileUp, Plus } from 'lucide-react';

export default function CategoriesHeader({ onImport, onCreate }) {
    return (
        <div className="bg-accent px-5 py-5 mb-2 rounded-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Categories</h1>
                    <p className="text-sm">
                        Manage product categories, subcategories, and CSV import/export flows.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={onImport}>
                        <FileUp className="size-4" />
                        Import CSV
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('categories.export')}>
                            <Download className="size-4" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button type="button" variant="primary" onClick={onCreate}>
                        <Plus className="size-4" />
                        Add Category
                    </Button>
                </div>
            </div>
        </div>
    );
}
