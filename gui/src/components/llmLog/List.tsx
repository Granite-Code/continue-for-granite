import { LLMInteractionItem } from "core";
import ListItem from "./ListItem";
import { LLMLog } from "../../hooks/useLLMLog";
import { useEffect, useRef, useState } from "react";

export interface ListProps {
  llmLog: LLMLog;
  onClickInteraction: (interactionId: string) => void;
}

export default function List({ llmLog, onClickInteraction }: ListProps) {
  const topRef = useRef<HTMLUListElement>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const lastSize = useRef(0);

  useEffect(() => {
    if (llmLog.size != lastSize.current) {
      const keys = [...llmLog.keys()];
      setSelectedId(keys[keys.length - 1]);
      onClickInteraction(keys[keys.length - 1]);

      lastSize.current = llmLog.size;
      const lastChild = topRef.current?.lastChild;
      if (lastChild) {
        (lastChild as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }
  });

  return (
    <ul
      tabIndex={1}
      ref={topRef}
      className="group m-0 w-32 flex-none list-none overflow-auto border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] p-0"
    >
      {[...llmLog].map(([id, interaction]) => (
        <ListItem
          key={id}
          interactionId={id}
          interaction={interaction}
          onClickInteraction={(interactionId) => {
            topRef.current?.focus();
            setSelectedId(interactionId);
            onClickInteraction(interactionId);
          }}
          selected={id == selectedId}
        ></ListItem>
      ))}
    </ul>
  );
}
