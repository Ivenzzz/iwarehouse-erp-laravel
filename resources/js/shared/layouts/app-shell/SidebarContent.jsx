import SidebarNav from '@/shared/layouts/app-shell/SidebarNav';
import { Link, router, usePage } from '@inertiajs/react';
import { Warehouse } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const SIDEBAR_SCROLL_KEY_PREFIX = 'iwarehouse:admin-sidebar:scroll-top';

function getScrollStorageKey(storageKey) {
    return `${SIDEBAR_SCROLL_KEY_PREFIX}:${storageKey}`;
}

function getStoredScrollTop(storageKey) {
    if (typeof window === 'undefined') {
        return 0;
    }

    const scrollTop = Number(window.localStorage.getItem(getScrollStorageKey(storageKey)));

    return Number.isFinite(scrollTop) ? scrollTop : 0;
}

export default function SidebarContent({ sections, storageKey = 'default' }) {
    const { url } = usePage();
    const isDesktopSidebar = storageKey === 'desktop';
    const scrollContainerRef = useRef(null);
    const storageKeyRef = useRef(storageKey);
    const restoreFrameIdsRef = useRef([]);
    const restoreTimeoutIdsRef = useRef([]);
    const [restoreVersion, setRestoreVersion] = useState(0);

    const clearRestoreWork = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        restoreFrameIdsRef.current.forEach((animationFrameId) => {
            window.cancelAnimationFrame(animationFrameId);
        });
        restoreTimeoutIdsRef.current.forEach((timeoutId) => {
            window.clearTimeout(timeoutId);
        });

        restoreFrameIdsRef.current = [];
        restoreTimeoutIdsRef.current = [];
    }, []);

    const persistScrollTop = useCallback(() => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(
            getScrollStorageKey(storageKeyRef.current),
            String(scrollContainer.scrollTop),
        );
    }, []);

    const scheduleRestoreScrollTop = useCallback(() => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined') {
            return;
        }

        clearRestoreWork();

        const restoreScrollTop = () => {
            scrollContainer.scrollTop = getStoredScrollTop(storageKeyRef.current);
        };

        restoreScrollTop();

        [1, 2, 3, 4, 5, 8].forEach(() => {
            const animationFrameId = window.requestAnimationFrame(() => {
                restoreScrollTop();
            });

            restoreFrameIdsRef.current.push(animationFrameId);
        });

        [50, 150, 300, 500].forEach((delay) => {
            const timeoutId = window.setTimeout(() => {
                restoreScrollTop();
            }, delay);

            restoreTimeoutIdsRef.current.push(timeoutId);
        });
    }, [clearRestoreWork]);

    const handleSidebarLayoutChange = useCallback(() => {
        setRestoreVersion((current) => current + 1);
    }, []);

    useLayoutEffect(() => {
        storageKeyRef.current = storageKey;
    }, [storageKey]);

    useLayoutEffect(() => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined') {
            return undefined;
        }

        scrollContainer.addEventListener('scroll', persistScrollTop, { passive: true });
        window.addEventListener('beforeunload', persistScrollTop);

        return () => {
            persistScrollTop();
            clearRestoreWork();
            scrollContainer.removeEventListener('scroll', persistScrollTop);
            window.removeEventListener('beforeunload', persistScrollTop);
        };
    }, [clearRestoreWork, persistScrollTop]);

    useLayoutEffect(() => {
        scheduleRestoreScrollTop();
    }, [scheduleRestoreScrollTop, storageKey, url, restoreVersion]);

    useEffect(() => {
        if (!isDesktopSidebar) {
            return undefined;
        }

        const removeStartListener = router.on('start', () => {
            persistScrollTop();
        });
        const removeNavigateListener = router.on('navigate', () => {
            scheduleRestoreScrollTop();
        });
        const removeFinishListener = router.on('finish', () => {
            scheduleRestoreScrollTop();
        });

        return () => {
            removeStartListener();
            removeNavigateListener();
            removeFinishListener();
        };
    }, [isDesktopSidebar, persistScrollTop, scheduleRestoreScrollTop]);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const resizeObserver = new ResizeObserver(() => {
            scheduleRestoreScrollTop();
        });

        resizeObserver.observe(scrollContainer);

        const firstElementChild = scrollContainer.firstElementChild;

        if (firstElementChild instanceof HTMLElement) {
            resizeObserver.observe(firstElementChild);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [scheduleRestoreScrollTop]);

    return (
        <div className="flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
            <div className="border-b border-sidebar-border px-5 py-5">
                <Link
                    href={route('dashboard')}
                    onBefore={persistScrollTop}
                    className="flex items-center gap-3"
                >
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-sidebar-foreground/70">
                            IWAREHOUSE ERP 2026
                        </p>
                    </div>
                </Link>
            </div>

            <div
                ref={scrollContainerRef}
                scroll-region={isDesktopSidebar ? undefined : 'true'}
                onClickCapture={persistScrollTop}
                onPointerDownCapture={persistScrollTop}
                className="sidebar-scroll min-h-0 flex-1 overflow-y-auto py-6"
            >
                <SidebarNav
                    sections={sections}
                    onNavigate={persistScrollTop}
                    onLayoutChange={handleSidebarLayoutChange}
                />
            </div>
        </div>
    );
}
