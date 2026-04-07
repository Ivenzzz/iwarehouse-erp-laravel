import SidebarNav from '@/shared/layouts/app-shell/SidebarNav';
import { Link } from '@inertiajs/react';
import { Warehouse } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

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
    const scrollContainerRef = useRef(null);
    const storageKeyRef = useRef(storageKey);

    const persistScrollTop = () => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(
            getScrollStorageKey(storageKeyRef.current),
            String(scrollContainer.scrollTop),
        );
    };

    useLayoutEffect(() => {
        storageKeyRef.current = storageKey;
    }, [storageKey]);

    useLayoutEffect(() => {
        const scrollContainer = scrollContainerRef.current;

        if (!scrollContainer || typeof window === 'undefined') {
            return undefined;
        }

        const restoreScrollTop = () => {
            scrollContainer.scrollTop = getStoredScrollTop(storageKey);
        };

        restoreScrollTop();
        const animationFrameIds = [];
        const timeoutIds = [];

        const restoreOnNextFrame = (remainingFrames) => {
            if (remainingFrames <= 0) {
                return;
            }

            const animationFrameId = window.requestAnimationFrame(() => {
                restoreScrollTop();
                restoreOnNextFrame(remainingFrames - 1);
            });

            animationFrameIds.push(animationFrameId);
        };

        restoreOnNextFrame(5);

        [50, 150, 300].forEach((delay) => {
            timeoutIds.push(window.setTimeout(restoreScrollTop, delay));
        });

        scrollContainer.addEventListener('scroll', persistScrollTop, { passive: true });
        window.addEventListener('beforeunload', persistScrollTop);

        return () => {
            animationFrameIds.forEach((animationFrameId) => {
                window.cancelAnimationFrame(animationFrameId);
            });
            timeoutIds.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            persistScrollTop();
            scrollContainer.removeEventListener('scroll', persistScrollTop);
            window.removeEventListener('beforeunload', persistScrollTop);
        };
    }, [storageKey]);

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#24385f_0%,#1d2d4d_45%,#172640_100%)] text-xs text-white">
            <div className="border-b border-white/10 px-6 py-6">
                <Link
                    href={route('dashboard')}
                    onBefore={persistScrollTop}
                    className="flex items-center gap-3"
                >
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

            <div
                ref={scrollContainerRef}
                scroll-region="true"
                onClickCapture={persistScrollTop}
                onPointerDownCapture={persistScrollTop}
                className="sidebar-scroll min-h-0 flex-1 overflow-y-auto py-5"
            >
                <SidebarNav sections={sections} onNavigate={persistScrollTop} />
            </div>
        </div>
    );
}
