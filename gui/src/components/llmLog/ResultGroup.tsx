import { chunk } from "lodash";
import { LLMInteractionItemGroup } from "../../hooks/useLLMLog";
import { memo } from "react";
import Message from "./Message";

interface ResultGroupProps {
  group: LLMInteractionItemGroup;
}

const ResultGroup = memo(function ResultGroup({ group }: ResultGroupProps) {
  if (group.items.length == 0) {
    return <div></div>;
  } else if (
    group.items[0].kind == "message" &&
    group.items[0].message.role != "assistant"
  ) {
    return <Message message={group.items[0].message}></Message>;
  } else {
    return (
      <div className="whitespace-pre-wrap">
        {group.items.map((item) => {
          if (item.kind == "chunk") {
            return <span>{item.chunk}</span>;
          } else if (
            item.kind == "message" &&
            (item.message.role == "user" || item.message.role == "assistant") &&
            typeof item.message.content == "string"
          ) {
            return <span>{item.message.content}</span>;
          } else {
            return <span></span>;
          }
        })}
      </div>
    );
  }
});

export default ResultGroup;
