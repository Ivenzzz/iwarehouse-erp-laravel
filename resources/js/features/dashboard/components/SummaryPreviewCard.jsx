import { Card, CardContent } from '@/shared/components/ui/card';
import { Search } from 'lucide-react';

export function SummaryPreviewCard() {
    return (
        <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
            <CardContent className="px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                    <Search className="size-4 text-slate-400" />
                    <div className="flex items-end gap-2">
                        {[68, 44, 82, 57, 71, 35, 65].map((bar, index) => (
                            <span
                                key={index}
                                className={`w-4 rounded-t-md ${
                                    index % 3 === 0
                                        ? 'bg-blue-200'
                                        : index % 3 === 1
                                          ? 'bg-amber-200'
                                          : 'bg-indigo-300'
                                }`}
                                style={{ height: `${bar}px` }}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
