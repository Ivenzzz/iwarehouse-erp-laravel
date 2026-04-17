import { Button } from '@/shared/components/ui/button';
import { Link } from '@inertiajs/react';
import { Download, FileUp, Plus } from 'lucide-react';

export default function CustomersHeader({ onImport, onCreate }) {
    return (
        <div className="mb-2 rounded-lg bg-accent px-5 py-5 transition-colors">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage customer profiles, contacts, addresses, and CSV import/export flows.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onImport}
                        className="gap-2 border-border text-foreground hover:bg-accent"
                    >
                        <FileUp className="size-4 text-muted-foreground" />
                        Import CSV
                    </Button>
                    <Button
                        variant="outline"
                        asChild
                        className="gap-2 border-border text-foreground hover:bg-accent"
                    >
                        <Link href={route('customers.export')}>
                            <Download className="size-4 text-muted-foreground" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="size-4" />
                        Add Customer
                    </Button>
                </div>
            </div>
        </div>
    );
}
