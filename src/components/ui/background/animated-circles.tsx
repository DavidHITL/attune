
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { COLOR_VARIANTS, ColorVariant } from "./color-variants";

interface AnimatedCirclesProps {
    variant: ColorVariant;
}

export const AnimatedCircles = ({ variant }: AnimatedCirclesProps) => {
    const variantStyles = COLOR_VARIANTS[variant];
    
    // Special rainbow animation colors
    const rainbowColors = [
        "from-purple-500/30",
        "from-pink-500/30",
        "from-orange-500/30",
        "from-yellow-500/30",
        "from-green-500/30",
        "from-blue-500/30",
    ];
    
    // Special gray animation for voice call
    const isGrayVariant = variant === "septenary";

    return (
        <motion.div className="absolute h-[240px] w-[240px]">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "border-2 bg-gradient-to-br to-transparent",
                        variantStyles.border[i],
                        variant !== "rainbow" ? variantStyles.gradient : ""
                    )}
                    animate={
                        variant === "rainbow"
                            ? {
                                  rotate: 360,
                                  scale: [1, 1.05 + i * 0.05, 1],
                                  opacity: [0.8, 1, 0.8],
                                  background: rainbowColors.map(color => `linear-gradient(to bottom right, ${color.replace('from-', '').replace('/30', '')} 0%, transparent 70%)`),
                              }
                            : isGrayVariant
                            ? {
                                  scale: [1, 1.05 + i * 0.02, 1],
                                  opacity: [0.3, 0.5, 0.3],
                              }
                            : {
                                  rotate: 360,
                                  scale: [1, 1.05 + i * 0.05, 1],
                                  opacity: [0.8, 1, 0.8],
                              }
                    }
                    transition={{
                        duration: variant === "rainbow" ? 8 : isGrayVariant ? 3 : 5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                        background: variant === "rainbow" ? {
                            duration: 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                            times: rainbowColors.map((_, i) => i / rainbowColors.length),
                        } : undefined
                    }}
                >
                    <div
                        className={cn(
                            "absolute inset-0 rounded-full mix-blend-screen",
                            variant === "rainbow" 
                              ? "bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.3)/10%,transparent_70%)]" 
                              : isGrayVariant
                              ? "bg-[radial-gradient(ellipse_at_center,rgba(107,114,128,0.15),transparent_70%)]"
                              : `bg-[radial-gradient(ellipse_at_center,${variantStyles.gradient.replace(
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
