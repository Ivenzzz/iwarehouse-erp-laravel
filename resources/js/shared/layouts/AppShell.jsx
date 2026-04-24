import AppHeader from '@/shared/layouts/app-shell/AppHeader';
import { getInitials } from '@/shared/layouts/app-shell/getInitials';
import SidebarContent from '@/shared/layouts/app-shell/SidebarContent';
import Toaster from '@/shared/components/ui/toaster';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import { getAdminNavSections } from '@/shared/navigation/adminNav';
import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

export default function AppShell({ title, children }) {
    const { props, url } = usePage();
    const user = props.auth.user;
    const initials = getInitials(user.name, user.username);
    const sections = useMemo(
        () => getAdminNavSections({ permissions: props.auth.permissions ?? [] }),
        [url, props.auth.permissions],
    );

    usePageToasts([props.flash?.success], 'default');
    usePageToasts([props.flash?.error], 'destructive');

    return (
        <div className="h-screen overflow-hidden bg-accent text-xs text-slate-900">
            <div className="flex h-full">
                <aside className="hidden h-full w-56 sm:w-62 flex-col lg:flex">
                    <SidebarContent sections={sections} storageKey="desktop" />
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-xs">
                    <AppHeader sections={sections} user={user} initials={initials} />

                    <main className="min-h-0 flex-1 overflow-y-auto p-4 text-xs bg-background text-foreground">
                        {children}
                    </main>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
