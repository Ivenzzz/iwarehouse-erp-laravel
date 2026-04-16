import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Package } from 'lucide-react';

export default function ProductMasterDetailsDialog({
    open,
    onOpenChange,
    productMaster,
    specDefinitions = [],
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl border-border bg-accent shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-foreground">
                        {productMaster?.product_name ?? 'Product Master'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Full product master details and technical specifications.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-8">
                    {productMaster && (
                        <>
                            {/* Primary Info Section */}
                            <section className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                                {/* Image Container */}
                                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/50">
                                    {productMaster.image_url ? (
                                        <img
                                            src={productMaster.image_url}
                                            alt={productMaster.product_name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <Package className="size-16 text-muted-foreground/30" />
                                    )}
                                </div>

                                {/* Main Details Grid */}
                                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                                    <DetailItem label="SKU" value={productMaster.master_sku} />
                                    <DetailItem label="Brand" value={productMaster.brand.name} />
                                    <DetailItem label="Model" value={productMaster.model.model_name} />
                                    <DetailItem label="Category" value={productMaster.category?.name ?? 'No category'} />
                                    <DetailItem label="Subcategory" value={productMaster.subcategory.name} />
                                    
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Description
                                        </dt>
                                        <dd className="mt-1.5 whitespace-pre-line leading-relaxed text-foreground">
                                            {productMaster.description || 'No description provided.'}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            {/* Technical Specifications Section */}
                            <section className="space-y-6">
                                <div className="border-b border-border pb-2">
                                    <h2 className="text-sm font-bold text-foreground">Technical Specifications</h2>
                                </div>

                                <div className="grid gap-4">
                                    {specDefinitions.map((group) => {
                                        const populatedSpecs = group.definitions.filter(
                                            (definition) => productMaster.specs?.[definition.key],
                                        );

                                        if (populatedSpecs.length === 0) return null;

                                        return (
                                            <div 
                                                key={group.group} 
                                                className="rounded-xl border border-border bg-muted/20 px-5 py-4 transition-colors hover:bg-muted/30"
                                            >
                                                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-primary">
                                                    {group.group}
                                                </h3>
                                                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                                                    {populatedSpecs.map((definition) => (
                                                        <DetailItem 
                                                            key={definition.key} 
                                                            label={definition.label} 
                                                            value={productMaster.specs[definition.key]} 
                                                        />
                                                    ))}
                                                </dl>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Helper component for clean label/value pairs
 */
function DetailItem({ label, value }) {
    return (
        <div>
            <dt className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
                {value || '—'}
            </dd>
        </div>
    );
}