"use client"

import { Link, useLocation } from "react-router-dom"
import { HomeIcon, UsersIcon, PhoneCallIcon, FileTextIcon, ShieldIcon, LogoutIcon } from "./Icons"
import { Database, Wallet, Settings as SettingsIcon } from "lucide-react"
import { useContext } from "react"
import { AuthContext } from "../App"
import nutechLogo from "../assests/Nutechlogo.png"

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
    const location = useLocation()
    const { userType, isAdmin, logout } = useContext(AuthContext)

    // Base routes available to all users
    const routes = [
        {
            href: "/",
            label: "Dashboard",
            icon: <HomeIcon className="h-5 w-5 mr-3" />,
            active: location.pathname === "/",
        },
        {
            href: "/leads",
            label: "Leads",
            icon: <UsersIcon className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/leads"),
        },
        {
            href: "/follow-up",
            label: "Call Tracker",
            icon: <PhoneCallIcon className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/follow-up"),
        },
        {
            href: "/quotation",
            label: "Quotation",
            icon: <FileTextIcon className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/quotation"),
        },
        {
            href: "/advance-payment",
            label: "Received Advance against PI",
            icon: <Wallet className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/advance-payment"),
        },
        {
            href: "/master",
            label: "Master",
            icon: <Database className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/master"),
        },
        {
            href: "/settings",
            label: "Settings",
            icon: <SettingsIcon className="h-5 w-5 mr-3" />,
            active: location.pathname.startsWith("/settings"),
        },
    ]

    // Add admin-only route if needed (commented out in original)
    // if (isAdmin && isAdmin()) { ... }

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Component */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-100 text-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-16 items-center justify-start border-b border-slate-100 px-6">
                    <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-row items-center gap-2">
                            <img src={nutechLogo} alt="Nutech" className="h-10 w-auto object-contain" />
                            
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            to={route.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active
                                ? "bg-sky-500 text-white shadow-md shadow-sky-200 hover:bg-sky-600"
                                : "text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                                }`}
                        >
                            {route.icon}
                            {route.label}
                        </Link>
                    ))}
                </nav>

                {/* Optional: User info or footer in sidebar */}
                <div className="border-t border-slate-100 p-4">
                    <button
                        onClick={logout}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200"
                    >
                        <LogoutIcon className="h-5 w-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar
