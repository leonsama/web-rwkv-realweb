import {
  cloneElement,
  createElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export type HeadingLevels = 1 | 2 | 3 | 4 | 5 | 6;

import Lowlight from "react-lowlight";
import "react-lowlight/common";

import "highlight.js/styles/default.css";
import Markdown, { CustomReactRenderer } from "./marked-react";
import { cn } from "../utils/utils";

function FadeTextInline({
  children,
  className,
  ...prop
}: {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const [onAnimate, setOnAnimate] = useState<boolean>(className ? true : false);
  return onAnimate ? (
    <span
      {...prop}
      className={className}
      onAnimationEnd={() => setOnAnimate(false)}
    >
      {children}
    </span>
  ) : (
    children
  );
}

function FadeText({
  children,
  animate = false,
}: {
  children: string;
  animate?: boolean;
}) {
  const [render, setRender] = useState<React.ReactNode[]>([]);

  const prevPos = useRef(0);
  const prevText = useRef("");
  const textList = useRef<React.ReactElement[]>([]);

  useEffect(() => {
    if (children.length > prevPos.current) {
      textList.current = [
        ...textList.current,
        <FadeTextInline
          key={children.length}
          className={`${
            (animate && "motion-opacity-in-0 motion-duration-1000") || ""
          }`}
        >
          {children.slice(prevPos.current)}
        </FadeTextInline>,
      ];
      prevPos.current = children.length;
      prevText.current = children;
    } else if (children.length < prevPos.current) {
      const shortList = textList.current.filter((v) => {
        return (v as any).key <= children.length;
      });
      if (
        shortList.length > 0 &&
        (shortList[shortList.length - 1] as any).key < children.length
      )
        shortList.push(
          cloneElement(
            textList.current[shortList.length],
            {
              ...textList.current[shortList.length].props,
            },
            children.slice((shortList[shortList.length - 1] as any).key),
          ),
        );
      textList.current = shortList;
      prevPos.current = children.length;
      prevText.current = children;
    }
    setRender(textList.current);
  }, [children]);
  return <>{render}</>;
}

export const RWKVMarkedRenderer: CustomReactRenderer = {
  heading(children: ReactNode, level: HeadingLevels) {
    switch (level) {
      case 1:
        return (
          <h1 className="mb-2 mt-7 text-2xl font-semibold" key={this.elementId}>
            {children}
          </h1>
        );
      case 2:
        return (
          <h2 className="mb-2 mt-7 text-xl font-semibold" key={this.elementId}>
            {children}
          </h2>
        );
      case 3:
        return (
          <h3 className="mb-2 mt-7 text-lg font-semibold" key={this.elementId}>
            {children}
          </h3>
        );
      case 4:
        return (
          <h4 className="mb-2 mt-7 font-semibold" key={this.elementId}>
            {children}
          </h4>
        );
      case 5:
        return (
          <h5 className="mb-2 mt-7 font-semibold" key={this.elementId}>
            {children}
          </h5>
        );
      case 6:
        return (
          <h6 className="mb-2 mt-7 font-semibold" key={this.elementId}>
            {children}
          </h6>
        );
    }
  },
  text(text: string) {
    return (
      <FadeText key={this.elementId} animate={false}>
        {text}
      </FadeText>
    );
  },
  paragraph(children: ReactNode) {
    return (
      <p key={this.elementId} className="my-4 text-base/7">
        {children}
      </p>
    );
  },
  list(children: ReactNode, ordered: boolean, start: number | undefined) {
    return ordered ? (
      <ol
        start={start}
        className="list-inside list-decimal"
        key={this.elementId}
      >
        {children}
      </ol>
    ) : (
      <ul className="list-inside list-disc" key={this.elementId}>
        {children}
      </ul>
    );
  },
  listItem(children: ReactNode[]) {
    return (
      <li className="my-4" key={this.elementId}>
        {children}
      </li>
    );
  },
  hr() {
    return <hr className="border-[1px]" key={this.elementId}></hr>;
  },
  blockquote(children) {
    return (
      <blockquote key={this.elementId} className="border-l-2 pl-3">
        {children}
      </blockquote>
    );
  },
  codespan(code: ReactNode, lang: string | null = null) {
    const className = lang ? `${this.options?.langPrefix}${lang}` : null;
    return (
      <code
        key={this.elementId}
        className={cn(
          "mx-0.5 text-wrap break-words rounded-md bg-stone-200 box-decoration-clone px-0.5 text-stone-800/90",
          className,
        )}
      >
        {code}
      </code>
    );
  },
  code(snippet: string, lang: string) {
    return (
      <div
        className="group/code z-20 flex w-full flex-1 flex-col rounded-2xl bg-neutral-100 will-change-scroll"
        key={this.elementId}
      >
        <div className="flex w-full overflow-auto">
          <Lowlight
            language={Lowlight.hasLanguage(lang) ? lang : "plaintext"}
            value={snippet}
            markers={[]}
            className="w-0 flex-1"
          />
        </div>
      </div>
    );
  },
};

export const RWKVMarkedStreamRenderer = {
  ...RWKVMarkedRenderer,
  text(text: string) {
    return (
      <FadeText key={this.elementId} animate={true}>
        {text}
      </FadeText>
    );
  },
};

export function RWKVMarkdown({
  stream = false,
  ...prop
}: { stream?: boolean } & React.ComponentProps<typeof Markdown>) {
  return (
    <Markdown
      {...{
        isInline: false,
        breaks: true,
        gfm: true,
        baseURL: undefined,
        openLinksInNewTab: true,
        langPrefix: "language-",
        renderer: stream ? RWKVMarkedStreamRenderer : RWKVMarkedRenderer,
        ...prop,
      }}
    >
      {prop.children}
    </Markdown>
  );
}
