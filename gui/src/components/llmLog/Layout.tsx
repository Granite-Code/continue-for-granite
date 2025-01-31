import List from "./List";
import useLLMLog from "../../hooks/useLLMLog";
import { useState } from "react";
import Details from "./Details";

export default function Layout() {
  const llmLog = useLLMLog();

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const interaction = selectedId ? llmLog.get(selectedId) : undefined;

  return (
    <div className="flex h-full w-full">
      <List
        llmLog={llmLog}
        onClickInteraction={(interactionId) => {
          setSelectedId(interactionId);
        }}
      ></List>
      {interaction && (
        <Details key="{selectedId}" interaction={interaction}></Details>
      )}
    </div>
  );
}
