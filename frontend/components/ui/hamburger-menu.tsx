"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick?: () => void;
  className?: string;
}

export function HamburgerMenu({ isOpen, onClick, className }: HamburgerMenuProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-10 h-10 relative focus:outline-none rounded-md transition-colors hover:bg-accent group cursor-pointer",
        className
      )}
      aria-label="Toggle menu"
    >
      <span className="sr-only">Toggle menu</span>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className={cn(
            "hamburger-line",
            isOpen && "hamburger-line-active",
            isHovered && "hamburger-line-hovered"
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
          transition: background-color 0.5s ease-in-out;
        }

        .hamburger-line::before,
        .hamburger-line::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 2px;
          background-color: currentColor;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          left: 0;
        }

        .hamburger-line::before {
          top: -6px;
        }

        .hamburger-line::after {
          top: 6px;
        }

        /* Clicked/Active state - transforms to X with scale */
        .hamburger-line-active {
          background-color: transparent;
        }

        .hamburger-line-active::before {
          top: 0;
          transform: rotate(45deg) scale(1.1);
        }

        .hamburger-line-active::after {
          top: 0;
          transform: rotate(-45deg) scale(1.1);
        }

        /* Hover effect on X when clicked - make it slightly bigger */
        .hamburger-line-active.hamburger-line-hovered::before {
          transform: rotate(45deg) scale(1.15);
        }

        .hamburger-line-active.hamburger-line-hovered::after {
          transform: rotate(-45deg) scale(1.15);
        }

        /* Hover effect for hamburger state - breathing effect (spread lines) */
        .hamburger-line-hovered:not(.hamburger-line-active)::before {
          top: -7px;
        }

        .hamburger-line-hovered:not(.hamburger-line-active)::after {
          top: 7px;
        }
      `}</style>
    </button>
  );
}
