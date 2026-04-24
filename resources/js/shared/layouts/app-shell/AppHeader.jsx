import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
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
    const { url } = usePage();
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof document === 'undefined') return false;
        return document.documentElement.classList.contains('dark');
    });
    const [searchQuery, setSearchQuery] = useState('');

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

    const searchFromUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const parsed = new URL(url, window.location.origin);
        return parsed.searchParams.get('search') ?? '';
    }, [url]);

    useEffect(() => {
        setSearchQuery(searchFromUrl);
    }, [searchFromUrl]);

    const toggleDarkMode = () => {
        const next = !isDarkMode;
        document.documentElement.classList.toggle('dark', next);
        window.localStorage.setItem('darkMode', JSON.stringify(next));
        setIsDarkMode(next);
    };

    const submitSearch = (event) => {
        event.preventDefault();
        if (typeof window === 'undefined') return;

        const current = new URL(window.location.href);
        const nextValue = searchQuery.trim();

        if (nextValue) {
            current.searchParams.set('search', nextValue);
        } else {
            current.searchParams.delete('search');
        }

        router.get(
            current.pathname,
            Object.fromEntries(current.searchParams.entries()),
            {
                replace: true,
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const toggleTitle = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    const badgeCount = notificationCount > 99 ? '99+' : notificationCount;

    return (
        <header className="
            h-14 border-b px-3 text-xs sm:px-5
            border-slate-200 bg-white
            dark:border-[#2c3d57] dark:bg-[#1f2d43]
        ">
            <div className="flex h-full items-center justify-end gap-2.5">
                {/* Mobile hamburger */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="
                                    h-8 w-8
                                    border-slate-300 bg-slate-100 text-slate-600
                                    hover:bg-slate-200 hover:text-slate-900
                                    dark:border-slate-600/80 dark:bg-[#22314a] dark:text-slate-200
                                    dark:hover:bg-[#2b3b56] dark:hover:text-white
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

                {/* Mobile search */}
                <form
                    onSubmit={submitSearch}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 lg:hidden"
                >
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search..."
                        aria-label="Search"
                        className="
                            min-w-0 flex-1 bg-transparent text-sm outline-none
                            text-slate-800 placeholder:text-slate-400
                            dark:text-slate-100 dark:placeholder:text-slate-400 border border-border
                        "
                    />
                </form>

                {/* Desktop search — flows naturally to the left of the action icons */}
                <form
                    onSubmit={submitSearch}
                    className="hidden w-[420px] max-w-[48vw] lg:block"
                >
                    <div className="relative flex items-center">
                        <Search className="
                            pointer-events-none absolute left-3 size-4 shrink-0
                            text-slate-400 dark:text-slate-400
                        " />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search..."
                            aria-label="Search"
                            className="
                                w-full rounded-md py-1.5 pl-9 pr-3 text-sm outline-none
                                bg-slate-100 text-slate-800 placeholder:text-slate-400
                                dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-400 border border-border
                            "
                        />
                    </div>
                </form>

                {/* Action icons */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="
                                h-8 w-8 rounded-full
                                text-slate-500 hover:bg-slate-100 hover:text-slate-900
                                dark:text-slate-300 dark:hover:bg-[#2b3b56] dark:hover:text-white
                            "
                            aria-label="Notifications"
                        >
                            <Bell className="size-[15px]" />
                        </Button>
                        {badgeCount > 0 && (
                            <span className="
                                pointer-events-none absolute -right-0.5 -top-0.5 z-10
                                flex h-4 min-w-4 items-center justify-center rounded-full
                                bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white
                            ">
                                {badgeCount}
                            </span>
                        )}
                    </div>

                    {/* Dark mode toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="
                            h-8 w-8 rounded-full
                            text-slate-500 hover:bg-slate-100 hover:text-slate-900
                            dark:text-slate-300 dark:hover:bg-[#2b3b56] dark:hover:text-white
                        "
                        onClick={toggleDarkMode}
                        title={toggleTitle}
                        aria-label={toggleTitle}
                    >
                        {isDarkMode
                            ? <Sun className="size-[15px] text-amber-400" />
                            : <Moon className="size-[15px]" />}
                        <span className="sr-only">{toggleTitle}</span>
                    </Button>

                    {/* User menu */}
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
                                <Avatar size="default">
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