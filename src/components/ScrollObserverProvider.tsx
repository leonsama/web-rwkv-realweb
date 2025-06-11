"use client";
import { Observer } from "tailwindcss-intersect";
import { useEffect } from "react";

export default function ScrollObserverProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    Observer.start();
  }, []);

  return <>{children}</>;
}
