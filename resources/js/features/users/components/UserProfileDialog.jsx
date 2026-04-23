import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import axios from 'axios';
import { useEffect, useState } from 'react';

export default function UserProfileDialog({ open, onOpenChange, user = null }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !user) {
            return;
        }

        setLoading(true);
        setError('');

        axios
            .get(route('settings.users.profile', user.id))
            .then((response) => setProfile(response.data))
            .catch(() => setError('Unable to load user profile.'))
            .finally(() => setLoading(false));
    }, [open, user]);

    const profileUser = profile?.user ?? user;
    const loginHistory = profile?.loginHistory ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                    <DialogDescription>
                        Account details, employee link, status, and recent login activity.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
                    {loading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : null}
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    {profileUser ? (
                        <>
                            <section className="grid gap-4 md:grid-cols-2">
                                <Info label="Name" value={profileUser.name} />
                                <Info label="Username" value={profileUser.username} />
                                <Info label="Email" value={profileUser.email || 'None'} />
                                <Info label="Created By" value={profileUser.created_by_label} />
                                <Info label="Last Login" value={profileUser.last_login_at || 'Never'} />
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{profileUser.status}</Badge>
                                        <Badge variant={profileUser.is_online ? 'default' : 'secondary'}>
                                            {profileUser.is_online ? 'Online' : 'Offline'}
                                        </Badge>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-sm font-semibold text-foreground">Roles</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(profileUser.roles ?? []).map((role) => (
                                        <Badge key={role} variant="outline">{role}</Badge>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-sm font-semibold text-foreground">Linked Employee</h3>
                                {profileUser.employee ? (
                                    <div className="grid gap-3 text-sm md:grid-cols-2">
                                        <Info label="Employee" value={`${profileUser.employee.employee_id} - ${profileUser.employee.full_name}`} />
                                        <Info label="Email" value={profileUser.employee.email || 'None'} />
                                        <Info label="Department" value={profileUser.employee.department || 'None'} />
                                        <Info label="Job Title" value={profileUser.employee.job_title || 'None'} />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No employee linked.</p>
                                )}
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground">Recent Login History</h3>
                                {loginHistory.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted text-foreground">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">Time</th>
                                                    <th className="px-3 py-2 text-left font-semibold">IP</th>
                                                    <th className="px-3 py-2 text-left font-semibold">User Agent</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loginHistory.map((item) => (
                                                    <tr key={item.id} className="border-b border-border">
                                                        <td className="px-3 py-2">{item.logged_in_at}</td>
                                                        <td className="px-3 py-2">{item.ip_address || 'N/A'}</td>
                                                        <td className="max-w-md truncate px-3 py-2">{item.user_agent || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No successful login activity recorded.</p>
                                )}
                            </section>
                        </>
                    ) : null}
                </DialogBody>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Info({ label, value }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
    );
}
