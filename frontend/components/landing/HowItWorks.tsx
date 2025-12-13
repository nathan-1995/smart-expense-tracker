"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  FileEdit,
  Send,
  LineChart,
  Lightbulb,
  Upload,
  Bot,
  Target,
  Mail,
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
      staggerChildren: 0.15
    }
  }
};

const businessSteps = [
  {
    icon: FileEdit,
    title: "Create",
    description: "Build professional invoices in minutes with our intuitive editor and customizable templates",
    color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    badge: undefined,
  },
  {
    icon: Send,
    title: "Send",
    description: "Share with clients instantly via email or generate shareable links for easy access",
    color: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: undefined,
  },
  {
    icon: LineChart,
    title: "Track",
    description: "Monitor payments and cash flow in real-time with comprehensive dashboards",
    color: "bg-gradient-to-br from-violet-500 to-violet-600",
    badge: undefined,
  },
  {
    icon: Lightbulb,
    title: "Grow",
    description: "Make data-driven decisions with powerful analytics and insights into your business",
    color: "bg-gradient-to-br from-emerald-500 to-blue-600",
    badge: undefined,
  },
];

const personalSteps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop your bank statements (PDF/CSV) securely - we support all major banks",
    color: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: "Coming Soon",
  },
  {
    icon: Bot,
    title: "AI Analyzes",
    description: "Our AI automatically categorizes transactions and identifies spending patterns instantly",
    color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    badge: "Coming Soon",
  },
  {
    icon: Target,
    title: "Set Goals",
    description: "Create custom budgets and savings targets tailored to your financial objectives",
    color: "bg-gradient-to-br from-violet-500 to-violet-600",
    badge: "Coming Soon",
  },
  {
    icon: Mail,
    title: "Stay Informed",
    description: "Receive monthly automated reports with insights, tips, and personalized recommendations",
    color: "bg-gradient-to-br from-blue-500 to-emerald-600",
    badge: "Coming Soon",
  },
];

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<Tab>("business");

  const steps = activeTab === "business" ? businessSteps : personalSteps;

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-muted to-background">
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
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes with our simple, streamlined process
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex justify-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab("business")}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                activeTab === "business"
                  ? "bg-primary text-primary-foreground shadow-sm"
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              For Personal
            </button>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Connecting line (hidden on mobile) */}
            <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div key={index} className="relative" variants={fadeInUp}>
                  {/* Step number with gradient background */}
                  <div className="flex flex-col items-center text-center group">
                    <div className="relative mb-6">
                      {/* Background glow */}
                      <div className={cn(
                        "absolute inset-0 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity",
                        step.color
                      )} />

                      {/* Icon container */}
                      <div className={cn(
                        "relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
                        step.color
                      )}>
                        <Icon className="w-9 h-9 text-white" />

                        {/* Step number badge */}
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-background text-primary rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-border">
                          {index + 1}
                        </div>

                        {/* Coming soon badge */}
                        {step.badge && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-md">
                            {step.badge}
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow indicator (hidden on mobile and last item) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-16 -right-4 z-10">
                      <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-sm">
                        <svg
                          className="w-4 h-4 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
