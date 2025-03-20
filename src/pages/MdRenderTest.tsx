import { useRef, useState } from "react";
import { PromptTextarea } from "../components/PromptTextarea";
import { Button } from "../components/Button";
import { RWKVMarkdown } from "../components/MarkdownRender";
import { RWKVOutputFormatter } from "../utils/RWKVOutputFormatter";
import { createModalForm } from "../components/popup/Modals";
import { InputList } from "../components/Input";
import { Timer } from "../utils/utils";

const DEFAULT_MD_CONTENT = `# Web RWKV Markdown render test
## inline
inline \`code\` inline strong **strong**
## list
- a1 \`b1\` c1 **d1**
- a2 \`b2\` c2 **d2**
- a3 \`b3\` c3 **d3**
## code
\`\`\`python
def xxx(sdwds):
    asdfghjklasdfghjklasdfghjkl.asdwdsa()
    asdfghjklasdfghjklasdfghjkl.asdwdsa()
xxx(xxasd)
\`\`\`
## table
| h1 | h2 | h3 |
| -- | -- | -- |
| r1c1 | r1c2 | r1c3 |
| r2c1 | r2c2 | r2c3 |

| h1 | h2   | h3       |
| ---- | ------ | ---------- |
| 1    | 1-*2*  | 1-_3_      |
| 2    | 2-**2**  | 2-__3__      |
| 3    | 3-***2***  | 3-___3___      |
## blockquote
> q1
> > q2
> + l1
> + l2 \`code\` 
## katex
inline $f(x)=x+y$
$$
% \\f is defined as #1f(#2) using the macro
\\f\\relax{x} = \\int_{-\\infty}^\\infty
    \\f\\hat\\xi\\,e^{2 \\pi i \\xi x}
    \\,d\\xi
$$
`;

export default function Test() {
  const [value, setValue] = useState(DEFAULT_MD_CONTENT);
  const [render, setRender] = useState("");

  const pause = useRef(false);

  const timmer = useRef<Timer>();

  const [typeDelay, setTypeDelay] = useState<string | number>(100);
  const [typeLen, setTypeLen] = useState<string | number>(1);

  const trigger = () => {
    clearInterval(timmer.current);
    const renderString = value;
    let renderIndex = 0;
    setRender("");
    timmer.current = setTimeout(() => {
      clearTimeout(timmer.current);
      timmer.current = setInterval(() => {
        if (pause.current) return;

        setRender(renderString.slice(0, renderIndex));

        if (renderIndex > renderString.length) {
          clearInterval(timmer.current);
          timmer.current = undefined;
          return;
        }

        renderIndex += typeLen as number;
      }, typeDelay as number);
    }, 100);
  };

  const openModal = async () => {
    console.log("open modal");
    const form = createModalForm<{ name: string }>(
      ({ close }) => (
        <div>
          <input name="name" />
          <button type="submit">Submit</button>
        </div>
      ),
      {
        // closeOnBackgroundClick: true,
      },
    );
    const formData = await form.open().catch((err) => {
      console.error(err);
      return null;
    });
    console.log(formData);
  };

  const [testList, setTestList] = useState<string[]>([]);

  return (
    <div className="flex h-full w-full flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-4 pb-24 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex w-full max-w-screen-md flex-col gap-8 px-2 motion-translate-y-in-[20%] motion-opacity-in-[0%] motion-duration-[0.4s]">
          <div className="h-80 rounded-lg border">
            <PromptTextarea
              value={value}
              editable={true}
              onChange={setValue}
              style={{ height: "100%" }}
            ></PromptTextarea>
            <div>
              <Button
                onClick={() => {
                  if (timmer.current === undefined) {
                    trigger();
                  } else {
                    pause.current = !pause.current;
                  }
                }}
              >
                Pause/Start
              </Button>
              <Button
                onClick={() => {
                  clearInterval(timmer.current);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // setRender("");
                  setTimeout(() => {
                    setRender(value);
                  }, 0);
                }}
              >
                Set
              </Button>
              <span>Type Delay</span>
              <input
                onChange={(e) => {
                  setTypeDelay(
                    !Number.isNaN(parseInt(e.target.value))
                      ? parseInt(e.target.value)
                      : e.target.value,
                  );
                }}
                value={typeDelay}
                className="rounded-lg border"
              ></input>
              <span>Type Amount</span>
              <input
                onChange={(e) => {
                  setTypeLen(
                    !Number.isNaN(parseInt(e.target.value))
                      ? parseInt(e.target.value)
                      : e.target.value,
                  );
                }}
                value={typeLen}
                className="rounded-lg border"
              ></input>
              <Button onClick={openModal}>Open Modal</Button>
              <InputList
                value={testList}
                onChange={(v) => setTestList(v)}
              ></InputList>
            </div>
            <div className="h-80 select-text overflow-auto rounded-lg border border-slate-600">
              <RWKVMarkdown>
                {(() => {
                  const mdText = RWKVOutputFormatter(render);
                  console.log(mdText);
                  return mdText;
                })()}
              </RWKVMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
