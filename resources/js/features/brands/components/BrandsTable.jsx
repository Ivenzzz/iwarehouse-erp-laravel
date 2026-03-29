import { Button } from '@/shared/components/ui/button';
import { Pencil, Rows3, Trash2 } from 'lucide-react';

export default function BrandsTable({ brands, onEdit, onDelete }) {
    if (brands.length === 0) {
        return (
            <div className="border border-dashed px-6 py-12 text-center">
                <Rows3 className="mx-auto mb-4 size-10 text-slate-300" />
                <p className="text-lg font-semibold text-slate-700">No brands yet</p>
                <p className="mt-2 text-sm text-slate-500">
                    Create a brand manually or import a CSV containing brand and
                    model pairs.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                    <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold">Brand</th>
                        <th className="px-4 py-3 text-left font-semibold">Models</th>
                        <th className="px-4 py-3 text-left font-semibold">Count</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {brands.map((brand) => (
                        <tr
                            key={brand.id}
                            className="border-b border-slate-200 align-top"
                        >
                            <td className="px-4 py-4">
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {brand.name}
                                    </p>
                                    <p className="mt-1 text-slate-500">Product brand</p>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                {brand.models.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {brand.models.map((model) => (
                                            <span
                                                key={model.id}
                                                className="bg-slate-100 px-2.5 py-1 text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.25)]"
                                            >
                                                {model.model_name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400">
                                        No associated models
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                                {brand.models.length}
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onEdit(brand)}
                                    >
                                        <Pencil className="size-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => onDelete(brand)}
                                    >
                                        <Trash2 className="size-4" />
                                        Delete
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
