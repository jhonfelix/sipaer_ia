"use client";

import {
  FileText,
  AudioLines,
  RefreshCw,
  LogOut,
  ChevronDown,
  Bot,
  Settings,
  User2
} from "lucide-react";
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

export function Header({ user }: HeaderProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 bg-[#1e3a5f] dark:bg-[#1e3a5f] border-b border-[#2d4a6f] flex items-center justify-between px-4 shrink-0 transition-colors duration-300">
      {/* Logo e Navegação */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm tracking-wide">
              SIPAER AI
            </span>
            <span className="text-white/60 text-[10px] leading-none">
              Sistema de Gestão de Relatórios Aeronáuticos
            </span>
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm">Relatório Técnico</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
          >
            <AudioLines className="w-4 h-4" />
            <span className="text-sm">LABDATA</span>
          </Button>
        </nav>

        {/* Badge Versão */}
        <Badge
          variant="outline"
          className="bg-[#2d4a6f] text-white/80 border-[#3d5a7f] text-xs"
        >
          v1.0 CENIPA
        </Badge>
      </div>

      {/* Área do Usuário */}
      <div className="flex items-center gap-3">
        {/* Email */}
        <span className="text-white/70 text-sm hidden md:block">
          {user.email}
        </span>

        {/* Sincronizar Dédalo */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm hidden lg:inline">Sincronizar com Dédalo</span>
        </Button>

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
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
