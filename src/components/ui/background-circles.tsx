
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { COLOR_VARIANTS, ColorVariant } from "./background/color-variants";
import { AnimatedGrid } from "./background/animated-grid";
import { AnimatedCircles } from "./background/animated-circles";
import { ContentText } from "./background/content-text";
import { GradientOverlay } from "./background/gradient-overlay";

interface BackgroundCirclesProps {
    title?: string;
    description?: string;
    className?: string;
    variant?: ColorVariant;
}

export function BackgroundCircles({
    title = "Background Circles",
    description = "Optional Description",
    className,
    variant = "octonary",
}: BackgroundCirclesProps) {
    return (
        <div
            className={cn(
                "relative flex h-screen w-full items-center justify-center overflow-hidden",
                "bg-white dark:bg-black/5",
                className
            )}
        >
            <AnimatedGrid />
            <AnimatedCircles variant={variant} />
            <ContentText title={title} description={description} />
            <GradientOverlay />
        </div>
    );
}

export function DemoCircles() {
    const [currentVariant, setCurrentVariant] = useState<ColorVariant>("octonary");

    const variants = Object.keys(COLOR_VARIANTS) as ColorVariant[];

    function getNextVariant() {
        const currentIndex = variants.indexOf(currentVariant);
        const nextVariant = variants[(currentIndex + 1) % variants.length];
        return nextVariant;
    }

    return (
        <>
            <BackgroundCircles variant={currentVariant} />
            <div className="absolute top-12 right-12">
                <Button
                    variant="default"
                    className="bg-slate-950 dark:bg-white text-white dark:text-slate-950"
                    onClick={() => {
                        setCurrentVariant(getNextVariant());
                    }}
                >
                    Change Variant
                </Button>
            </div>
        </>
    );
}
