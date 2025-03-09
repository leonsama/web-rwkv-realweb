import { useEffect } from "react";
import Lowlight from "./react-lowlight/Lowlight";

import "./CodeHighlight.css";

export function CodeHighlight({
  snippet,
  lang,
}: {
  snippet: string;
  lang: string;
}) {

  return (
    <Lowlight
      language={Lowlight.lowlight.registered(lang) ? lang : "plaintext"}
      value={snippet}
      markers={[]}
      className="w-0 flex-1"
    />
  );
}

export { CodeHighlight as default };
