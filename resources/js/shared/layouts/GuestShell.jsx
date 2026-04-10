export default function GuestShell({ children, className = '', contentClassName = '' }) {
    return (
        <div className={`flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10 ${className}`.trim()}>
            <div className={`w-full max-w-sm ${contentClassName}`.trim()}>{children}</div>
        </div>
    );
}
