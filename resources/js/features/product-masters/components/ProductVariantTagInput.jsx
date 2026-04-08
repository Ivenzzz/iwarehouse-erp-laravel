import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { X } from 'lucide-react';
import { useState } from 'react';

export default function ProductVariantTagInput({
    values = [],
    onChange,
    placeholder,
    disabled = false,
    error,
}) {
    const [draft, setDraft] = useState('');

    const addValues = (rawValue) => {
        const nextValues = String(rawValue)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .filter(
                (value, index, array) =>
                    array.findIndex(
                        (candidate) =>
                            candidate.toLowerCase() === value.toLowerCase(),
                    ) === index,
            )
            .filter(
                (value) =>
                    !values.some(
                        (existingValue) =>
                            existingValue.toLowerCase() === value.toLowerCase(),
                    ),
            );

        if (nextValues.length === 0) {
            return;
        }

        onChange([...values, ...nextValues]);
        setDraft('');
    };

    const removeValue = (valueToRemove) => {
        onChange(values.filter((value) => value !== valueToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                            event.preventDefault();
                            addValues(draft);
                        }
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => addValues(draft)}
                    disabled={disabled}
                >
                    Add
                </Button>
            </div>

            {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {values.map((value) => (
                        <span
                            key={value}
                            className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                            {value}
                            <button
                                type="button"
                                onClick={() => removeValue(value)}
                                className="text-slate-400 transition hover:text-slate-700"
                                disabled={disabled}
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <InputError message={error} />
        </div>
    );
}
