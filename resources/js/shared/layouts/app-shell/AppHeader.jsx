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
import { Bell, LogOut, Mail, Menu, Search } from 'lucide-react';

export default function AppHeader({ sections, user, initials }) {
    return (
        <header className="border-b border-slate-200/70 bg-[#eef2f8] px-4 py-4 text-xs sm:px-6">
            <div className="flex items-center gap-3">
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="bg-white">
                                <Menu className="size-4" />
                                <span className="sr-only">Open navigation</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 border-none p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation</SheetTitle>
                            </SheetHeader>
                            <SidebarContent sections={sections} />
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/70">
                    <Search className="size-4 text-slate-400" />
                    <span className="truncate text-sm text-slate-400">Search...</span>
                </div>

                <div className="ml-auto hidden items-center gap-6 lg:flex">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm">
                            <Bell className="size-4 text-slate-500" />
                            <span className="sr-only">Notifications</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm">
                            <Mail className="size-4 text-blue-500" />
                            <span className="sr-only">Messages</span>
                        </Button>
                    </div>
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="rounded-full shadow-md shadow-slate-300/60 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                            >
                                <Avatar size="lg">
                                    <AvatarFallback className="bg-white font-semibold text-slate-700">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content
                            align="right"
                            contentClasses="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
                        >
                            <div className="border-b border-slate-100 px-3 py-2.5">
                                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-500">@{user.username}</p>
                            </div>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <LogOut className="size-4" />
                                Logout
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
