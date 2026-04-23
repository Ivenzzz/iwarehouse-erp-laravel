import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

const REQUIRED_COLUMNS = [
    'Brand',
    'Model',
    'Category',
    'Subcategory',
];

const OPTIONAL_COLUMNS = [
    'Model Code',
    'RAM',
    'ROM',
    'CPU',
    'GPU',
    'RAM Type',
    'ROM Type',
    'Operating System',
    'Screen',
    'Color',
    'Condition',
];

const TEMPLATE_FILENAME = 'product-masters-import-template.csv';

export default function ProductMastersImportDialog({
    open,
    onOpenChange,
    onUpload,
}) {
    const downloadTemplate = () => {
        const headerRow = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(',');
        const sampleRow = [
            'Apple',
            'MacBook Air M3',
            'Computers',
            'Laptops',
            'MBA13-M3',
            '8GB',
            '256GB',
            'Apple M3',
            'Integrated',
            'LPDDR5',
            'SSD',
            'macOS',
            '13.6-inch',
            'Midnight',
            'Brand New',
        ].join(',');

        const csv = `${headerRow}\n${sampleRow}\n`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', TEMPLATE_FILENAME);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Product Masters CSV</DialogTitle>
                    <DialogDescription>
                        CSV must include required columns. Other columns are optional.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="rounded-md border border-border bg-muted/20 p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">
                            Required columns
                        </p>
                        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            {REQUIRED_COLUMNS.map((column) => (
                                <div key={column} className="rounded border border-border/60 px-3 py-2">
                                    {column}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/20 p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">
                            Optional columns
                        </p>
                        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            {OPTIONAL_COLUMNS.map((column) => (
                                <div key={column} className="rounded border border-border/60 px-3 py-2">
                                    {column}
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={downloadTemplate}>
                        Download CSV Template
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onUpload?.();
                        }}
                    >
                        Choose CSV File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
