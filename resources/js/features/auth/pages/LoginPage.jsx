import React, { useEffect, useRef, useState } from 'react';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import GuestShell from '@/shared/layouts/GuestShell';
import { Head, useForm, Link } from '@inertiajs/react';
import { User, Lock, Eye, EyeOff } from 'lucide-react'; 

const SAVED_LOGIN_KEY = 'iwarehouse.saved_login_credentials';

export default function LoginPage({ status }) {
    const [showPassword, setShowPassword] = useState(false);
    const shouldForceDarkAfterLoginRef = useRef(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: true,
    });

    useEffect(() => {
        const root = document.documentElement;
        const hadDarkClass = root.classList.contains('dark');
        const previousColorScheme = root.style.colorScheme;

        root.classList.remove('dark');
        root.style.colorScheme = 'light';

        return () => {
            if (shouldForceDarkAfterLoginRef.current) {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
                return;
            }

            if (hadDarkClass) {
                root.classList.add('dark');
            }
            root.style.colorScheme = previousColorScheme;
        };
    }, []);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(SAVED_LOGIN_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (typeof parsed?.username === 'string') {
                setData('username', parsed.username);
            }
            if (typeof parsed?.password === 'string') {
                setData('password', parsed.password);
            }
        } catch {
            // Ignore invalid/blocked storage; login form still works.
        }
    }, [setData]);

    const submit = (event) => {
        event.preventDefault();
        try {
            window.localStorage.setItem(
                SAVED_LOGIN_KEY,
                JSON.stringify({
                    username: data.username,
                    password: data.password,
                }),
            );
        } catch {
            // Ignore storage errors and continue login.
        }
        post(route('login'), {
            onSuccess: () => {
                try {
                    window.localStorage.setItem('darkMode', JSON.stringify(true));
                } catch {
                    // Ignore storage errors; auth flow should still continue.
                }

                shouldForceDarkAfterLoginRef.current = true;
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
            },
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestShell className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
            <Head title="Login" />

            <div className="w-full max-w-[440px] px-4 flex flex-col">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[20px] py-10">
                    <CardContent>
                        {/* Logo Section */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mb-8 shadow-xl">
                                <span className="text-white font-bold text-sm tracking-tight">
                                    <span className='text-orange-500'>i</span>Warehouse
                                </span>
                            </div>
                            
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight text-center">
                                iWarehouse ERP
                            </h1>
                            <p className="text-muted-foreground mt-1 font-medium text-sm">
                                Sign in to continue
                            </p>
                        </div>

                        {status && (
                            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            {/* Username Field */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="username" className="text-[#475569] font-bold text-xs ml-1">
                                    Username
                                </Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-600" />
                                    <Input
                                        id="username"
                                        type="text"
                                        name="username"
                                        placeholder="Username"
                                        className="pl-10 h-12 bg-[#f8fafc] border-[#e2e8f0] rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300 transition-all"
                                        value={data.username}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(event) => setData('username', event.target.value)}
                                    />
                                </div>
                                <InputError message={errors.username} className="mt-1" />
                            </div>

                            {/* Password Field */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="password" className="text-[#475569] font-bold text-xs ml-1">
                                    Password
                                </Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-600" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="........"
                                        className="pl-10 pr-10 h-12 bg-[#f8fafc] border-[#e2e8f0] rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300 transition-all"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(event) => setData('password', event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            {/* Sign In Button */}
                            <Button 
                                type="submit" 
                                className="w-full h-12 bg-[#0f172a] hover:bg-black text-white font-bold rounded-xl mt-4 transition-all" 
                                disabled={processing}
                            >
                                Sign in
                            </Button>

                            {/* Footer Links */}
                            <div className="flex items-center justify-between mt-8 px-1">
                                <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                                    Forgot password?
                                </button>
                                <div className="text-xs text-slate-500 font-medium">
                                    Need an account? <span className="text-[#0f172a] font-bold cursor-pointer hover:underline">Sign up</span>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Copyright Section */}
                <div className="mt-8 text-center text-[11px] text-slate-400 font-medium tracking-wide">
                    &copy; {new Date().getFullYear()} iWarehouse Corporation. All rights reserved.
                </div>
            </div>
        </GuestShell>
    );
}
