
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { COLOR_VARIANTS, ColorVariant } from "./color-variants";

interface AnimatedCirclesProps {
    variant: ColorVariant;
}

export const AnimatedCircles = ({ variant }: AnimatedCirclesProps) => {
    const variantStyles = COLOR_VARIANTS[variant];

    return (
        <motion.div className="absolute h-[480px] w-[480px]">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "border-2 bg-gradient-to-br to-transparent",
                        variantStyles.border[i],
                        variantStyles.gradient
                    )}
                    animate={{
                        rotate: 360,
                        scale: [1, 1.05 + i * 0.05, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                >
                    <div
                        className={cn(
                            "absolute inset-0 rounded-full mix-blend-screen",
                            `bg-[radial-gradient(ellipse_at_center,${variantStyles.gradient.replace(
                                "from-",
                                ""
                            )}/10%,transparent_70%)]`
                        )}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
};
