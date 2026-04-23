import {
    BarChart3,
    Boxes,
    ChartColumn,
    ClipboardCheck,
    ClipboardList,
    Cog,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    FolderCog,
    HandCoins,
    Home,
    LayoutDashboard,
    Mail,
    PackageCheck,
    Package2,
    ReceiptText,
    ShoppingBag,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Store,
    Tags,
    CreditCard,
    Truck,
    Users,
    User,
    UserCog,
    Warehouse,
    Waypoints,
} from 'lucide-react';

export function getAdminNavSections({ permissions = [] } = {}) {
    const can = (permission) => permissions.includes(permission);

    return [
        {
            label: 'MAIN',
            icon: Home,
            active: route().current('dashboard'),
            defaultOpen: true,
            links: [{ label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: LayoutDashboard }],
        },
        {
            label: 'OPERATIONS',
            icon: ChartColumn,
            defaultOpen: false,
            links: [
                { label: 'POS', href: route('pos.index'), active: route().current('pos.*'), icon: Store },
                { label: 'Sales', href: route('sales.index'), active: route().current('sales.*'), icon: ShoppingBag },
                { label: 'Sales Reports', href: route('sales-report.index'), active: route().current('sales-report.*'), icon: FileSpreadsheet },
                { label: 'Product Reports', href: route('dashboard'), icon: BarChart3 },
                { label: 'Placement Reports', href: route('placement-reports.index'), active: route().current('placement-reports.*'), icon: FileText },
                { label: 'Customers', href: route('dashboard'), icon: Users },
            ],
        },
        {
            label: 'WAREHOUSE',
            icon: Warehouse,
            defaultOpen: false,
            links: [
                { label: 'Inventory', href: route('inventory.index'), active: route().current('inventory.*'), icon: Boxes },
                { label: 'Stock Transfers', href: route('stock-transfers.index'), active: route().current('stock-transfers.*'), icon: Waypoints },
            ],
        },
        {
            label: 'PURCHASING',
            icon: ShoppingCart,
            defaultOpen: false,
            links: [
                { label: 'Stock Requests', href: route('stock-requests.index'), active: route().current('stock-requests.*'), icon: ClipboardList },
                { label: 'SR Approval', href: route('stock-request-approvals.index'), active: route().current('stock-request-approvals.*'), icon: ClipboardCheck },
                { label: 'RFQs', href: route('request-for-quotations.index'), active: route().current('request-for-quotations.*'), icon: FileText },
                { label: 'Purchase Orders', href: route('purchase-orders.index'), active: route().current('purchase-orders.*'), icon: ShoppingCart },
                { label: 'Delivery Receipts', href: route('delivery-receipts.index'), active: route().current('delivery-receipts.*'), icon: ReceiptText },
                { label: 'GRNs', href: route('goods-receipts.index'), active: route().current('goods-receipts.*'), icon: PackageCheck },
            ],
        },
        {
            label: 'FINANCE',
            icon: Mail,
            defaultOpen: false,
            links: [
                { label: '3 Way Matching', href: route('dashboard'), icon: FileCheck2 },
                { label: 'Price Control', href: route('price-control.index'), active: route().current('price-control.*'), icon: HandCoins },
            ],
        },
        {
            label: 'MASTER DATA',
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
                    label: 'Customers',
                    href: route('customers.index'),
                    active: route().current('customers.*'),
                    icon: User,
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
            label: 'SETTINGS',
            icon: Settings,
            defaultOpen: false,
            links: [
                ...(can('companies.view')
                    ? [{
                        label: 'Companies',
                        href: route('settings.companies.index'),
                        active: route().current('settings.companies.*'),
                        icon: FolderCog,
                    }]
                    : []),
                ...(can('users.view')
                    ? [{
                        label: 'Users',
                        href: route('settings.users.index'),
                        active: route().current('settings.users.*'),
                        icon: UserCog,
                    }]
                    : []),
                ...(can('roles-permissions.view')
                    ? [{
                        label: 'Roles and Permissions',
                        href: route('settings.roles-permissions.index'),
                        active: route().current('settings.roles-permissions.*'),
                        icon: ShieldCheck,
                    }]
                    : []),
                {
                    label: 'Configurations',
                    href: route('dashboard'),
                    icon: ShieldCheck,
                },
            ],
        },
    ];
}

