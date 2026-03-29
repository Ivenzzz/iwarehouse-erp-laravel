import SidebarNav from '@/shared/layouts/app-shell/SidebarNav';
import { Link } from '@inertiajs/react';
import { Warehouse } from 'lucide-react';

export default function SidebarContent({ sections }) {
    return (
        <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#24385f_0%,#1d2d4d_45%,#172640_100%)] text-xs text-white">
            <div className="border-b border-white/10 px-6 py-6">
                <Link href={route('dashboard')} className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/8">
                        <Warehouse className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                            iWarehouse ERP 3.0
                        </p>
                    </div>
                </Link>
            </div>

            <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto py-5">
                <SidebarNav sections={sections} />
            </div>
        </div>
    );
}
