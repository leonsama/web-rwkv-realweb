import {
  cloneElement,
  lazy,
  ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

export type HeadingLevels = 1 | 2 | 3 | 4 | 5 | 6;

import Markdown, { CustomReactRenderer } from "./marked-react";
import { cn } from "../utils/utils";
import { ReasoningIcon } from "./ChatTextarea";

import { type KatexOptions } from "katex";

const CodeHighlight = lazy(() => import("./CodeHighlight"));
const KatexRender = lazy(() => import("./KatexRender"));

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

function ThinkBlock({ children }: { children: ReactNode }) {
  const [showReasoning, setShowReasoning] = useState(true);
  const [reasonContainerHeight, setReasonContainerHeight] = useState(0);
  const [enableAnimation, setEnableAnimaiton] = useState(false);
  const reasonContentEle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeOberserver = new ResizeObserver(() => {
      setReasonContainerHeight(reasonContentEle.current?.clientHeight || 0);
    });
    if (reasonContentEle.current) {
      resizeOberserver.observe(reasonContentEle.current);
    }
    return () => {
      resizeOberserver.disconnect();
    };
  }, []);
  return (
    <div className="mb-4 rounded-2xl md:mt-3">
      <div className="flex">
        <div
          className="flex w-48 cursor-pointer select-none items-center gap-2 rounded-3xl p-2 pr-2 text-sm font-semibold transition-all duration-200 md:hover:bg-yellow-500/20"
          onClick={() => {
            setEnableAnimaiton(true);
            setShowReasoning(!showReasoning);
          }}
        >
          <ReasoningIcon enableReasoning={true}></ReasoningIcon>{" "}
          {showReasoning ? (
            <span key={0} className="motion-preset-slide-down-md">
              Hide reasoning
            </span>
          ) : (
            <span key={1} className="motion-preset-slide-up-md">
              Show reasoning
            </span>
          )}
          {showReasoning ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="motion-preset-slide-up-md ml-auto size-5"
              key={2}
            >
              <path
                fillRule="evenodd"
                d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="motion-preset-slide-down-md ml-auto size-5"
              key={3}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      <div
        className={cn(
          "ml-[18px] overflow-hidden border-l pl-4 [mask-image:linear-gradient(180deg,#ffff_calc(100%_-_8px),_#0000_100%)]",
          showReasoning ? "" : "opacity-0",
          enableAnimation && "transition-all duration-300",
        )}
        style={{
          height: showReasoning ? `${reasonContainerHeight}px` : `0px`,
        }}
      >
        <div
          ref={reasonContentEle}
          className="-mt-4 text-slate-600 dark:text-zinc-400"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ snippet, lang }: { snippet: string; lang: string }) {
  return (
    <div className="group/code z-20 flex w-full flex-1 flex-col rounded-2xl bg-neutral-100 will-change-scroll dark:bg-neutral-700">
      <div className="flex w-full overflow-auto">
        <Suspense
          fallback={
            <pre className="w-0 flex-1">
              <code className="block overflow-x-auto p-4">{snippet}</code>
            </pre>
          }
        >
          <CodeHighlight snippet={snippet} lang={lang}></CodeHighlight>
        </Suspense>
      </div>
    </div>
  );
}

function InlineKatex({ children }: { children: ReactNode }) {
  return (
    <span>
      <Suspense fallback={<code>{children}</code>}>
        <KatexRender katexOptions={katexOptions}>{children}</KatexRender>
      </Suspense>
    </span>
  );
}
function BlockKatex({ children }: { children: ReactNode }) {
  return (
    <p>
      <Suspense fallback={<code>{children}</code>}>
        <KatexRender katexOptions={katexOptions}>{children}</KatexRender>
      </Suspense>
    </p>
  );
}

const katexOptions: KatexOptions = {
  strict: false,
  throwOnError: false,
  macros: {
    "\\f": "#1f(#2)",
  },
};

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
          "mx-0.5 text-wrap break-words rounded-md bg-stone-200 box-decoration-clone px-0.5 text-stone-800/90 dark:bg-neutral-700 dark:text-stone-300",
          className,
        )}
      >
        {code}
      </code>
    );
  },
  code(snippet: string, lang: string) {
    return (
      <CodeBlock snippet={snippet} lang={lang} key={this.elementId}></CodeBlock>
    );
  },
  inlineKatex(children: ReactNode) {
    return <InlineKatex key={this.elementId}>{children}</InlineKatex>;
  },
  blockKatex(children: ReactNode) {
    return <BlockKatex key={this.elementId}>{children}</BlockKatex>;
  },
  thinkBlock(children: ReactNode) {
    return <ThinkBlock key={this.elementId}>{children}</ThinkBlock>;
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
