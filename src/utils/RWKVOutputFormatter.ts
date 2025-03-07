export function RWKVOutputFormatter(input: string): string {
  const protectBlockMap: { [key: string]: string[] } = {};
  const blockDefinitions: Array<{ regex: RegExp; suffix: string }> = [
    { regex: /```[\s\S]*?(```|$)/g, suffix: "\n```" },
    { regex: /\$\$[\s\S]*?(\$\$|$)/g, suffix: "\n$$" },
    { regex: /\\\[[\s\S]*?(\\\]|$)/g, suffix: "\n\\]" },
  ];
  let processedInput = input;

  processedInput = protectBlocks(
    processedInput,
    protectBlockMap,
    blockDefinitions,
  );

  let lines = processedInput.split("\n");
  lines = insertEmptyLinesBetweenBlocks(lines);

  processedInput = lines.join("\n");
  processedInput = restoreBlocks(
    processedInput,
    input,
    protectBlockMap,
    blockDefinitions,
  );

  return processedInput;
}

function protectBlocks(
  input: string,
  blocks: { [key: string]: string[] },
  blockDefinitions: Array<{ regex: RegExp; suffix: string }>,
): string {
  let processedInput = input;

  blockDefinitions.forEach((blockDef, defIndex) => {
    const { regex, suffix } = blockDef;
    const currentBlocks: string[] = [];
    const blockPlaceholderPrefix = `__BLOCK_${defIndex}_`; // 为每种类型的块使用不同的前缀
    blocks[blockPlaceholderPrefix] = currentBlocks; // 初始化块存储

    processedInput = processedInput.replace(regex, (match) => {
      const isClosed = suffix ? match.endsWith(suffix) : true; // 如果有后缀，检查是否闭合
      const sanitized = isClosed ? match : match + suffix;
      currentBlocks.push(sanitized);
      return `${blockPlaceholderPrefix}${currentBlocks.length - 1}__`;
    });
  });
  return processedInput;
}

export function restoreBlocks(
  input: string,
  originalInput: string,
  blocks: { [key: string]: string[] },
  blockDefinitions: Array<{ regex: RegExp; suffix: string }>,
) {
  let processedInput = input;

  blockDefinitions.forEach((blockDef, defIndex) => {
    const { suffix } = blockDef;
    const blockPlaceholderPrefix = `__BLOCK_${defIndex}_`;
    const currentBlocks: string[] = blocks[blockPlaceholderPrefix];

    currentBlocks.forEach((value, index) => {
      const originalBlock =
        value.endsWith(suffix) && !originalInput.includes(value)
          ? value.slice(0, -1 * suffix.length)
          : value;
      processedInput = processedInput.replace(
        `${blockPlaceholderPrefix}${index}__`,
        originalBlock.replace(/\$/g, "$$$$"),
      );
    });
  });

  return processedInput;
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
