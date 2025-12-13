"use client";

import Link from "next/link";

const footerLinks = {
  product: [
    { name: "How It Works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
    { name: "Roadmap", href: "#roadmap" },
  ],
  resources: [
    { name: "GitHub", href: "https://github.com" },
  ],
};


export function Footer() {
  return (
    <footer style={{backgroundColor: '#121212'}} className="border-t border-white text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-emerald to-secondary flex items-center justify-center group-hover:scale-110 transition-all duration-200 shadow-md shadow-accent-emerald/20">
                <span className="text-accent-emerald-foreground font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-primary-foreground">FinTracker</span>
            </Link>
            <p className="text-primary-foreground/70 text-sm mb-6 max-w-md">
              Your complete financial operating system for business and personal finance management.
            </p>
          </div>

          {/* Links column */}
          <div className="grid grid-cols-2 gap-8">
            {/* Product links */}
            <div>
              <h3 className="font-semibold text-primary-foreground mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-primary-foreground/70 hover:text-accent-emerald text-sm transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources links */}
            <div>
              <h3 className="font-semibold text-primary-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-foreground/70 hover:text-accent-emerald text-sm transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-4 border-t border-border/10">
          <div className="text-center md:text-left">
            <p className="text-primary-foreground/50 text-sm">
              © 2026 FinTracker. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
