import { products } from '@/features/dashboard/data/dashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function SidebarCards() {
    return (
        <div className="grid gap-4">
            <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
                <CardHeader className="border-b border-slate-200/70 pb-4">
                    <CardTitle className="text-[1.45rem] font-semibold text-slate-700">
                        Top Products
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                        {products.map(([name, value], index) => (
                            <div
                                key={name}
                                className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-semibold text-slate-800">
                                        {index + 1}.
                                    </span>
                                    <span className="font-medium text-slate-700">{name}</span>
                                </div>
                                <span className="text-sm text-slate-500">{value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 bg-white py-0 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
                <CardHeader className="border-b border-slate-200/70 pb-4">
                    <CardTitle className="text-[1.45rem] font-semibold text-slate-700">
                        Visitor Locations
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 py-4">
                    <div className="space-y-5">
                        <div className="relative h-[180px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_35%,rgba(134,239,172,0.45),transparent_22%),radial-gradient(circle_at_45%_58%,rgba(59,130,246,0.18),transparent_28%),linear-gradient(180deg,#f8fafc,#eef2f7)]">
                            <div className="absolute left-[8%] top-[30%] h-[28%] w-[26%] rounded-[48%_52%_44%_56%/55%_38%_62%_45%] bg-emerald-200/80" />
                            <div className="absolute left-[34%] top-[55%] h-[20%] w-[10%] rounded-full bg-emerald-100/80" />
                            <div className="absolute left-[46%] top-[28%] h-[18%] w-[14%] rounded-[45%_55%_55%_45%] bg-slate-200" />
                            <div className="absolute left-[46%] top-[49%] h-[22%] w-[16%] rounded-[48%_52%_60%_40%] bg-slate-200" />
                            <div className="absolute right-[11%] top-[26%] h-[16%] w-[26%] rounded-[50%_50%_44%_56%] bg-slate-200" />
                            <div className="absolute right-[20%] top-[47%] h-[22%] w-[18%] rounded-[44%_56%_62%_38%] bg-slate-200" />
                            <div className="absolute right-[8%] top-[59%] h-[10%] w-[10%] rounded-full bg-slate-200" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-4xl font-semibold tracking-tight text-slate-800">
                                    58%
                                </p>
                                <p className="text-sm text-slate-500">United States</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-4xl font-semibold tracking-tight text-slate-800">
                                    22%
                                </p>
                                <p className="text-sm text-slate-500">Europe</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
