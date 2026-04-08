import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  ClipboardList,
  ShoppingBag,
  Boxes,
  Tags,
  Activity,
  GitCompare,
  CreditCard,
  Truck,
  CheckSquare,
  AlertCircle,
  RotateCcw,
  DollarSign,
  BarChart3,
  Store,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  Box,
  Menu,
  X,
  Calendar,
  FileSpreadsheet,
  Barcode,
  Moon,
  Sun,
  Smartphone,
  FileText
} from "lucide-react";
import GlobalHeader from "@/components/shared/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  useAllRolePageAccess,
  filterMenuSections,
  canAccessPage,
} from "@/components/shared/hooks/useRolePageAccess";
import AccessDenied from "@/components/shared/AccessDenied";

const menuSections = [
  {
    title: "MAIN",
    items: [{ name: "Dashboard", icon: LayoutDashboard, path: "Dashboard" }],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "POS", icon: ShoppingCart, path: "POS" },
      { name: "Sales", icon: ShoppingCart, path: "Sales" },
      { name: "Sales Reports", icon: FileText, path: "SalesReport" },
      { name: "Product Reports", icon: BarChart3, path: "ProductReports" },
      { name: "Customers", icon: Users, path: "Customers" },
      { name: "Programs", icon: Calendar, path: "Programs" },
    ],
  },
  {
    title: "WAREHOUSE",
    items: [
      { name: "Inventory", icon: Package, path: "Inventory" },
      { name: "Product Bundles", icon: Boxes, path: "ProductBundles" },
      { name: "Stock Transfer", icon: GitCompare, path: "StockTransfer" },
      { name: "Locations", icon: Store, path: "Warehouses" },
      { name: "Placement Reports", icon: FileSpreadsheet, path: "PlacementReports" },
    ],
  },
  {
    title: "PURCHASING AND INBOUND",
    items: [
      { name: "Stock Requests", icon: ClipboardList, path: "StockRequests" },
      { name: "Admin Review", icon: AlertCircle, path: "AdminReview" },
      { name: "RFQ", icon: FileText, path: "RequestForQuotation" },
      { name: "Purchase Orders", icon: ShoppingBag, path: "PurchaseOrders" },
      { name: "Delivery Receipts", icon: Truck, path: "DeliveryReceipts" },
      { name: "GRN / Purchases", icon: PackageCheck, path: "GoodsReceipt" },
      { name: "QC Inspection", icon: CheckSquare, path: "QCInspection" },
    ],
  },
  {
    title: "QUALITY & SERVICE",
    items: [
      { name: "RMA List", icon: RotateCcw, path: "RMAList" },
      { name: "RMA Inspection", icon: ClipboardList, path: "RMAInspection" },
      { name: "RMA Transfers", icon: Truck, path: "RMATransfers" },
      { name: "RMA Approval", icon: RotateCcw, path: "RMAApproval" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { name: "Cash & Bank Control", icon: DollarSign, path: "CashBankControl" },
      { name: "3-Way Match", icon: GitCompare, path: "ThreeWayMatching" },
      { name: "Expenses", icon: DollarSign, path: "Expenses" },
      { name: "Price Controller", icon: Tags, path: "PriceController" },
    ],
  },
  {
    title: "HUMAN RESOURCES",
    items: [{ name: "Employees", icon: Users, path: "Employees" }],
  },
  {
    title: "MASTER DATA",
    items: [
      { name: "Product Masters", icon: Boxes, path: "ProductCatalog" },
      { name: "Categories", icon: Tags, path: "Categories" },
      { name: "Brands", icon: Tags, path: "Brands" },
      { name: "Suppliers", icon: Users, path: "Suppliers" },
      { name: "Payment Methods", icon: CreditCard, path: "PaymentMethods" },
      { name: "Device Diagrams", icon: Smartphone, path: "DeviceDiagrams" },
    ],
  },
  {
    title: "ANALYTICS & REPORTS",
    items: [{ name: "Logs", icon: Activity, path: "Logs" }],
  },
  {
    title: "SETTINGS",
    items: [
      { name: "User Management", icon: Users, path: "UserManagement" },
      { name: "Company Settings", icon: Settings, path: "CompanySettings" },
      { name: "Configuration", icon: Settings, path: "Configuration" },
      { name: "Barcode Templates", icon: Barcode, path: "BarcodeTemplates" },
      { name: "Google Sheets Links", icon: FileSpreadsheet, path: "GoogleSheetsLinks" },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const [expandedSections, setExpandedSections] = React.useState(() => {
    try {
      const saved = localStorage.getItem("expandedSections");
      return saved
        ? JSON.parse(saved)
        : {
            MAIN: true,
            OPERATIONS: true,
            WAREHOUSE: true,
            "PURCHASING AND INBOUND": true,
            "QUALITY & SERVICE": false,
            FINANCE: false,
            "HUMAN RESOURCES": false,
            "MASTER DATA": false,
            "ANALYTICS & REPORTS": false,
            SETTINGS: false,
          };
    } catch {
      return {
        MAIN: true,
        OPERATIONS: true,
        WAREHOUSE: true,
        "PURCHASING AND INBOUND": true,
        "QUALITY & SERVICE": false,
        FINANCE: false,
        "HUMAN RESOURCES": false,
        "MASTER DATA": false,
        "ANALYTICS & REPORTS": false,
        SETTINGS: false,
      };
    }
  });

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [posFullscreen, setPosFullscreen] = React.useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: rolePageAccessList = [], isLoading: isRoleAccessLoading } =
    useAllRolePageAccess();

  const [darkMode, setDarkMode] = React.useState(() => {
    try {
      const saved = localStorage.getItem("darkMode");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const sidebarRef = React.useRef(null);

  // Apply dark mode class to document root
  React.useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    try {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch (error) {
      console.error("Failed to save dark mode preference:", error);
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const filteredMenuSections = filterMenuSections(
    menuSections,
    currentUser,
    rolePageAccessList,
    isRoleAccessLoading
  );

  React.useEffect(() => {
    try {
      localStorage.setItem("expandedSections", JSON.stringify(expandedSections));
    } catch (error) {
      console.error("Failed to save section state:", error);
    }
  }, [expandedSections]);

  React.useEffect(() => {
    if (!currentPageName) return;

    const currentSection = filteredMenuSections.find((section) =>
      section.items.some((item) => item.path === currentPageName)
    );

    if (currentSection && !expandedSections[currentSection.title]) {
      setExpandedSections((prev) => ({ ...prev, [currentSection.title]: true }));
    }
  }, [currentPageName, expandedSections, filteredMenuSections]);

  React.useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    try {
      const savedScrollPosition = localStorage.getItem("sidebarScrollPosition");
      if (savedScrollPosition) sidebar.scrollTop = parseInt(savedScrollPosition, 10);
    } catch (error) {
      console.error("Failed to restore scroll position:", error);
    }

    const handleScroll = () => {
      try {
        localStorage.setItem("sidebarScrollPosition", sidebar.scrollTop.toString());
      } catch (error) {
        console.error("Failed to save scroll position:", error);
      }
    };

    sidebar.addEventListener("scroll", handleScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  // Listen for POS fullscreen toggle
  React.useEffect(() => {
    const handlePosFullscreen = (e) => {
      setPosFullscreen(e.detail?.fullscreen || false);
    };
    window.addEventListener("pos-fullscreen", handlePosFullscreen);
    return () => window.removeEventListener("pos-fullscreen", handlePosFullscreen);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && !e.target.closest(".sidebar") && !e.target.closest(".menu-button")) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  const toggleSection = (sectionTitle) => {
    setExpandedSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  const isActive = (path, parentPath) => {
    if (currentPageName === path) return true;
    if (parentPath && currentPageName === parentPath) return true;
    if (path === "POSMenu" && currentPageName === "POS") return true;

    const normalizedCurrentPage = currentPageName?.toLowerCase().replace(/\s+/g, "");
    const normalizedPath = path?.toLowerCase().replace(/\s+/g, "");
    return normalizedCurrentPage === normalizedPath;
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Theme-aware utility classes
  const shellBg = "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100";
  const sidebarBg = "bg-white dark:bg-slate-900";
  const borderClr = "border-slate-200 dark:border-slate-800";
  const subtleText = "text-slate-500 dark:text-slate-400";
  const headerHover = "hover:bg-slate-100 dark:hover:bg-slate-800/40";

  // Active/hover styles for sidebar items (theme-aware)
  const itemBase =
    "sidebar-item flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg sublink-text transition-colors";
  const itemInactive = "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100";
  const itemHover = "hover:bg-slate-100 dark:hover:bg-slate-800";
  const itemActive = "bg-slate-200 text-slate-900 font-medium dark:bg-slate-700 dark:text-slate-50";

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${shellBg}`}>
      <Toaster position="bottom-right" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        body, .font-sans { font-family: 'Figtree', sans-serif; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        .page-transition { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sidebar { transition: transform 0.3s ease; }
        .sublink-text { font-size: 12px; }

        @media (max-width: 1023px) {
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 40;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            z-index: 50;
            height: 100vh;
            width: 256px !important;
          }
          .sidebar.open { transform: translateX(0); }
        }
      `}</style>



      {/* Overlay (theme-aware) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""} bg-slate-950/30 dark:bg-slate-950/70`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`sidebar w-64 border-r flex flex-col overflow-hidden lg:relative lg:translate-x-0 ${sidebarBg} ${borderClr} ${sidebarOpen ? "open" : ""} ${posFullscreen ? "!hidden" : ""}`}
      >
        {/* Logo */}
        <div className={`p-4 border-b flex items-center ${borderClr}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-200 dark:bg-slate-700">
              <Box className="w-6 h-6 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">iWarehouse</h1>
              <p className={`text-[10px] ${subtleText}`}>ERP v2.0.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav ref={sidebarRef} className="flex-1 overflow-y-auto scrollbar-hide py-4">
          {filteredMenuSections.map((section) => (
            <div key={section.title} className="mb-3">
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full px-4 py-2 flex items-center justify-between text-[11px] font-semibold tracking-[0.5px] uppercase select-none ${subtleText} ${headerHover}`}
              >
                <span>{section.title}</span>
                {expandedSections[section.title] ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 dark:text-slate-500" />
                )}
              </button>

              {expandedSections[section.title] && (
                <div className="mt-1">
                  {section.items.map((item) => {
                    const active = isActive(item.path, item.parentPath);
                    return (
                      <Link
                        key={item.path}
                        to={createPageUrl(item.path)}
                        onClick={handleLinkClick}
                        className={[
                          itemBase,
                          itemHover,
                          active ? itemActive : itemInactive,
                        ].join(" ")}
                      >
                        <item.icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            active
                              ? "text-slate-900 dark:text-slate-50"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t p-3 ${borderClr}`}>
          <p className={`text-[10px] text-center ${subtleText}`}>iWarehouse ERP v2.0.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentPageName !== "POS" && (
          <GlobalHeader
            currentPageName={currentPageName}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          />
        )}
        <div className="flex-1 overflow-y-auto page-transition">
          {canAccessPage(currentUser, rolePageAccessList, currentPageName, isRoleAccessLoading) ? (
            children
          ) : (
            <AccessDenied />
          )}
        </div>
      </div>
    </div>
  );
}
