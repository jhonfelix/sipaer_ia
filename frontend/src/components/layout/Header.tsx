"use client";

import {
  RefreshCw,
  LogOut,
  ChevronDown,
  Bot,
  Settings,
  User2,
  FileText,
  House,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@/types/report";

interface HeaderProps {
  user: User;
}

const SIDEBAR_ROUTES = ["/dashboard", "/chat"];

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const showHome = !SIDEBAR_ROUTES.some(
    (r) => pathname === r || pathname?.startsWith(r + "/")
  );
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 bg-[#1e3a5f] dark:bg-[#1e3a5f] border-b border-[#2d4a6f] flex items-center justify-between px-4 shrink-0 transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm tracking-wide">
            SIPAER AI
          </span>
          <span className="text-white/50 text-[10px] leading-none">
            Sistema integrado de inteligência de dados
          </span>
        </div>
        <Badge
          variant="outline"
          className="bg-[#2d4a6f] text-white/80 border-[#3d5a7f] text-xs ml-1"
        >
          v1.0 CENIPA
        </Badge>

        {showHome && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-white/60 hover:text-white text-xs font-medium transition-all"
          >
            <House className="w-3.5 h-3.5" />
            Home
          </Link>
        )}
      </div>

      {/* Área do Usuário */}
      <div className="flex items-center gap-3">
        {/* Email */}
        <span className="text-white/70 text-sm hidden md:block">
          {user.email}
        </span>

        {/* Toggle de Tema */}
        <ThemeToggle />

        {/* Avatar e Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-white/10"
            >
              <Avatar className="w-8 h-8 bg-white/20">
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-white/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">           
            <div className="flex px-2 py-1.5 gap-2 justify-center">
            <User2 className="w-4 h-4 mr-2" />
              <p className="text-sm font-medium">{user.name}</p>
              <p className=" text-xs text-muted-foreground">{user.unit}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              Meus Relatórios
            </DropdownMenuItem>
            <DropdownMenuItem>
            <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => { logout(); router.push("/login"); }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
