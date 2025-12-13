"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-muted via-secondary/10 to-accent-emerald/10 pt-32 pb-24">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-emerald/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-highlight/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          initial="initial"
          animate="animate"
          variants={staggerChildren}
        >
          {/* Left column - Text content */}
          <div className="text-center lg:text-left">
            <motion.div variants={fadeIn}>
              <div className="inline-flex items-center gap-2 bg-accent-emerald/10 text-accent-emerald px-4 py-2 rounded-full text-sm font-medium mb-6 border border-accent-emerald/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald"></span>
                </span>
                Free to Use • Paid Features Coming Soon
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight"
              variants={fadeIn}
            >
              <span className="text-primary">Master Your Money,</span>
              <br />
              <span className="bg-gradient-to-r from-accent-emerald to-secondary bg-clip-text text-transparent">
                Grow Your Business
              </span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              variants={fadeIn}
            >
              From invoices to insights - manage your business finances and personal budgets all in one intelligent platform with FinTracker.
            </motion.p>

            {/* Feature highlights */}
            <motion.div
              className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10"
              variants={fadeIn}
            >
              <div className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5 text-accent-emerald" />
                <span className="text-sm font-medium">Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-accent-emerald" />
                <span className="text-sm font-medium">AI-Powered Insights</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              variants={fadeIn}
            >
              <Link href="/register">
                <Button
                  className="h-12 px-8 bg-gradient-to-r from-accent-emerald to-accent-emerald/90 hover:from-accent-emerald/90 hover:to-accent-emerald text-accent-emerald-foreground font-semibold shadow-xl shadow-accent-emerald/20 hover:shadow-2xl hover:shadow-accent-emerald/30 hover:scale-105 transition-all duration-200 group"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  variant="outline"
                  className="h-12 px-8 bg-background hover:bg-muted text-foreground border-border hover:border-primary/30 font-semibold hover:scale-105 transition-all duration-200"
                >
                  Explore Features
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right column - Dashboard preview mockup */}
          <motion.div
            className="hidden lg:block"
            variants={fadeIn}
          >
            <div className="relative">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-emerald/10 to-secondary/10 rounded-2xl blur-3xl" />

              {/* Dashboard preview card */}
              <div className="relative bg-background/60 backdrop-blur-xl rounded-2xl border border-border p-6 shadow-2xl">
                <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
                  {/* Mock dashboard header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-emerald to-secondary" />
                      <div>
                        <div className="h-3 w-24 bg-muted rounded mb-2" />
                        <div className="h-2 w-16 bg-muted/70 rounded" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-highlight" />
                      <div className="w-2 h-2 rounded-full bg-success" />
                    </div>
                  </div>

                  {/* Mock stats cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-accent-emerald/10 to-accent-emerald/5 rounded-lg p-4 border border-accent-emerald/20">
                      <div className="h-2 w-20 bg-accent-emerald/40 rounded mb-3" />
                      <div className="h-6 w-24 bg-accent-emerald/60 rounded" />
                    </div>
                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg p-4 border border-secondary/20">
                      <div className="h-2 w-20 bg-secondary/40 rounded mb-3" />
                      <div className="h-6 w-24 bg-secondary/60 rounded" />
                    </div>
                  </div>

                  {/* Mock chart */}
                  <div className="bg-muted rounded-lg p-4 border border-border">
                    <div className="flex items-end justify-between h-32 gap-2">
                      {[40, 65, 45, 80, 60, 90, 70].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-accent-emerald to-secondary rounded-t"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 bg-card rounded-lg shadow-lg p-3 border border-accent-emerald/30"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">+$2,450</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
