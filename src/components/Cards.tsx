import React, { Children, isValidElement } from "react";
import { cn } from "../utils/utils";

export function Card({
  children,
  title,
  icon,
  className,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex select-none flex-col rounded-3xl bg-slate-100",
        className,
      )}
    >
      {(() => {
        const CardTitles = Children.map(children, (child, k) => {
          if (
            isValidElement(child) &&
            (typeof child.type === "function"
              ? child.type.name
              : child.type) === CardTitle.name
          ) {
            return child;
          }
        });
        return CardTitles!.length > 0 ? (
          CardTitles
        ) : (
          <div className="top-0 flex select-none items-center gap-4 rounded-3xl p-4">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                {icon}
              </div>
            )}
            {title && (
              <div className="flex flex-1 items-center gap-4 text-lg">
                {title}
              </div>
            )}
          </div>
        );
      })()}
      <div className={cn("flex flex-1 flex-col gap-4 px-4 pb-6")}>
        {Children.map(children, (child, k) => {
          if (
            isValidElement(child) &&
            (typeof child.type === "function"
              ? child.type.name
              : child.type) === CardTitle.name
          ) {
            return null;
          }
          return child;
        })}
      </div>
    </div>
  );
}

export function CardTitle({
  children,
  className,
  icon,
  ...prop
}: {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...prop}
      className={cn(
        "sticky top-0 flex select-none items-center gap-4 rounded-3xl bg-slate-100 p-4",
        className,
      )}
    >
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
          {icon}
        </div>
      )}
      {children && (
        <div className="flex flex-1 items-center gap-4 text-lg">{children}</div>
      )}
    </div>
  );
}

export function Entry({
  children,
  className,
  label,
}: {
  children?: React.ReactNode;
  className?: string;
  label?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-10 flex-col justify-end gap-2 px-2 md:flex-row md:items-center",
        className,
      )}
    >
      {label && (
        <div className="flex-1 select-none text-slate-500">{label}</div>
      )}
      {children}
    </div>
  );
}
