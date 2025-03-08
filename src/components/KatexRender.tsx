import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.css";

import { ReactNode } from "react";

export function KatexRender({
  children,
  katexOptions,
}: {
  children: ReactNode;
  katexOptions: KatexOptions;
}) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children as string, katexOptions),
      }}
    ></span>
  );
}

export { KatexRender as default };
