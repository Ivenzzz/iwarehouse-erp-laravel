import { BarChart3, CircleAlert, Clock3, MessageSquareText } from 'lucide-react';

export function MessageStrip() {
    return (
        <div className="flex justify-center pt-1">
            <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500 text-white">
                    <MessageSquareText className="size-4" />
                </div>
                <div className="min-w-0 flex-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Message from Olivia:</span>{' '}
                    Can you review the latest report?
                </div>
                <div className="hidden items-center gap-2 text-slate-400 sm:flex">
                    <Clock3 className="size-4" />
                    <CircleAlert className="size-4" />
                    <BarChart3 className="size-4" />
                </div>
            </div>
        </div>
    );
}
