"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, User, Crown } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/currency", label: "Currency" },
  { href: "/consultancy", label: "Consultancy" },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user, isLoggedIn, isPremium } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">*</span>
          </div>
          <span className="font-semibold text-lg text-foreground">Intellitrex</span>
        </Link>

        <div className="flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isPremium && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-medium">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
          <button
            onClick={toggle}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <Link
            href="/profile"
            className="p-2 rounded-full border border-border hover:bg-muted transition-colors relative"
          >
            {isLoggedIn && user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
