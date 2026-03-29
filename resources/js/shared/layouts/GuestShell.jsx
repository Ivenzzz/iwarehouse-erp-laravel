export default function GuestShell({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    );
}
