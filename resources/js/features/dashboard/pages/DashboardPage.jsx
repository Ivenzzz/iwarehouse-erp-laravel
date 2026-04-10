import AppShell from '@/shared/layouts/AppShell';
import { Head } from '@inertiajs/react';

export default function DashboardPage() {
    return (
        <AppShell title="Dashboard">
            <Head title="Dashboard" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
                <p>Welcome to the Dashboard</p>
            </div>
        </AppShell>
    );
}
