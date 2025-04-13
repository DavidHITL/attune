
"use client";

import { motion } from "framer-motion";

export const AnimatedGrid = () => (
    <motion.div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black)]"
        animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
            duration: 40,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
        }}
    >
        {/* Removed the diagonal grid lines */}
        <div className="h-full w-full opacity-20" />
    </motion.div>
);
