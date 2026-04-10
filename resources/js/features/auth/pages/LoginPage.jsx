import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import GuestShell from '@/shared/layouts/GuestShell';
import { Head, useForm } from '@inertiajs/react';

export default function LoginPage({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
    });

    const submit = (event) => {
        event.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestShell className="bg-gradient-to-br from-slate-200 via-slate-100 to-white dark:bg-muted/40">
            <Head title="Login" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        iWarehouse ERP 3.0
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Please sign in to your account to continue.
                    </p>
                </div>

                <Card>
                    <CardContent>
                        {status && (
                            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    name="username"
                                    value={data.username}
                                    autoComplete="username"
                                    autoFocus
                                    onChange={(event) =>
                                        setData('username', event.target.value)
                                    }
                                />
                                <InputError message={errors.username} className="mt-1" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    onChange={(event) =>
                                        setData('password', event.target.value)
                                    }
                                />
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            <Button type="submit" className="w-full bg-primary" disabled={processing}>
                                Log in
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </GuestShell>
    );
}
