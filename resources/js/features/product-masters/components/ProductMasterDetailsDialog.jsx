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
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {productMaster?.product_name ?? 'Product Master'}
                    </DialogTitle>
                    <DialogDescription>
                        Full product master details and technical specifications.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-6">
                    {productMaster && (
                        <>
                            <section className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                                <div className="flex aspect-square items-center justify-center bg-slate-100">
                                    {productMaster.image_url ? (
                                        <img
                                            src={productMaster.image_url}
                                            alt={productMaster.product_name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <Package className="size-12 text-slate-300" />
                                    )}
                                </div>

                                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="font-semibold text-slate-500">SKU</dt>
                                        <dd className="text-slate-800">
                                            {productMaster.master_sku}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-500">Brand</dt>
                                        <dd className="text-slate-800">
                                            {productMaster.brand.name}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-500">Model</dt>
                                        <dd className="text-slate-800">
                                            {productMaster.model.model_name}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-500">Category</dt>
                                        <dd className="text-slate-800">
                                            {productMaster.category?.name ?? 'No category'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-500">
                                            Subcategory
                                        </dt>
                                        <dd className="text-slate-800">
                                            {productMaster.subcategory.name}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="font-semibold text-slate-500">
                                            Description
                                        </dt>
                                        <dd className="whitespace-pre-line text-slate-800">
                                            {productMaster.description || 'No description'}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            <section className="space-y-4">
                                {specDefinitions.map((group) => {
                                    const populatedSpecs = group.definitions.filter(
                                        (definition) => productMaster.specs?.[definition.key],
                                    );

                                    if (populatedSpecs.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <div key={group.group} className="border px-4 py-4">
                                            <h3 className="mb-3 text-sm font-semibold text-slate-800">
                                                {group.group}
                                            </h3>
                                            <dl className="grid gap-3 text-sm md:grid-cols-2">
                                                {populatedSpecs.map((definition) => (
                                                    <div key={definition.key}>
                                                        <dt className="font-semibold text-slate-500">
                                                            {definition.label}
                                                        </dt>
                                                        <dd className="text-slate-800">
                                                            {productMaster.specs[definition.key]}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </div>
                                    );
                                })}
                            </section>
                        </>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
