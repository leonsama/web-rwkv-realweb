import { useEffect, useRef, useState } from "react";

import styles from "./PromptTextarea.module.css";

const globalConfig = {
  cover: true,
};

const textContentFilter = [
  {
    re: /\*\[(.*?)\]\*/g,
    replace: `<span class="${styles.promptAction}"><span class=${styles.promptActionLeft}>*[</span>$1<span class=${styles.promptActionRight}>]*</span></span>`,
  },
  {
    re: /\*\((.*?)\)\*/g,
    replace: `<span class="${styles.promptEmotion}"><span class=${styles.promptEmotionLeft}>*[</span>$1<span class=${styles.promptEmotionRight}>]*</span></span>`,
  },
];

interface TextComponent {
  cursorStrategy: (
    indexFrom: number,
    indexTo: number,
    deltaDepth: number,
  ) => number;
  selectionEditStrategy: (
    selectionStart: number,
    selectionEnd: number,
    isCoverd: boolean,
  ) => number;
  re: RegExp;
  generateComponent: () => React.FC;
}

interface TextNode {
  id: string;
  text: string;
  childrenId: string[];
  parentId: string | null;
  component: React.FC;
}

export const PromptTextarea = ({
  value,
  onChange = () => {},
  style = {},
  editable = false,
  placeholder = undefined,
  disabled = false,
  innerRef,
  invisibleScrollbar = false,
  isFocus = false,
  setIsFocus = (status: boolean) => {},
  isKeepFocus,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
  editable: boolean;
  placeholder?: string | undefined;
  disabled?: boolean;
  innerRef?: React.RefObject<HTMLDivElement>;
  invisibleScrollbar?: boolean;
  isFocus?: boolean;
  setIsFocus?: (status: boolean) => void;
  isKeepFocus?: React.MutableRefObject<boolean>;
  className?: string;
}) => {
  const [content, setContent] = useState(value);
  const [config, setConfig] = useState(globalConfig);
  const textareaEle = useRef<HTMLTextAreaElement>(null);

  const render = (value: string) => {
    [
      {
        re: /\n/g,
        replace: "<br>",
      },
      {
        re: /<br>$/,
        replace: "<br><br>",
      },
      ...(config.cover ? textContentFilter : []),
    ].forEach((e) => {
      value = value.replace(e.re, e.replace);
    });
    // value = value.replaceAll("\n", "<br>");
    return value;
  };
  const selectionOperation = (
    labelLeft: string,
    lableRight: string,
    newSubstring?: string,
    selectNewSubstring?: boolean,
  ) => {
    if (
      textareaEle.current!.selectionStart ||
      textareaEle.current!.selectionStart == 0
    ) {
      const startPos = Math.min(
        textareaEle.current!.selectionStart,
        textareaEle.current!.selectionEnd,
      );
      const endPos = Math.max(
        textareaEle.current!.selectionStart,
        textareaEle.current!.selectionEnd,
      );
      setContent((prev) => {
        const newString = `${prev.substring(0, startPos)}${labelLeft}${
          newSubstring || prev.substring(startPos, endPos)
        }${lableRight}${prev.substring(endPos, prev.length)}`;

        setTimeout(() => {
          onChange(newString);
        }, 0);

        return newString;
      });
      setTimeout(() => {
        if (selectNewSubstring)
          textareaEle.current!.selectionStart = startPos + labelLeft.length;
        textareaEle.current!.selectionEnd = newSubstring
          ? startPos + newSubstring.length
          : endPos + labelLeft.length;
        textareaEle.current!.focus();
      }, 0);
    }
  };
  const replaceSelectionString = (newSubstring: string, select: boolean) =>
    selectionOperation("", "", newSubstring, select);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.altKey) && e.key === "Enter") {
      e.stopPropagation();
      replaceSelectionString("\n", false);
    }
  };

  useEffect(() => {
    setContent(value);
  }, [value]);

  useEffect(() => {
    console.log("detect", isFocus);
    if (isFocus) {
      textareaEle.current?.focus();
    }
  }, [isFocus]);

  return (
    <div
      style={style}
      className={`${styles.PromptEditor} ${
        invisibleScrollbar ? styles.invisibleScrollbar : ""
      } ${className || ""}`}
    >
      <div
        className={styles.PromptEditorInner}
        style={{ opacity: disabled ? "0.5" : undefined }}
      >
        {editable === true && (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            disabled={disabled}
            ref={textareaEle}
            onFocus={() => {
              console.log("onfocus");
              setIsFocus(true);
            }}
            onBlur={() => {
              console.log("onblur");
              if (isKeepFocus && isKeepFocus.current === true) {
                textareaEle.current?.focus();
                return;
              }
              setTimeout(() => {
                setContent((prev) => {
                  console.log("call", prev);
                  if (prev === "") setIsFocus(false);
                  return prev;
                });
              }, 300);
            }}
            onKeyDown={handleKeyDown}
          ></textarea>
        )}
        <div
          dangerouslySetInnerHTML={{ __html: render(content) }}
          style={{ wordBreak: editable ? undefined : "break-word" }}
          ref={innerRef}
        ></div>
      </div>
    </div>
  );
};
