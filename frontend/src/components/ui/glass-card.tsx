import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

export function GlassCard({ children, className, gradient = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card",
        gradient && "bg-gradient-to-br from-card to-card/50",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
