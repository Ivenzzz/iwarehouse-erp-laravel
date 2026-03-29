import { ActivityCards } from '@/features/dashboard/components/ActivityCards';
import { MessageStrip } from '@/features/dashboard/components/MessageStrip';
import { SalesAnalyticsCard } from '@/features/dashboard/components/SalesAnalyticsCard';
import { SidebarCards } from '@/features/dashboard/components/SidebarCards';
import { StatCardsRow } from '@/features/dashboard/components/StatCardsRow';
import { SummaryPreviewCard } from '@/features/dashboard/components/SummaryPreviewCard';
import AppShell from '@/shared/layouts/AppShell';
import { Head } from '@inertiajs/react';

export default function DashboardPage() {
    return (
        <AppShell title="Dashboard">
            <Head title="Dashboard" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <StatCardsRow />
                    <SummaryPreviewCard />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_326px]">
                    <SalesAnalyticsCard />
                    <SidebarCards />
                </div>

                <ActivityCards />
                <MessageStrip />
            </div>
        </AppShell>
    );
}
