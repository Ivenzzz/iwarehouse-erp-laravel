import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

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

export default function SidebarNav({ sections, onNavigate }) {
    const defaultOpenSections = useMemo(() => getDefaultOpenSections(sections), [sections]);
    const [openSections, setOpenSections] = useState(() => getStoredOpenSections(sections));

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
    };

    return (
        <div className="space-y-6 px-3">
            <div className="space-y-2">
                {sections.map((section) => {
                    const Icon = section.icon;

                    return (
                        <Collapsible
                            key={section.label}
                            open={openSections[section.label] ?? Boolean(section.defaultOpen)}
                            onOpenChange={(isOpen) => handleOpenChange(section.label, isOpen)}
                            className="group/collapsible"
                        >
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                                        section.active
                                            ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                            : 'text-slate-200/85 hover:bg-white/8 hover:text-white'
                                    }`}
                                >
                                    <Icon className="size-4" />
                                    <span className="flex-1">{section.label}</span>
                                    <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="px-3 pt-2">
                                <div className="ml-3 rounded-xl border-l border-white/10 pl-4">
                                    <div className="space-y-1.5">
                                        {section.links.map((link) => {
                                            const LinkIcon = link.icon;

                                            return (
                                                <Link
                                                    key={link.label}
                                                    href={link.href}
                                                    onBefore={onNavigate}
                                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                                        link.active
                                                            ? 'bg-white/8 text-white'
                                                            : 'text-slate-300/80 hover:bg-white/6 hover:text-white'
                                                    }`}
                                                >
                                                    {LinkIcon ? (
                                                        <LinkIcon className="size-3.5" />
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
