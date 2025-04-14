
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
    
    // Special gray variant for voice call - improve visibility
    const isGrayVariant = variant === "septenary";
    
    // Reduce the circle size for a more subtle effect, especially for voice calls
    const circleSize = isGrayVariant ? "h-[400px] w-[400px]" : "h-[240px] w-[240px]";

    return (
        <motion.div className={`absolute ${circleSize}`}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "border-2 bg-gradient-to-br to-transparent",
                        variantStyles.border[i],
                        variant !== "rainbow" ? variantStyles.gradient : "",
                        isGrayVariant ? "border-white/40" : ""
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
                                  scale: [1, 1.01 + i * 0.005, 1],
                                  opacity: [0.6, 0.75, 0.6],
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
                        ease: "easeInOut",
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
                              ? "bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.3),transparent_70%)]"
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
