import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Bell, X, LogOut, Moon, Sun, User, Menu } from "lucide-react";
import { useCurrentUser, getUserInitials } from "@/components/auth/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GlobalHeader({ currentPageName, sidebarOpen, onToggleSidebar }) {
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Placeholder notifications
  const notifications = [
    { id: 1, title: "New PO awaiting approval", time: "5 mins ago", read: false },
    { id: 2, title: "Stock transfer completed", time: "1 hour ago", read: false },
    { id: 3, title: "Low stock alert: iPhone 15", time: "2 hours ago", read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">

      {/* Left: Mobile hamburger */}
      <div className="flex items-center lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="menu-button h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Right Section: Search & Notifications */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        
        {/* Search Bar - Now positioned here */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-9 w-64 lg:w-80 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Notifications */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h4>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        !notification.read ? "bg-blue-500" : "bg-transparent"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <Button variant="ghost" size="sm" className="w-full text-xs text-gray-600 dark:text-gray-300">
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const isDark = document.documentElement.classList.toggle('dark');
            try { localStorage.setItem('darkMode', JSON.stringify(isDark)); } catch {}
          }}
          className="h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Toggle dark mode"
        >
          <Sun className="w-5 h-5 hidden dark:block" />
          <Moon className="w-5 h-5 block dark:hidden" />
        </Button>

        {/* User Avatar & Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-sky-600 dark:bg-sky-700">
                {currentUser?.profile_image ? (
                  <img src={currentUser.profile_image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm font-semibold text-white leading-none">
                    {getUserInitials(currentUser?.full_name)}
                  </span>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {currentUser?.full_name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentUser?.department_role || currentUser?.role || "User"}
              </p>
            </div>
            <div className="p-2 space-y-1">
              <Link to={createPageUrl("Profile")}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 gap-2"
                  size="sm"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Button>
              </Link>
              <Button
                onClick={() => base44.auth.logout()}
                variant="ghost"
                className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}