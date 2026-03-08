import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { Building2, Loader2 } from "lucide-react";

type LoadingProps = {
    message?: string;
};

export const Loading = ({ message }: LoadingProps) => {
    const { resolvedTheme } = useTheme();
    return (
      <div className={cn(
        "fixed inset-0 flex items-center justify-center",
        resolvedTheme === "dark" ? "bg-black" : "bg-white"
      )}>
        <div className="flex flex-col items-center space-y-6">
          <div className={cn(
            "p-6 rounded-lg",
            resolvedTheme === "dark" ? "bg-white/5" : "bg-black/5"
          )}>
            <Building2 className={cn(
              "h-16 w-16",
              resolvedTheme === "dark" ? "text-white/60" : "text-black/60"
            )} />
          </div>
          
          <div className="flex items-center gap-3">
            <Loader2 className={cn(
              "h-5 w-5 animate-spin",
              resolvedTheme === "dark" ? "text-white/60" : "text-black/60"
            )} />
            <p className={cn(
              "text-sm font-light uppercase tracking-[0.2em]",
              resolvedTheme === "dark" ? "text-white/80" : "text-black/80"
            )}>
              {message || "Loading"}
            </p>
          </div>
          
          <p className={cn(
            "text-xs font-light",
            resolvedTheme === "dark" ? "text-white/40" : "text-black/40"
          )}>
            Please wait...
          </p>
        </div>
      </div>
    );
}