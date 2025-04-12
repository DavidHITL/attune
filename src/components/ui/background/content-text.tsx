
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContentTextProps {
    title: string;
    description: string;
}

export const ContentText = ({ title, description }: ContentTextProps) => {
    return (
        <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            <h1
                className={cn(
                    "text-5xl font-bold tracking-tight md:text-7xl",
                    "bg-gradient-to-b from-slate-950 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent",
                    "drop-shadow-[0_0_32px_rgba(94,234,212,0.4)]"
                )}
            >
                {title}
            </h1>

            <motion.p
                className="mt-6 text-lg md:text-xl dark:text-white text-slate-950"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {description}
            </motion.p>
        </motion.div>
    );
};
