import {
    ChartColumn,
    Home,
    LayoutDashboard,
    Mail,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Warehouse,
} from 'lucide-react';

export function getAdminNavSections() {
    return [
        {
            label: 'Overview',
            icon: Home,
            active: route().current('dashboard'),
            defaultOpen: true,
            links: [{ label: 'Dashboard', href: route('dashboard'), active: true }],
        },
        {
            label: 'Operations',
            icon: ChartColumn,
            links: [
                { label: 'POS', href: route('dashboard') },
                { label: 'Daily Sales Reports', href: route('dashboard') },
                { label: 'Sales', href: route('dashboard') },
                { label: 'Product Reports', href: route('dashboard') },
                { label: 'Placement Reports', href: route('dashboard') },
                { label: 'Customers', href: route('dashboard') },
            ],
        },
        {
            label: 'Warehouse',
            icon: Warehouse,
            links: [
                { label: 'Inventory', href: route('dashboard') },
                { label: 'Stock Transfers', href: route('dashboard') },
                { label: 'Warehouses', href: route('dashboard') },
            ],
        },
        {
            label: 'Purchasing',
            icon: ShoppingCart,
            links: [
                { label: 'Stock Requests', href: route('dashboard') },
                { label: 'RFQs', href: route('dashboard') },
                { label: 'Purchase Orders', href: route('dashboard') },
                { label: 'Delivery Receipts', href: route('dashboard') },
                { label: 'GRNs', href: route('dashboard') },
            ],
        },
        {
            label: 'Finance',
            icon: Mail,
            links: [
                { label: '3 Way Matching', href: route('dashboard') },
                { label: 'Price Control', href: route('dashboard') },
            ],
        },
        {
            label: 'Master Data',
            icon: LayoutDashboard,
            links: [
                { label: 'Product Masters', href: route('dashboard') },
                {
                    label: 'Brands',
                    href: route('brands.index'),
                    active: route().current('brands.*'),
                },
                { label: 'Categories', href: route('dashboard') },
            ],
        },
        {
            label: 'Settings',
            icon: Settings,
            links: [
                { label: 'General', href: route('dashboard') },
                { label: 'Companies', href: route('dashboard') },
                {
                    label: 'Configurations',
                    href: route('dashboard'),
                    icon: ShieldCheck,
                },
            ],
        },
    ];
}
