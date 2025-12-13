"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  Receipt,
  BarChart3,
  Brain,
  Target,
  Bell,
  TrendingUp,
  PiggyBank,
} from "lucide-react";

type Tab = "business" | "personal";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const businessFeatures = [
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Create, track, and manage professional invoices with customizable templates",
    status: "available" as const,
    badge: undefined,
  },
  {
    icon: Users,
    title: "Client Portal",
    description: "Manage all your clients in one centralized, easy-to-use dashboard",
    status: "available" as const,
    badge: undefined,
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    description: "Track and categorize business expenses effortlessly with smart receipts",
    status: "available" as const,
    badge: undefined,
  },
  {
    icon: BarChart3,
    title: "Financial Reports",
    description: "Real-time insights and analytics to make data-driven decisions",
    status: "available" as const,
    badge: undefined,
  },
];

const personalFeatures = [
  {
    icon: Brain,
    title: "Smart Bank Statement Analysis",
    description: "AI-powered transaction categorization with instant insights from uploaded statements",
    status: "coming-soon",
    badge: "Q2 2025",
  },
  {
    icon: Target,
    title: "Budget Planner",
    description: "Set and track spending limits with smart alerts when you're approaching your budget",
    status: "coming-soon",
    badge: "Q2 2025",
  },
  {
    icon: PiggyBank,
    title: "Savings Goals Tracker",
    description: "Visualize progress towards your financial goals with motivating milestones",
    status: "coming-soon",
    badge: "Q3 2025",
  },
  {
    icon: Bell,
    title: "Automated Insights",
    description: "Monthly email summaries with personalized recommendations and spending patterns",
    status: "coming-soon",
    badge: "Q2 2025",
  },
  {
    icon: TrendingUp,
    title: "Spending Patterns",
    description: "Understand where your money goes with detailed analytics and trends over time",
    status: "coming-soon",
    badge: "Q3 2025",
  },
];

export function Features() {
  const [activeTab, setActiveTab] = useState<Tab>("business");

  const features = activeTab === "business" ? businessFeatures : personalFeatures;

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 tracking-tight">
            Everything You Need to Manage Your Finances
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you're running a business or managing personal finances, FinTracker has you covered
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 bg-muted p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab("business")}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                activeTab === "business"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              For Business
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                activeTab === "personal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              For Personal
            </button>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={cn(
                  "group relative bg-card rounded-xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                  feature.status === "available"
                    ? "border-border hover:border-accent-emerald/30 hover:shadow-accent-emerald/10"
                    : "border-border hover:border-secondary/30 hover:shadow-secondary/10"
                )}
              >
                {/* Coming soon badge */}
                {feature.status === "coming-soon" && feature.badge && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-secondary to-accent-emerald text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {feature.badge}
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                    feature.status === "available"
                      ? "bg-accent-emerald/10 text-accent-emerald group-hover:bg-accent-emerald group-hover:text-accent-emerald-foreground group-hover:scale-110"
                      : "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground group-hover:scale-110"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2 tracking-tight">
                  {feature.title}
                  {feature.status === "available" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                      Live
                    </span>
                  )}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300 rounded-b-xl",
                    feature.status === "available" ? "bg-accent-emerald" : "bg-secondary"
                  )}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom note */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            {activeTab === "personal" ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Personal finance features are in active development. Join our waitlist to get early access!
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                All business features are available now. Start managing your finances today!
              </span>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
