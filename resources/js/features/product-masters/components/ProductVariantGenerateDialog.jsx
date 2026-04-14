import { calculateVariantGenerationCount } from '@/features/product-masters/lib/productVariantForm';
import InputError from '@/shared/components/feedback/InputError';
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
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import axios from 'axios';
import { RotateCcw, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const RAM_OPTIONS = ['1GB', '2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB'];
const ROM_OPTIONS = ['8GB', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

function buildInitialForm(variantDefinitions) {
    return {
        conditions: variantDefinitions?.conditions?.length
            ? [variantDefinitions.conditions[0]]
            : ['Brand New'],
        colors: '',
        rams: [],
        roms: [],
        shared_attributes: {},
    };
}

export default function ProductVariantGenerateDialog({
    open,
    onOpenChange,
    productMaster,
    variantDefinitions,
    onGenerated,
}) {
    const [form, setForm] = useState(() => buildInitialForm(variantDefinitions));
    const [errors, setErrors] = useState({});
    const [summary, setSummary] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setForm(buildInitialForm(variantDefinitions));
        setErrors({});
        setSummary(null);
    }, [open, productMaster, variantDefinitions]);

    const computerDefinitions = useMemo(
        () =>
            (variantDefinitions?.groups ?? [])
                .flatMap((group) => group.definitions ?? [])
                .filter((definition) => definition.is_computer_only),
        [variantDefinitions],
    );

    const parsedColors = useMemo(
        () =>
            String(form.colors ?? '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .filter(
                    (value, index, array) =>
                        array.findIndex(
                            (candidate) => candidate.toLowerCase() === value.toLowerCase(),
                        ) === index,
                ),
        [form.colors],
    );
    const previewCount = calculateVariantGenerationCount({
        conditions: form.conditions,
        colors: parsedColors,
        rams: form.rams,
        roms: form.roms,
    });

    const toggleOption = (field, option) => {
        setForm((current) => ({
            ...current,
            [field]: current[field].includes(option)
                ? current[field].filter((value) => value !== option)
                : [...current[field], option],
        }));
    };

    const toggleCondition = (condition) => {
        toggleOption('conditions', condition);
    };

    const updateSharedAttribute = (key, value) => {
        setForm((current) => ({
            ...current,
            shared_attributes: {
                ...current.shared_attributes,
                [key]: value,
            },
        }));
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!productMaster) {
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const response = await axios.post(
                route('product-masters.variants.generate', productMaster.id),
                {
                    ...form,
                    colors: parsedColors,
                },
            );

            setSummary(response.data.summary);
            onGenerated?.(response.data.summary, productMaster);
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors ?? {});
            } else {
                setErrors({
                    submit: ['The variants could not be generated.'],
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Generate Variants for{' '}
                        {productMaster?.product_name ?? 'Selected Product'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="space-y-4 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Variant Options
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Configure the combinations to generate.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-400 text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-400 dark:hover:bg-gray-700"
                                    onClick={() => {
                                        setForm(buildInitialForm(variantDefinitions));
                                        setErrors({});
                                        setSummary(null);
                                    }}
                                >
                                    <RotateCcw className="mr-1 size-3" />
                                    Clear All
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>RAM Options</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {RAM_OPTIONS.map((ram) => {
                                            const selected = form.rams.includes(ram);

                                            return (
                                                <button
                                                    key={ram}
                                                    type="button"
                                                    onClick={() => toggleOption('rams', ram)}
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                                        selected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {ram}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <InputError
                                        message={errors['rams.0']?.[0] ?? errors.rams?.[0]}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>ROM Options</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {ROM_OPTIONS.map((rom) => {
                                            const selected = form.roms.includes(rom);

                                            return (
                                                <button
                                                    key={rom}
                                                    type="button"
                                                    onClick={() =>
                                                        toggleOption('roms', rom)
                                                    }
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                                        selected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {rom}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <InputError
                                        message={
                                            errors['roms.0']?.[0] ?? errors.roms?.[0]
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Condition Options</Label>
                                <div className="flex flex-wrap gap-2">
                                    {(variantDefinitions?.conditions ?? []).map((condition) => {
                                        const selected = form.conditions.includes(condition);

                                        return (
                                            <button
                                                key={condition}
                                                type="button"
                                                onClick={() => toggleCondition(condition)}
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                                    selected
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                {condition}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500">
                                    For CPO: SKU will be prefixed with `CPO-`
                                </p>
                                <InputError message={errors.conditions?.[0]} />
                            </div>

                            <div className="space-y-2">
                                <Label>Colors (comma-separated)</Label>
                                <Input
                                    value={form.colors}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            colors: event.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Black, White, Blue, Red"
                                />
                                <InputError
                                    message={errors['colors.0']?.[0] ?? errors.colors?.[0]}
                                />
                            </div>

                            {productMaster?.supports_computer_variants && (
                                <section className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                                    <Label className="text-sm font-semibold">
                                        Computer Specifications
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {computerDefinitions.map((definition) => (
                                            <div key={definition.key} className="space-y-1">
                                                <Label
                                                    htmlFor={`generate-${definition.key}`}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    {definition.label}
                                                </Label>
                                                <Input
                                                    id={`generate-${definition.key}`}
                                                    value={
                                                        form.shared_attributes[
                                                            definition.key
                                                        ] ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        updateSharedAttribute(
                                                            definition.key,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={`Enter ${definition.label.toLowerCase()}`}
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `shared_attributes.${definition.key}`
                                                        ]?.[0]
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <InputError message={errors.shared_attributes?.[0]} />
                                </section>
                            )}
                        </div>

                        <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-800 dark:bg-blue-950">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>Note:</strong> This will generate all possible
                                combinations.
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Total variants to be generated:{' '}
                                <strong>{previewCount}</strong> for <strong>1</strong>{' '}
                                selected product.
                            </p>
                        </section>

                        {summary && (
                            <section className="border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                                <p className="font-semibold">Generation complete</p>
                                <p className="mt-1">
                                    Requested {summary.requested}, created {summary.created},
                                    skipped {summary.skipped}.
                                </p>
                            </section>
                        )}

                        <InputError message={errors.submit?.[0]} />
                    </DialogBody>

                    <DialogFooter className="border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={submitting || form.conditions.length === 0}
                        >
                            <Wand2 className="mr-2 size-4" />
                            {submitting ? 'Generating...' : 'Generate Variants'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
