import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const SIDEBAR_STATE_KEY = 'iwarehouse:admin-sidebar:sections';

function getDefaultOpenSections(sections) {
    return sections.reduce((openSections, section) => {
        openSections[section.label] = Boolean(section.defaultOpen);

        return openSections;
    }, {});
}

function getStoredOpenSections(sections) {
    if (typeof window === 'undefined') {
        return getDefaultOpenSections(sections);
    }

    try {
        const storedValue = window.localStorage.getItem(SIDEBAR_STATE_KEY);

        if (!storedValue) {
            return getDefaultOpenSections(sections);
        }

        const parsedValue = JSON.parse(storedValue);

        return sections.reduce((openSections, section) => {
            openSections[section.label] =
                typeof parsedValue[section.label] === 'boolean'
                    ? parsedValue[section.label]
                    : Boolean(section.defaultOpen);

            return openSections;
        }, {});
    } catch {
        return getDefaultOpenSections(sections);
    }
}

function areOpenSectionsEqual(currentOpenSections, nextOpenSections) {
    const currentKeys = Object.keys(currentOpenSections);
    const nextKeys = Object.keys(nextOpenSections);

    if (currentKeys.length !== nextKeys.length) {
        return false;
    }

    return nextKeys.every(
        (key) => currentOpenSections[key] === nextOpenSections[key],
    );
}

export default function SidebarNav({ sections, onNavigate, onLayoutChange }) {
    const defaultOpenSections = useMemo(() => getDefaultOpenSections(sections), [sections]);
    const [openSections, setOpenSections] = useState(() => getStoredOpenSections(sections));

    useEffect(() => {
        setOpenSections((currentOpenSections) => {
            const nextOpenSections = sections.reduce((accumulator, section) => {
                const hasActiveChild = section.links.some((link) => Boolean(link.active));

                accumulator[section.label] =
                    hasActiveChild || section.active
                        ? true
                        : (currentOpenSections[section.label] ?? Boolean(section.defaultOpen));

                return accumulator;
            }, {});

            if (areOpenSectionsEqual(currentOpenSections, nextOpenSections)) {
                return currentOpenSections;
            }

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(nextOpenSections));
            }

            return nextOpenSections;
        });
    }, [sections]);

    useEffect(() => {
        onLayoutChange?.();
    }, [onLayoutChange, openSections, sections]);

    const handleOpenChange = (sectionLabel, isOpen) => {
        setOpenSections((currentOpenSections) => {
            const nextOpenSections = {
                ...defaultOpenSections,
                ...currentOpenSections,
                [sectionLabel]: isOpen,
            };

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(nextOpenSections));
            }

            return nextOpenSections;
        });
        onNavigate?.();
    };

    return (
        <div className="px-4">
            <div className="space-y-1.5">
                {sections.map((section) => {
                    const Icon = section.icon;
                    const isOpen =
                        openSections[section.label] ?? Boolean(section.defaultOpen);

                    return (
                        <Collapsible
                            key={section.label}
                            open={isOpen}
                            onOpenChange={(isOpen) => handleOpenChange(section.label, isOpen)}
                            className="group/collapsible"
                        >
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] font-medium text-sidebar-foreground/85 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                >
                                    <Icon className="size-[15px] shrink-0 text-current" />
                                    <span className="flex-1">{section.label}</span>
                                    {isOpen ? (
                                        <ChevronDown className="size-4 shrink-0 text-current/75" />
                                    ) : (
                                        <ChevronRight className="size-4 shrink-0 text-current/75" />
                                    )}
                                </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="px-3 pb-1 pt-2">
                                <div className="ml-3 rounded-l-2xl border-l border-sidebar-border pl-4">
                                    <div className="space-y-1">
                                        {section.links.map((link) => {
                                            const LinkIcon = link.icon;

                                            return (
                                                <Link
                                                    key={link.label}
                                                    href={link.href}
                                                    onBefore={onNavigate}
                                                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] transition ${
                                                        link.active
                                                            ? 'bg-secondary text-secondary-foreground'
                                                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                                    }`}
                                                >
                                                    {LinkIcon ? (
                                                        <LinkIcon className="size-3.5 shrink-0 text-current/70" />
                                                    ) : null}
                                                    <span>{link.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
            </div>
        </div>
    );
}
