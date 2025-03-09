import { cn } from "../utils/utils";

export function Button({
  className,
  ...prop
}: { className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-lg bg-slate-200 px-4 py-2 transition-all hover:bg-slate-300/50 active:scale-90 dark:bg-zinc-700 dark:hover:bg-zinc-500/50",
        className,
      )}
      {...prop}
    ></button>
  );
}
