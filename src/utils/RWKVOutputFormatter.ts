export function RWKVOutputFormatter(input: string): string {
  const codeBlocks: string[] = [];
  const codeBlockRegex = /```[\s\S]*?(```|$)/g;

  const processedInput = input.replace(codeBlockRegex, (match) => {
    const isClosed = match.endsWith("```");
    const sanitized = isClosed ? match : match + "\n```";
    codeBlocks.push(sanitized);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  let lines = processedInput.split("\n");
  lines = insertEmptyLinesBetweenBlocks(lines);

  let result = lines.join("\n");
  codeBlocks.forEach((code, index) => {
    const originalCode =
      code.endsWith("\n```") && !input.includes(code)
        ? code.slice(0, -4)
        : code;
    result = result.replace(`__CODE_BLOCK_${index}__`, originalCode);
  });

  return result;
}

function insertEmptyLinesBetweenBlocks(lines: string[]): string[] {
  let previousBlockType: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const currentType = getBlockType(line);

    if (currentType === "empty") {
      i++;
      continue;
    }

    if (
      previousBlockType !== null &&
      (currentType !== previousBlockType || currentType === "paragraph")
    ) {
      if (i > 0 && getBlockType(lines[i - 1]) !== "empty") {
        lines.splice(i, 0, "");
        i++;
      }
    }

    if (currentType !== "empty") {
      previousBlockType = currentType;
    }
    i++;
  }

  return lines;
}

function getBlockType(line: string): string {
  const trimmed = line.trim();
  if (trimmed === "") return "empty";
  if (/^#{1,6}\s/.test(trimmed)) return "heading";
  if (/^\d+\.\s/.test(trimmed)) return "list";
  if (/^[-*+]\s/.test(trimmed)) return "list";
  if (/^>/.test(trimmed)) return "blockquote";
  // if (/^\|/.test(trimmed) && /\|$/.test(trimmed)) return "table";
  if (/^\|/.test(trimmed)) return "table";
  if (trimmed.startsWith("```")) return "code";
  return "paragraph";
}
