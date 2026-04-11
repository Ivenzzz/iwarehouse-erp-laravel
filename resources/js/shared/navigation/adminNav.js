import {
    ChartColumn,
    Home,
    LayoutDashboard,
    Mail,
    Package2,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Tags,
    CreditCard,
    Truck,
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
            defaultOpen: false,
            links: [
                { label: 'POS', href: route('pos.index'), active: route().current('pos.*') },
                { label: 'Daily Sales Reports', href: route('sales-report.index'), active: route().current('sales-report.*') },
                { label: 'Sales', href: route('sales.index'), active: route().current('sales.*') },
                { label: 'Product Reports', href: route('dashboard') },
                { label: 'Placement Reports', href: route('placement-reports.index'), active: route().current('placement-reports.*') },
                { label: 'Customers', href: route('dashboard') },
            ],
        },
        {
            label: 'Warehouse',
            icon: Warehouse,
            defaultOpen: false,
            links: [
                { label: 'Inventory', href: route('inventory.index'), active: route().current('inventory.*') },
                { label: 'Stock Transfers', href: route('stock-transfers.index'), active: route().current('stock-transfers.*') },
            ],
        },
        {
            label: 'Purchasing',
            icon: ShoppingCart,
            defaultOpen: false,
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
            defaultOpen: false,
            links: [
                { label: '3 Way Matching', href: route('dashboard') },
                { label: 'Price Control', href: route('price-control.index'), active: route().current('price-control.*') },
            ],
        },
        {
            label: 'Master Data',
            icon: LayoutDashboard,
            defaultOpen: true,
            links: [
                {
                    label: 'Product Masters',
                    href: route('product-masters.index'),
                    active: route().current('product-masters.*'),
                    icon: Package2,
                },
                {
                    label: 'Brands',
                    href: route('brands.index'),
                    active: route().current('brands.*'),
                    icon: Tags,
                },
                {
                    label: 'Categories',
                    href: route('categories.index'),
                    active: route().current('categories.*'),
                    icon: Tags,
                },
                {
                    label: 'Suppliers',
                    href: route('suppliers.index'),
                    active: route().current('suppliers.*'),
                    icon: Truck,
                },
                {
                    label: 'Warehouses',
                    href: route('warehouses.index'),
                    active: route().current('warehouses.*'),
                    icon: Warehouse,
                },
                {
                    label: 'Payment Methods',
                    href: route('payment-methods.index'),
                    active: route().current('payment-methods.*'),
                    icon: CreditCard,
                },
            ],
        },
        {
            label: 'Settings',
            icon: Settings,
            defaultOpen: false,
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
