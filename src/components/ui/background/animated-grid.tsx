
"use client";

import { motion } from "framer-motion";

export const AnimatedGrid = () => (
    <motion.div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_40%,black)]"
        animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
            duration: 40,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
        }}
    >
        <div className="h-full w-full opacity-20 bg-gradient-to-br from-white/5 to-transparent" />
    </motion.div>
);
