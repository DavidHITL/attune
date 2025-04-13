
import { ColorVariant } from "./color-variants";

interface GradientOverlayProps {
    variant?: ColorVariant;
}

export const GradientOverlay = ({ variant }: GradientOverlayProps) => {
    // For the septenary variant (voice call), use a different set of gradients with higher opacity
    if (variant === "septenary") {
        return (
            <div className="absolute inset-0 [mask-image:radial-gradient(70%_40%_at_50%_50%,#000_50%,transparent)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.3),transparent_70%)] blur-[120px] animate-pulse-slow" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,220,240,0.2),transparent)] blur-[80px] animate-pulse-slower" />
            </div>
        );
    }
    
    return (
        <div className="absolute inset-0 [mask-image:radial-gradient(90%_60%_at_50%_50%,#000_40%,transparent)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0F766E/30%,transparent_70%)] blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2DD4BF/15%,transparent)] blur-[80px]" />
        </div>
    );
};
