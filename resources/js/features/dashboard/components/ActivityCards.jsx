import { activities, tasks } from '@/features/dashboard/data/dashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { CheckSquare, MoreHorizontal } from 'lucide-react';

export function ActivityCards() {
    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_0.7fr_326px]">
            <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
                <CardHeader className="border-b border-slate-200/70 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[1.45rem] font-semibold text-slate-700">
                            Recent Activity
                        </CardTitle>
                        <MoreHorizontal className="size-5 text-slate-300" />
                    </div>
                </CardHeader>
                <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                        {activities.map(([message, time, tone]) => (
                            <div
                                key={message}
                                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`size-3 rounded-full ${
                                            tone === 'emerald'
                                                ? 'bg-emerald-400'
                                                : tone === 'orange'
                                                  ? 'bg-orange-400'
                                                  : tone === 'sky'
                                                    ? 'bg-sky-400'
                                                    : 'bg-amber-400'
                                        }`}
                                    />
                                    <span className="text-[0.97rem] text-slate-700">
                                        {message}
                                    </span>
                                </div>
                                <span className="whitespace-nowrap text-sm text-slate-400">
                                    {time}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
                <CardHeader className="border-b border-slate-200/70 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[1.45rem] font-semibold text-slate-700">
                            Tasks
                        </CardTitle>
                        <CheckSquare className="size-4 text-slate-400" />
                    </div>
                </CardHeader>
                <CardContent className="px-5 py-4">
                    <div className="space-y-3">
                        {tasks.map(([task, checked]) => (
                            <label
                                key={task}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 px-3 py-3"
                            >
                                <input
                                    type="checkbox"
                                    defaultChecked={checked}
                                    className="size-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    {task}
                                </span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="hidden xl:block" />
        </div>
    );
}
