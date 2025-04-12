
import { ColorVariant } from "./color-variants";

interface GradientOverlayProps {
    variant?: ColorVariant;
}

export const GradientOverlay = ({ variant }: GradientOverlayProps) => {
    // For the septenary variant (gray), use a different set of gradients
    if (variant === "septenary") {
        return (
            <div className="absolute inset-0 [mask-image:radial-gradient(90%_60%_at_50%_50%,#000_40%,transparent)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(75,85,99,0.3),transparent_70%)] blur-[120px] animate-pulse-slow" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(156,163,175,0.15),transparent)] blur-[80px] animate-pulse-slower" />
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
