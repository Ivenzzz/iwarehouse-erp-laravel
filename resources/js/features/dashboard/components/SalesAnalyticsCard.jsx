import { chartBars, months, orderPoints, revenuePoints } from '@/features/dashboard/data/dashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function buildSmoothPath(points) {
    return points
        .map((point, index) => {
            const prefix = index === 0 ? 'M' : 'C';
            const previous = points[index - 1] || point;
            const midX = (previous.x + point.x) / 2;

            if (index === 0) {
                return `${prefix}${point.x},${point.y}`;
            }

            return `${prefix}${midX},${previous.y} ${midX},${point.y} ${point.x},${point.y}`;
        })
        .join(' ');
}

export function SalesAnalyticsCard() {
    return (
        <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
            <CardHeader className="border-b border-slate-200/70 pb-4">
                <CardTitle className="text-[1.55rem] font-semibold text-slate-700">
                    Sales Analytics
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6">
                <div className="space-y-4">
                    <div className="relative h-[260px] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(245,247,252,0.9),rgba(255,255,255,1))] p-4">
                        <div className="pointer-events-none absolute inset-x-4 bottom-14 top-4 grid grid-rows-4">
                            {[0, 1, 2, 3].map((row) => (
                                <div
                                    key={row}
                                    className="border-b border-slate-200/70 last:border-b-0"
                                />
                            ))}
                        </div>

                        <div className="absolute bottom-14 left-4 right-4 flex items-end gap-2">
                            {chartBars.map((height, index) => (
                                <span
                                    key={index}
                                    className={`w-full rounded-t-md ${
                                        index % 4 === 0 ? 'bg-blue-300' : 'bg-blue-400'
                                    }`}
                                    style={{ height: `${height}px` }}
                                />
                            ))}
                        </div>

                        <svg
                            viewBox="0 0 626 180"
                            className="absolute inset-x-4 top-7 h-[180px] w-[calc(100%-2rem)]"
                            preserveAspectRatio="none"
                        >
                            <path
                                d={buildSmoothPath(revenuePoints)}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                            <path
                                d={buildSmoothPath(orderPoints)}
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />

                            {[revenuePoints[3], revenuePoints[5], orderPoints[6]].map(
                                (point, index) => (
                                    <circle
                                        key={index}
                                        cx={point.x}
                                        cy={point.y}
                                        r="5.5"
                                        fill={index === 0 ? '#16a34a' : '#3b82f6'}
                                    />
                                ),
                            )}
                        </svg>

                        <div className="absolute bottom-3 left-4 right-4 flex justify-between text-sm text-slate-500">
                            {months.map((month) => (
                                <span key={month}>{month}</span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-8 text-sm font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                            <span className="size-3 rounded bg-blue-500" />
                            Revenue
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-3 rounded bg-emerald-500" />
                            Orders
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
