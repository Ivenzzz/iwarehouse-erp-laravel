import {
    calculateVariantGenerationCount,
    sanitizeVariantAttributes,
} from '@/features/product-masters/lib/productVariantForm';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils'; // Ensure this utility is imported
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
        if (!open) return;
        setForm(buildInitialForm(variantDefinitions));
        setErrors({});
        setSummary(null);
    }, [open, productMaster, variantDefinitions]);

    const computerDefinitions = useMemo(() => {
        const computerOnlyDefinitions = (variantDefinitions?.groups ?? [])
            .flatMap((group) => group.definitions ?? [])
            .filter((definition) => definition.is_computer_only);

        return [{ key: 'model_code', label: 'Model Code' }, ...computerOnlyDefinitions];
    }, [variantDefinitions]);

    const parsedColors = useMemo(
        () =>
            String(form.colors ?? '')
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
                .filter((v, i, a) => a.findIndex((c) => c.toLowerCase() === v.toLowerCase()) === i),
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
                ? current[field].filter((v) => v !== option)
                : [...current[field], option],
        }));
    };

    const toggleCondition = (condition) => toggleOption('conditions', condition);

    const updateSharedAttribute = (key, value) => {
        setForm((current) => ({
            ...current,
            shared_attributes: { ...current.shared_attributes, [key]: value },
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!productMaster) return;
        setSubmitting(true);
        setErrors({});

        try {
            const response = await axios.post(
                route('product-masters.variants.generate', productMaster.id),
                {
                    ...form,
                    colors: parsedColors,
                    shared_attributes: sanitizeVariantAttributes(
                        form.shared_attributes,
                        variantDefinitions,
                    ),
                },
            );
            setSummary(response.data.summary);
            onGenerated?.(response.data.summary, productMaster);
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors ?? {});
            } else {
                setErrors({ submit: ['The variants could not be generated.'] });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* FIX: Use flex-col and max-h to eliminate double scrollbar */}
            <DialogContent className="flex max-h-[95vh] max-w-3xl flex-col p-0 border-border bg-background shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-foreground">
                        Generate Variants for{' '}
                        <span className="text-primary">
                            {productMaster?.product_name ?? 'Selected Product'}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
                    <DialogBody className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                        {/* Premium Configuration Container */}
                        <div className="space-y-6 rounded-xl border border-border bg-muted/30 p-5">
                            <div className="flex items-center justify-between border-b border-border/50 pb-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">
                                        Variant Options
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Configure the combinations to generate.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px]"
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

                            {/* RAM & ROM Section */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold">RAM Options</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {RAM_OPTIONS.map((ram) => {
                                            const selected = form.rams.includes(ram);
                                            return (
                                                <button
                                                    key={ram}
                                                    type="button"
                                                    onClick={() => toggleOption('rams', ram)}
                                                    className={cn(
                                                        "inline-flex h-7 items-center justify-center rounded-md border px-3 text-[11px] font-bold transition-all",
                                                        selected
                                                            ? "bg-blue-500/15 text-info border-blue-500/40 shadow-[0_0_8px_rgba(var(--info),0.1)]"
                                                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
                                                    )}
                                                >
                                                    {ram}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <InputError message={errors['rams.0']?.[0] ?? errors.rams?.[0]} />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold">ROM Options</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {ROM_OPTIONS.map((rom) => {
                                            const selected = form.roms.includes(rom);
                                            return (
                                                <button
                                                    key={rom}
                                                    type="button"
                                                    onClick={() => toggleOption('roms', rom)}
                                                    className={cn(
                                                        "inline-flex h-7 items-center justify-center rounded-md border px-3 text-[11px] font-bold transition-all",
                                                        selected
                                                            ? "bg-blue-500/15 text-foreground border-blue-500/40 shadow-[0_0_8px_rgba(var(--info),0.1)]"
                                                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
                                                    )}
                                                >
                                                    {rom}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <InputError message={errors['roms.0']?.[0] ?? errors.roms?.[0]} />
                                </div>
                            </div>

                            {/* Conditions Section */}
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold">Condition Options</Label>
                                <div className="flex flex-wrap gap-2">
                                    {(variantDefinitions?.conditions ?? []).map((condition) => {
                                        const selected = form.conditions.includes(condition);
                                        const isBrandNew = condition === 'Brand New';
                                        return (
                                            <button
                                                key={condition}
                                                type="button"
                                                onClick={() => toggleCondition(condition)}
                                                className={cn(
                                                    "inline-flex h-7 items-center justify-center rounded-md border px-4 text-[11px] font-bold transition-all",
                                                    selected
                                                        ? isBrandNew
                                                            ? "bg-green-500/15 text-foregorund border-green-500/40"
                                                            : "bg-green-500/15 text-foreground border-green-500/40"
                                                        : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
                                                )}
                                            >
                                                {condition}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">For CPO: SKU will be prefixed with `CPO-`</p>
                                <InputError message={errors.conditions?.[0]} />
                            </div>

                            {/* Color Input */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Colors (comma-separated)</Label>
                                <Input
                                    value={form.colors}
                                    className="bg-background"
                                    onChange={(e) => setForm((curr) => ({ ...curr, colors: e.target.value }))}
                                    placeholder="e.g., Black, White, Blue, Red"
                                />
                                <InputError message={errors['colors.0']?.[0] ?? errors.colors?.[0]} />
                            </div>

                            {/* Computer Specs Section */}
                            <section className="space-y-4 border-t border-border pt-5">
                                <Label className="text-sm font-bold">Laptops/Desktops Specifications</Label>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {computerDefinitions.map((def) => (
                                        <div key={def.key} className="space-y-1.5">
                                            <Label htmlFor={`gen-${def.key}`} className="text-[11px] text-muted-foreground">
                                                {def.label}
                                            </Label>
                                            <Input
                                                id={`gen-${def.key}`}
                                                className="h-9 bg-background text-xs"
                                                value={form.shared_attributes[def.key] ?? ''}
                                                onChange={(e) => updateSharedAttribute(def.key, e.target.value)}
                                                placeholder={`Enter ${def.label.toLowerCase()}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Summary Info Box */}
                        <section className="rounded-xl border border-info/20 bg-info/5 p-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-full bg-info/20 p-1">
                                    <Wand2 className="size-3.5 text-info" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Total variants to be generated: <span className="text-info">{previewCount}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        This will generate every possible combination of selected options.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {summary && (
                            <section className="rounded-xl border border-success/30 bg-success/10 p-4 animate-in fade-in zoom-in duration-300">
                                <p className="text-sm font-bold text-success">Generation complete</p>
                                <p className="text-xs text-success/80 mt-1">
                                    Requested: {summary.requested} | Created: {summary.created} | Skipped: {summary.skipped}
                                </p>
                            </section>
                        )}

                        <InputError message={errors.submit?.[0]} />
                    </DialogBody>

                    <DialogFooter className="border-t border-border p-6 bg-background">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || form.conditions.length === 0}
                            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            {submitting ? (
                                <RotateCcw className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Wand2 className="mr-2 size-4" />
                            )}
                            {submitting ? 'Generating...' : 'Generate Variants'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
