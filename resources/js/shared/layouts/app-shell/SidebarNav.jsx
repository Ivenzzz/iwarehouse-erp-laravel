import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
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
        <div className="px-2.5">
            <div className="space-y-2">
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
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground transition-colors hover:bg-muted dark:text-gray-400 dark:hover:bg-gray-800"
                                >
                                    <Icon className="hidden size-4 shrink-0 text-current/75" />
                                    <span className="flex-1">{section.label}</span>
                                    <ChevronDown
                                        className={`size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-300 ease-out dark:text-sidebar-foreground/55 ${isOpen ? '' : '-rotate-90'}`}
                                    />
                                </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent
                                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                            >
                                <div className="min-h-0 overflow-hidden pl-1 pb-1 pt-1">
                                    <div className="space-y-0.5">
                                        {section.links.map((link) => {
                                            const LinkIcon = link.icon;

                                            return (
                                                <Link
                                                    key={link.label}
                                                    href={link.href}
                                                    onBefore={onNavigate}
                                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors ${link.active
                                                            ? 'bg-muted text-foreground dark:bg-gray-700 dark:text-gray-300'
                                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-sidebar-foreground/75 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground'
                                                        }`}
                                                >
                                                    {LinkIcon ? (
                                                        <LinkIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground dark:text-gray-300" />
                                                    ) : null}
                                                    <span className={`truncate leading-tight ${link.active ? 'font-semibold' : 'font-medium'}`}>
                                                        {link.label}
                                                    </span>
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
