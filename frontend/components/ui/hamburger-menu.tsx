"use client";

import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick?: () => void;
  className?: string;
}

export function HamburgerMenu({ isOpen, onClick, className }: HamburgerMenuProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-10 h-10 relative focus:outline-none rounded-md transition-colors hover:bg-accent group",
        className
      )}
      aria-label="Toggle menu"
    >
      <span className="sr-only">Toggle menu</span>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className={cn(
            "hamburger-line",
            isOpen && "hamburger-line-active"
          )}
        />
      </div>
      <style jsx>{`
        .hamburger-line {
          display: block;
          position: relative;
          width: 20px;
          height: 2px;
          background-color: currentColor;
          transition: background-color 0.3s ease-in-out;
        }

        .hamburger-line::before,
        .hamburger-line::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 2px;
          background-color: currentColor;
          transition: all 0.3s ease-in-out;
        }

        .hamburger-line::before {
          transform: translateY(-6px);
        }

        .hamburger-line::after {
          transform: translateY(6px);
        }

        .hamburger-line-active {
          background-color: transparent;
        }

        .hamburger-line-active::before {
          transform: rotate(45deg);
        }

        .hamburger-line-active::after {
          transform: rotate(-45deg);
        }
      `}</style>
    </button>
  );
}
