import { useEffect, useRef, useState } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@ui-sdk/react/combobox";

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 50));

/** The row ui-sdk marks as highlighted, read from the DOM. */
function useDomHighlight(root: React.RefObject<HTMLElement | null>) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const read = () =>
      setText(
        root.current?.ownerDocument
          .querySelector("[data-slot=combobox-item][data-highlighted]")
          ?.textContent?.trim() ?? null,
      );
    const observer = new MutationObserver(read);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    read();
    return () => observer.disconnect();
  }, [root]);
  return text;
}

function pressKey(input: HTMLElement | null, key: string) {
  input?.focus();
  input?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

// vercel-labs/ui#802: onHighlight isn't called when the highlighted item leaves the list.
function HighlightLeavesTheList() {
  const [fruits, setFruits] = useState(["apple", "banana", "cherry"]);
  const [mirror, setMirror] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const dom = useDomHighlight(input);

  const removeHighlighted = () => {
    if (mirror) setFruits((list) => list.filter((fruit) => fruit !== mirror));
  };
  const runAutomatically = async () => {
    setFruits(["apple", "banana", "cherry"]);
    setLog([]);
    await nextFrame();
    pressKey(input.current, "ArrowDown");
    await nextFrame();
    setFruits((list) => list.slice(1));
  };

  const stale = mirror !== null && dom === null;
  return (
    <section>
      <h2>1. onHighlight after the highlighted item unmounts (#802)</h2>
      <ol>
        <li>Click in the input and press ArrowDown: “apple” is highlighted.</li>
        <li>Click “Remove the highlighted item”.</li>
        <li>No row is highlighted any more, but onHighlight was not called with null.</li>
      </ol>
      <div className="row">
        <button onClick={removeHighlighted}>Remove the highlighted item</button>
        <button onClick={runAutomatically}>Run steps automatically</button>
        <button onClick={() => setFruits(["apple", "banana", "cherry"])}>Reset items</button>
      </div>
      {/* Kept open, list inline, so the buttons and the result stay visible. */}
      <Combobox
        open
        onHighlight={(value) => {
          setMirror(value);
          setLog((lines) => [...lines, `onHighlight(${JSON.stringify(value)})`]);
        }}
      >
        <ComboboxInput ref={input} placeholder="Fruit" />
        <ComboboxList>
            {fruits.map((fruit) => (
              <ComboboxItem key={fruit} value={fruit}>
                {fruit}
              </ComboboxItem>
            ))}
        </ComboboxList>
      </Combobox>
      <p>
        Last onHighlight value: <b>{JSON.stringify(mirror)}</b> · highlighted row in the DOM:{" "}
        <b>{JSON.stringify(dom)}</b>
      </p>
      <p className={`verdict ${stale ? "bad" : "good"}`}>
        {stale
          ? "Out of sync: the DOM has no highlight, onHighlight still says " + JSON.stringify(mirror)
          : "In sync"}
      </p>
      <div className="log">{log.join("\n") || "onHighlight calls appear here"}</div>
    </section>
  );
}

// vercel-labs/ui#803: no way to set the highlighted item from code.
const TREE: Record<string, string[]> = {
  Fruit: ["apple", "banana"],
  Vegetables: ["beet", "kale"],
};

function CascadingList() {
  const [branch, setBranch] = useState<string | null>(null);
  const [mirror, setMirror] = useState<string | null>(null);
  const [workaround, setWorkaround] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dom = useDomHighlight(input);
  const items = branch ? TREE[branch] : Object.keys(TREE);

  const afterSwap = async (target: string | null) => {
    if (!workaround) return;
    // The only option today: replay arrow keys until the wanted row is highlighted.
    await nextFrame();
    const rows = target === null ? 1 : Object.keys(TREE).indexOf(target) + 1;
    for (let i = 0; i < rows; i++) pressKey(input.current, "ArrowDown");
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" && !branch && mirror && TREE[mirror]) {
      event.preventDefault();
      setBranch(mirror);
      void afterSwap(null); // wanted: highlight the first child
    }
    if (event.key === "ArrowLeft" && branch) {
      event.preventDefault();
      const from = branch;
      setBranch(null);
      void afterSwap(from); // wanted: highlight the branch we came from
    }
  };

  return (
    <section>
      <h2>2. Setting the highlight after the items change (#803)</h2>
      <ol>
        <li>Click in the input, ArrowDown to “Vegetables”, then ArrowRight: the list shows its children.</li>
        <li>Wanted: “beet” highlighted. Actual: nothing is, and there is no API to set it.</li>
        <li>ArrowLeft goes back. Wanted: “Vegetables” highlighted again.</li>
        <li>Tick the workaround to see the synthetic-ArrowDown hack this needs today.</li>
      </ol>
      <label className="row">
        <input type="checkbox" checked={workaround} onChange={(e) => setWorkaround(e.target.checked)} />
        Workaround: dispatch ArrowDown keydown events after each swap
      </label>
      <Combobox open filter={false} onHighlight={(value) => setMirror(value)}>
        <ComboboxInput ref={input} placeholder={branch ? `${branch} ›` : "Category"} onKeyDown={onKeyDown} />
        <ComboboxList>
            {items.map((item) => (
              <ComboboxItem key={item} value={item}>
                {item}
                {!branch ? " ›" : ""}
              </ComboboxItem>
            ))}
        </ComboboxList>
      </Combobox>
      <p>
        Level: <b>{branch ?? "root"}</b> · highlighted row in the DOM: <b>{JSON.stringify(dom)}</b>
      </p>
    </section>
  );
}

export function App() {
  return (
    <>
      <h1 style={{ fontSize: 20 }}>ui-sdk 0.1.0-beta.7 · Combobox highlight</h1>
      <HighlightLeavesTheList />
      <CascadingList />
    </>
  );
}
