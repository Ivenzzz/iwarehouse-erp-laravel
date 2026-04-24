import {
    BarChart3,
    Banknote,
    Boxes,
    Building2,
    CalendarCheck,
    ChartColumn,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileMinus2,
    FileSpreadsheet,
    FileText,
    FolderCog,
    GitCompareArrows,
    HandCoins,
    Home,
    LayoutDashboard,
    PackageCheck,
    Package2,
    ReceiptText,
    RefreshCcw,
    Settings,
    Shapes,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    SlidersHorizontal,
    Store,
    Tags,
    Truck,
    UserCheck,
    UserCog,
    Users,
    Warehouse,
    Waypoints,
    Wrench,
} from 'lucide-react';

export function getAdminNavSections({ permissions = [] } = {}) {
    const can = (permission) => permissions.includes(permission);

    return [
        {
            label: 'MAIN',
            icon: Home,
            active: route().current('dashboard'),
            defaultOpen: true,
            links: [
                {
                    label: 'Dashboard',
                    href: route('dashboard'),
                    active: route().current('dashboard'),
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            label: 'OPERATIONS',
            icon: ChartColumn,
            defaultOpen: false,
            links: [
                { label: 'POS', href: route('pos.index'), active: route().current('pos.*'), icon: Store },
                { label: 'Sales', href: route('sales.index'), active: route().current('sales.*'), icon: ShoppingBag },
                { label: 'Sales Reports', href: route('sales-report.index'), active: route().current('sales-report.*'), icon: FileSpreadsheet },
                { label: 'Sales / Profit Tracker', href: route('sales-profit-tracker.index'), active: route().current('sales-profit-tracker.*'), icon: BarChart3 },
                { label: 'Product Reports', href: route('product-reports.index'), active: route().current('product-reports.*'), icon: BarChart3 },
                { label: 'Placement Reports', href: route('placement-reports.index'), active: route().current('placement-reports.*'), icon: FileText },
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
            label: 'QUALITY & SERVICE',
            icon: ShieldCheck,
            defaultOpen: false,
            links: [
                { label: 'RMA Dashboard', href: route('dashboard'), icon: RefreshCcw },
                { label: 'RMA Validation', href: route('dashboard'), icon: ClipboardCheck },
                { label: 'Technical Assessment', href: route('dashboard'), icon: Wrench },
                { label: 'RMA Final Approval', href: route('dashboard'), icon: UserCheck },
            ],
        },
        {
            label: 'FINANCE',
            icon: Banknote,
            defaultOpen: false,
            links: [
                { label: 'Credit Memos', href: route('dashboard'), icon: FileMinus2 },
                { label: '3 Way Matching', href: route('three-way-matching.index'), active: route().current('three-way-matching.*'), icon: GitCompareArrows },
                { label: 'Price Control', href: route('price-control.index'), active: route().current('price-control.*'), icon: HandCoins },
            ],
        },
        {
            label: 'HUMAN RESOURCES',
            icon: Users,
            defaultOpen: false,
            links: [
                { label: 'Employees', href: route('dashboard'), icon: Users },
                { label: 'Attendance', href: route('dashboard'), icon: CalendarCheck },
                { label: 'Payroll', href: route('dashboard'), icon: Banknote },
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
                    icon: Shapes,
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
                    icon: Users,
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
                        icon: Building2,
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
                    icon: SlidersHorizontal,
                },
            ],
        },
    ];
}
