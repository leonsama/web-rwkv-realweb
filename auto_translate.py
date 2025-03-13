import argparse
import os
import re
from pathlib import Path
import polib
from openai import OpenAI
from tqdm import tqdm


TRANSLATE_PROMPT = """以下待翻译内容中，msgid为原文内容，msgstr为译文内容；观察原文语境，在空的 msgstr 中填入原文为对应语言代码的译文，注意符合语境，不要翻译专有词汇；不要修改任何 msgstr 不为空的内容；将结果放入代码块中，不要解释，不要输出其他无关内容。

语言代码：{lang_code}

待翻译内容：
\"\"\"
{translate_content}
\"\"\"

回答示例：
\"\"\"
```
#: src/targets/webrwkv/components/RecentModelCard.tsx:185
msgid "Online"
msgstr "在线"

#: src/targets/webrwkv/components/RecentModelCard.tsx:290
msgid "Open Model Loader"
msgstr "打开模型加载器"
```
\"\"\""""


def parse_arguments():
    parser = argparse.ArgumentParser(description="Automatically translate .po files.")
    parser.add_argument(
        "-d",
        "--dir",
        dest="locales_dir",
        default="./src/locales/",
        help="`locals` dictionary, default: `./src/locales/`",
    )
    parser.add_argument(
        "--llm-key",
        dest="llm_key",
        default=None,
        help="OpenAI API key, can read from environment variable `OPENAI_API_KEY`",
    )
    parser.add_argument(
        "--llm-base-url",
        dest="llm_base_url",
        default=None,
        help="OpenAI API base_url, can read from environment variable OPENAI_API_BASE_URL",
    )
    parser.add_argument(
        "--llm-model",
        dest="llm_model",
        required=True,
        help="The name of the LLM use for translation",
    )
    parser.add_argument(
        "--only-untranslated",
        dest="only_untranslated",
        action="store_true",
        default=False,
        help="Only request translation for untranslated content, which may reduce context relevance. Defaults to False.",
    )
    return parser.parse_args()


def get_po_files(locales_dir):
    locales_path = Path(locales_dir)
    return [p for p in locales_path.glob("*/messages.po") if p.is_file()]


def process_po_file(
    po_file: Path,
    client: OpenAI,
    model,
    all_new_translations: dict[str, dict[str, list[tuple[str, str]]]],
    only_untranslated: bool = False,
):
    lang_code = po_file.parent.name
    po = polib.pofile(str(po_file))

    entries_to_translate = [e for e in po if not e.msgstr]
    if not entries_to_translate:
        return

    translate_files: set[str] = set()
    for entry in entries_to_translate:
        for file, line in entry.occurrences:
            translate_files.add(file)

    request_blocks: dict[str, set[str]] = {}
    for entry in po:
        for file, _ in entry.occurrences:
            if file in translate_files:
                if file not in request_blocks:
                    request_blocks[file] = set()
                occurrences = "\n".join(
                    [f"#: {file}:{line}" for file, line in entry.occurrences]
                )

                if only_untranslated and entry.msgstr != "":
                    continue

                msgid = polib.escape(entry.msgid)
                request_blocks[file].add(
                    f'{occurrences}\nmsgid "{msgid}"\nmsgstr "{entry.msgstr}"'
                )

    if len(translate_files) == 0:
        print(f"[*] {po_file}: no need to translate")

    resultList: list[tuple[str, str]] = []
    # try:
    with tqdm(
        total=len(request_blocks), desc=f"[*] Translating {lang_code}", unit="req"
    ) as pbar:

        for fileName in request_blocks:
            translateContent = "\n\n".join(request_blocks[fileName])

            prompt = TRANSLATE_PROMPT.format(
                lang_code=lang_code, translate_content=translateContent
            )

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                stream=True,
            )

            response_content = ""
            currentFilename = Path(fileName).name
            with tqdm(
                total=translateContent.count("msgid"),
                desc=currentFilename,
                unit="msg",
                leave=True,
            ) as ibar:
                currentResponseLine = 0
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        response_content += chunk.choices[0].delta.content

                        responseContentLines = response_content.splitlines()
                        if len(responseContentLines) > 2 and responseContentLines[
                            -2
                        ].startswith("msgid"):
                            if currentResponseLine != len(responseContentLines):
                                currentResponseLine = len(responseContentLines)
                                currentMsgid = response_content.splitlines()[-2]
                                currentMsgid = currentMsgid.removeprefix("msgid")

                                ibar.set_description_str(
                                    f"{currentFilename}:{currentMsgid.strip()}"
                                )
                                ibar.update(1)

            code_block = re.search(r"```.*?\n(.*?)```", response_content, re.DOTALL)
            content = code_block.group(1).strip()
            if not code_block:
                print(f"[!] Can not find codeblock:")
                print(content)
                return
            pbar.update(1)
            resultList.append((fileName, code_block.group(1).strip()))
    # except Exception as e:
    #     print(f"\nAPI Failed：{str(e)}")
    #     return

    for fileName, result in resultList:
        translated_po = polib.pofile(result, wrapwidth=0)
        for translated_entry in translated_po:
            original_entry = po.find(translated_entry.msgid)
            if original_entry and not original_entry.msgstr:

                if fileName not in all_new_translations:
                    all_new_translations[fileName] = {}
                if original_entry.msgid not in all_new_translations[fileName]:
                    all_new_translations[fileName][original_entry.msgid] = []

                all_new_translations[fileName][original_entry.msgid].append(
                    (lang_code, translated_entry.msgstr)
                )

                original_entry.msgstr = translated_entry.msgstr

    po.save()


def main():
    args = parse_arguments()

    llm_key = args.llm_key or os.getenv("OPENAI_API_KEY")
    if not llm_key:
        raise ValueError("Can not find `OPENAI_API_KEY`")

    llm_base_url = args.llm_base_url or os.getenv("OPENAI_API_BASE_URL")

    client = OpenAI(api_key=llm_key, base_url=llm_base_url)

    if args.only_untranslated:
        print("[*] only untranslated")

    po_files = get_po_files(args.locales_dir)
    if not po_files:
        print(f"Can not find .po file in `{Path(args.locales_dir)}`")
        return

    all_new_translations: dict[str, dict[str, list[tuple[str, str]]]] = {}
    for po_file in po_files:
        process_po_file(
            po_file,
            client,
            args.llm_model,
            all_new_translations,
            args.only_untranslated,
        )

    if all_new_translations:
        print("\n[*] New Content:\n\n")
        for fileName in all_new_translations:
            print(f"[*] {fileName}\n")
            for originalContent in all_new_translations[fileName]:
                print(originalContent)
                for langCode, result in all_new_translations[fileName][originalContent]:
                    print(f"    {langCode} -> {result}")
                print()
    else:
        print("[*] Nothing changes.")


if __name__ == "__main__":
    main()
