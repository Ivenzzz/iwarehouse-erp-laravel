import { Card, CardContent } from '@/shared/components/ui/card';
import { statCards } from '@/features/dashboard/data/dashboardData';

function toneClasses(tone) {
    if (tone === 'blue') {
        return {
            dot: 'bg-blue-400',
            text: 'text-blue-500',
            soft: 'bg-blue-100',
        };
    }

    if (tone === 'rose') {
        return {
            dot: 'bg-rose-400',
            text: 'text-rose-500',
            soft: 'bg-rose-100',
        };
    }

    return {
        dot: 'bg-emerald-400',
        text: 'text-emerald-500',
        soft: 'bg-emerald-100',
    };
}

export function StatCardsRow() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
                const tone = toneClasses(card.tone);

                return (
                    <Card
                        key={card.title}
                        className="gap-3 rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]"
                    >
                        <CardContent className="space-y-4 px-5 py-5">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                <span className={`size-2.5 rounded-sm ${tone.dot}`} />
                                {card.title}
                            </div>

                            <div className="flex items-end gap-2">
                                <span className="text-[2rem] font-semibold leading-none tracking-tight text-slate-800">
                                    {card.value}
                                </span>
                                <span className={`pb-1 text-sm font-semibold ${tone.text}`}>
                                    {card.change}
                                </span>
                            </div>

                            <div className="flex items-end gap-1">
                                {card.bars.map((bar, index) => (
                                    <span
                                        key={index}
                                        className={`w-full rounded-full ${tone.soft}`}
                                        style={{ height: `${Math.max(12, bar / 2)}px` }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
