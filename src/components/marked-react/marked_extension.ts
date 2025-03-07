import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.css";
import { MarkedExtension, TokenizerAndRendererExtension } from "marked";
import React, { createElement } from "react";

export default function (options: KatexOptions = {}): MarkedExtension {
  return {
    extensions: [inlineKatex(options), blockKatex(options), thinkBlock()],
  };
}

function inlineKatex(options: KatexOptions): TokenizerAndRendererExtension {
  return {
    name: "inlineKatex",
    level: "inline",
    start(src: string) {
      const dollarIndex = src.indexOf("$");
      const bracketIndex = src.indexOf("\\[");
      return Math.min(
        dollarIndex === -1 ? Infinity : dollarIndex,
        bracketIndex === -1 ? Infinity : bracketIndex,
      );
    },
    tokenizer(src: string, _tokens) {
      // const dollarMatch = src.match(/^\$+((?:[^$]|(?<!\\)\$)*?)(?:\$+|$)/);
      const dollarMatch = src.match(/^\$+((?:[^$]|(?<!\\)\$)*?)(?:\$+|$)/);

      if (dollarMatch) {
        return {
          type: "inlineKatex",
          raw: dollarMatch[0],
          text: dollarMatch[1].trim(),
        };
      }

      // const bracketMatch = src.match(/\\\[([\s\S]*?)\\\]/);
      const bracketMatch = src.match(/\\\[((?:[^\\]|\\[^\]])*?)(?:\\\]|$)/);

      if (bracketMatch) {
        return {
          type: "inlineKatex",
          raw: bracketMatch[0],
          text: bracketMatch[1].trim(),
        };
      }
    },
  };
}

function blockKatex(options: KatexOptions): TokenizerAndRendererExtension {
  return {
    name: "blockKatex",
    level: "block",
    start(src: string) {
      return src.indexOf("$$");
    },
    tokenizer(src: string, _tokens) {
      const match = src.match(/^\$\$+\n([^$]+?)\n\$\$/);
      if (match) {
        return {
          type: "blockKatex",
          raw: match[0],
          text: match[1].trim(),
        };
      }
    },
  };
}

function thinkBlock(): TokenizerAndRendererExtension {
  return {
    name: "thinkBlock",
    level: "block",
    start(src: string) {
      return src.indexOf("<think>");
    },
    tokenizer(src: string, _tokens) {
      const thinkBlockMatch = src.match(/<think>([\s\S]*?)(<\/think>|$)/);
      if (thinkBlockMatch) {
        const tokens = {
          type: "thinkBlock",
          raw: thinkBlockMatch[0],
          text: thinkBlockMatch[1].trim(),
          tokens: [],
        };
        this.lexer.blockTokens(tokens.text, tokens.tokens);
        return tokens;
      }
    },
  };
}
