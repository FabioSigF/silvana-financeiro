"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  DollarSign,
  UploadCloud,
  Settings,
  LogOut,
  Menu,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/components/auth/AuthProvider";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Movimentações", href: "/movimentacoes", icon: ArrowLeftRight },
    { name: "Contas a Pagar", href: "/contas-a-pagar", icon: DollarSign },
    { name: "Uploads", href: "/uploads", icon: UploadCloud },
    { name: "Configurações", href: "/configuracoes", icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavContent = ({ onClickItem, isSidebarCollapsed }: { onClickItem?: () => void; isSidebarCollapsed?: boolean }) => (
    <div className="flex flex-col h-full justify-between py-6 transition-all duration-300">
      <div className={`space-y-6 ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3 px-2"}`}>
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            S
          </div>
          {!isSidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-semibold text-slate-900 tracking-tight text-sm">Silvana Financeiro</h1>
              <p className="text-xs text-slate-500">Silvana Uniformes</p>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClickItem}
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                {!isSidebarCollapsed && <span className="transition-opacity duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`${isSidebarCollapsed ? "px-2" : "px-4"} border-t border-slate-100 pt-4 space-y-4`}>
        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3 px-2 py-1"}`}>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <User className="w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1 transition-opacity duration-300">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Usuário"}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} text-slate-600 hover:text-red-600 hover:bg-red-50`}
          title={isSidebarCollapsed ? "Sair da Conta" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span>Sair da Conta</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? "w-16" : "w-64"} border-r border-slate-150 bg-white fixed inset-y-0 left-0 z-20 transition-all duration-300`}>
        <NavContent isSidebarCollapsed={isCollapsed} />
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer z-30"
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main content wrapper */}
      <div className={`flex-1 flex flex-col ${isCollapsed ? "md:pl-16" : "md:pl-64"} min-w-0 transition-all duration-300`}>
        {/* Mobile Top Navbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base">
              S
            </div>
            <span className="font-semibold text-slate-900 text-sm">Silvana Financeiro</span>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="text-slate-600">
                  <Menu className="w-5 h-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegação</SheetTitle>
              </SheetHeader>
              <NavContent onClickItem={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
