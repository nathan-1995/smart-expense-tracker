"use client";

import { Check, Rocket, Target } from "lucide-react";
import { motion } from "framer-motion";

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

const roadmapItems = [
  {
    status: "now",
    badge: "Now",
    title: "Core Business Tools",
    icon: Check,
    color: "emerald",
    items: [
      "Invoice creation & management",
      "Client portal & CRM",
      "Expense tracking",
      "Financial reporting dashboard",
    ],
  },
  {
    status: "q2-2025",
    badge: "Q2 2025",
    title: "AI-Powered Analysis",
    icon: Rocket,
    color: "blue",
    items: [
      "Bank statement upload & parsing",
      "AI transaction categorization",
      "Smart budget recommendations",
      "Spending pattern detection",
    ],
  },
  {
    status: "q3-2025",
    badge: "Q3 2025",
    title: "Personal Finance Suite",
    icon: Target,
    color: "gray",
    items: [
      "Savings goals tracker",
      "Monthly automated reports",
      "Custom notification alerts",
      "Financial health score",
    ],
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="py-24 bg-muted">
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
            What's <span className="bg-gradient-to-r from-accent-emerald to-secondary bg-clip-text text-transparent">Coming Next</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We're constantly building new features to help you manage your finances better. Here's what's on our roadmap.
          </p>
        </motion.div>

        {/* Roadmap timeline */}
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid md:grid-cols-3 gap-6 md:gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {roadmapItems.map((item, index) => {
              const Icon = item.icon;
              const isNow = item.status === "now";
              const isQ2 = item.status === "q2-2025";

              return (
                <motion.div key={index} className="relative" variants={fadeInUp}>
                  {/* Card */}
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    isNow
                      ? 'bg-gradient-to-br from-accent-emerald/5 to-accent-emerald/10 border-accent-emerald/30 shadow-accent-emerald/5'
                      : isQ2
                      ? 'bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/30 shadow-secondary/5'
                      : 'bg-gradient-to-br from-muted/50 to-muted border-border/50'
                  }`}>
                    {/* Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-5 ${
                      isNow
                        ? 'bg-accent-emerald text-accent-emerald-foreground shadow-lg shadow-accent-emerald/20'
                        : isQ2
                        ? 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20'
                        : 'bg-muted-foreground/60 text-background'
                    }`}>
                      <Icon className="w-4 h-4" />
                      {item.badge}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-foreground mb-5 tracking-tight">
                      {item.title}
                    </h3>

                    {/* Items list */}
                    <ul className="space-y-3">
                      {item.items.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start gap-3 text-sm text-muted-foreground"
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isNow
                              ? 'bg-accent-emerald/15 text-accent-emerald'
                              : isQ2
                              ? 'bg-secondary/15 text-secondary'
                              : 'bg-muted-foreground/15 text-muted-foreground'
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl ${
                      isNow
                        ? 'bg-gradient-to-r from-accent-emerald/50 via-accent-emerald to-accent-emerald/50'
                        : isQ2
                        ? 'bg-gradient-to-r from-secondary/50 via-secondary to-secondary/50'
                        : 'bg-gradient-to-r from-border/50 via-border to-border/50'
                    }`} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-muted-foreground mb-4">
            Want to influence our roadmap? Join our community and share your ideas.
          </p>
          <a
            href="/register"
            className="h-12 px-8 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-accent-emerald to-accent-emerald/90 hover:from-accent-emerald/90 hover:to-accent-emerald text-accent-emerald-foreground font-semibold shadow-xl shadow-accent-emerald/20 hover:shadow-2xl hover:shadow-accent-emerald/30 hover:scale-105 transition-all duration-200"
          >
            Get Started Today
          </a>
        </motion.div>
      </div>
    </section>
  );
}
