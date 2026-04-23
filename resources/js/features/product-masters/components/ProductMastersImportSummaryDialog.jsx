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

const METRICS = [
    { key: 'total_rows', label: 'Total Rows' },
    { key: 'brands_created', label: 'Brands Created' },
    { key: 'models_created', label: 'Models Created' },
    { key: 'masters_created', label: 'Masters Created' },
    { key: 'masters_reused', label: 'Masters Reused' },
    { key: 'variants_created', label: 'Variants Created' },
    { key: 'variants_skipped', label: 'Variants Skipped' },
    { key: 'failed_rows', label: 'Failed Rows' },
];

export default function ProductMastersImportSummaryDialog({
    open,
    onOpenChange,
    summary,
}) {
    const isFailed = summary?.status === 'failed';
    const errors = Array.isArray(summary?.errors) ? summary.errors : [];
    const details = summary?.details ?? {};
    const brandsCreated = Array.isArray(details?.brands_created) ? details.brands_created : [];
    const modelsCreated = Array.isArray(details?.models_created) ? details.models_created : [];
    const variantsCreated = Array.isArray(details?.variants_created) ? details.variants_created : [];
    const variantsSkipped = Array.isArray(details?.variants_skipped) ? details.variants_skipped : [];
    const failedDetails = Array.isArray(details?.failed) ? details.failed : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isFailed ? 'Import Failed' : 'Import Completed'}
                    </DialogTitle>
                    <DialogDescription>
                        {isFailed
                            ? 'Review import summary and row errors below.'
                            : 'CSV import summary'}
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {METRICS.map((metric) => (
                            <div
                                key={metric.key}
                                className="rounded border border-border/70 px-3 py-2"
                            >
                                <p className="text-xs text-muted-foreground">{metric.label}</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {Number(summary?.[metric.key] ?? 0)}
                                </p>
                            </div>
                        ))}
                    </div>

                    {isFailed && errors.length > 0 ? (
                        <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
                            <p className="mb-2 text-sm font-semibold text-destructive">
                                Errors
                            </p>
                            <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-destructive/20 bg-background p-2 text-xs text-foreground">
                                {errors.map((message, index) => (
                                    <p key={`${index}-${message}`}>{message}</p>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {brandsCreated.length > 0 ? (
                        <div className="rounded border border-border/70 p-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">Brands Created</p>
                            <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-foreground">
                                {brandsCreated.map((brand, index) => (
                                    <p key={`${brand}-${index}`}>{brand}</p>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {modelsCreated.length > 0 ? (
                        <div className="rounded border border-border/70 p-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">Models Created</p>
                            <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-foreground">
                                {modelsCreated.map((item, index) => (
                                    <p key={`${item.brand}-${item.model}-${index}`}>
                                        {item.brand} - {item.model}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {variantsCreated.length > 0 ? (
                        <div className="rounded border border-border/70 p-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">Variants Created</p>
                            <div className="max-h-48 space-y-1 overflow-y-auto text-xs text-foreground">
                                {variantsCreated.map((item, index) => (
                                    <p key={`${item.sku}-${index}`}>
                                        Row {item.row}: {item.brand} / {item.model} - {item.sku} ({item.condition})
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {variantsSkipped.length > 0 ? (
                        <div className="rounded border border-border/70 p-3">
                            <p className="mb-2 text-sm font-semibold text-foreground">Variants Skipped</p>
                            <div className="max-h-48 space-y-1 overflow-y-auto text-xs text-foreground">
                                {variantsSkipped.map((item, index) => (
                                    <p key={`${item.sku}-${index}`}>
                                        Row {item.row}: {item.brand} / {item.model} - {item.sku} ({item.reason})
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {isFailed && failedDetails.length > 0 ? (
                        <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
                            <p className="mb-2 text-sm font-semibold text-destructive">Failed Details</p>
                            <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-destructive/20 bg-background p-2 text-xs text-foreground">
                                {failedDetails.map((item, index) => (
                                    <p key={`${item.row ?? 'none'}-${index}`}>
                                        {item.row ? `Row ${item.row}` : 'File'}{item.brand || item.model ? `: ${item.brand ?? '-'} / ${item.model ?? '-'}` : ''} - {item.message}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </DialogBody>

                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
