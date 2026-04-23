import { useEffect, useState } from 'react';
import Dropdown from '@/shared/components/overlay/Dropdown';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import SidebarContent from '@/shared/layouts/app-shell/SidebarContent';
import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';

export default function AppHeader({ sections, user, initials, notificationCount = 0 }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof document === 'undefined') return false;
        return document.documentElement.classList.contains('dark');
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedValue = window.localStorage.getItem('darkMode');
        let shouldUseDark = false;
        if (storedValue !== null) {
            try {
                shouldUseDark = JSON.parse(storedValue) === true;
            } catch {
                shouldUseDark = false;
            }
        }

        document.documentElement.classList.toggle('dark', shouldUseDark);
        setIsDarkMode(shouldUseDark);
    }, []);

    const toggleDarkMode = () => {
        const next = !isDarkMode;
        document.documentElement.classList.toggle('dark', next);
        window.localStorage.setItem('darkMode', JSON.stringify(next));
        setIsDarkMode(next);
    };

    const toggleTitle = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    const badgeCount  = notificationCount > 99 ? '99+' : notificationCount;

    return (
        <header className="
            border-b border-slate-200/60 bg-[#eef2f8] px-4 py-3 text-xs
            dark:border-slate-800/80 dark:bg-[#151b2d]
            sm:px-6
        ">
            <div className="flex items-center gap-3">

                {/* ── Mobile hamburger ── */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="
                                    border-slate-200 bg-white text-slate-600
                                    hover:bg-slate-50
                                    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700
                                "
                            >
                                <Menu className="size-4" />
                                <span className="sr-only">Open navigation</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 border-none p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation</SheetTitle>
                            </SheetHeader>
                            <SidebarContent sections={sections} storageKey="mobile" />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* ── Search bar — pill shape ── */}
                <div className="
                    flex min-w-0 flex-1 items-center gap-2.5 rounded-full
                    border border-slate-200   bg-white         px-4 py-2.5
                    shadow-sm shadow-slate-200/60
                    dark:border-slate-700/70 dark:bg-[#1e2640] dark:shadow-none
                ">
                    <Search className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate text-sm text-slate-400 dark:text-slate-500">
                        Search...
                    </span>
                </div>

                {/* ── Right-side controls ── */}
                <div className="ml-auto flex items-center gap-1.5">

                    {/* Bell with notification badge */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="
                                size-8 rounded-full
                                text-slate-500     hover:bg-slate-200/60  hover:text-slate-700
                                dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200
                            "
                            aria-label="Notifications"
                        >
                            <Bell className="size-4" />
                        </Button>
                        {badgeCount > 0 && (
                            <span className="
                                pointer-events-none absolute -right-0.5 -top-0.5
                                flex h-4 min-w-4 items-center justify-center
                                rounded-full bg-red-500 px-1
                                text-[10px] font-bold leading-none text-white
                                ring-2 ring-white dark:ring-[#151b2d]
                            ">
                                {badgeCount}
                            </span>
                        )}
                    </div>

                    {/* Dark-mode toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="
                            size-8 rounded-full
                            text-slate-500      hover:bg-slate-200/60  hover:text-slate-700
                            dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200
                        "
                        onClick={toggleDarkMode}
                        title={toggleTitle}
                        aria-label={toggleTitle}
                    >
                        {isDarkMode
                            ? <Sun  className="size-4 text-amber-400" />
                            : <Moon className="size-4" />}
                        <span className="sr-only">{toggleTitle}</span>
                    </Button>

                    {/* Avatar / user dropdown */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="
                                    ml-1 rounded-full
                                    transition hover:scale-[1.04] hover:opacity-90
                                    focus:outline-none focus:ring-2 focus:ring-blue-400/50
                                    dark:focus:ring-slate-500/60
                                "
                            >
                                <Avatar size="sm">
                                    <AvatarFallback className="
                                        bg-blue-500 font-semibold text-white text-sm
                                        dark:bg-blue-600
                                    ">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content
                            align="right"
                            contentClasses="
                                overflow-hidden rounded-2xl
                                border border-slate-200 bg-white p-1.5
                                shadow-xl shadow-slate-200/70
                                dark:border-slate-700 dark:bg-[#1e2640] dark:shadow-none
                            "
                        >
                            <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-700/60">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {user.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    @{user.username}
                                </p>
                            </div>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="
                                    mt-1 flex items-center gap-2 rounded-xl
                                    px-3 py-2.5 text-xs font-medium
                                    text-slate-700 hover:bg-slate-50
                                    dark:text-slate-300 dark:hover:bg-slate-700/60
                                "
                            >
                                <LogOut className="size-3.5" />
                                Logout
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}