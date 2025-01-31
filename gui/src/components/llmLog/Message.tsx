import { AssistantChatMessage, ChatMessage, UserChatMessage } from "core";
import { map } from "lodash";
import { memo } from "react";

export interface MessageProps {
  message: ChatMessage;
}

function renderMessageText(text: string) {
  return <div className="whitespace-pre-wrap">{text}</div>;
}

function renderMessageRole(message: ChatMessage) {
  return (
    <div>
      <span className="bg-[color:var(--vscode-list-inactiveSelectionBackground)] text-xs">
        {message.role}
      </span>
    </div>
  );
}

function renderMessageContent(message: AssistantChatMessage | UserChatMessage) {
  if (typeof message.content == "string") {
    return renderMessageText(message.content);
  } else {
    return message.content.map((part) => {
      if (part.type == "text") {
        return renderMessageText(part.text);
      } else {
        return <div>Image: {part.imageUrl.url}</div>;
      }
    });
  }
}

const Message = memo(function Message({ message }: MessageProps) {
  switch (message.role) {
    case "assistant":
      return (
        <>
          {renderMessageRole(message)}
          {message.toolCalls
            ? message.toolCalls.map((toolCall) => (
                <div>Tool call: {JSON.stringify(toolCall)}</div>
              ))
            : ""}
          {renderMessageContent(message)}
        </>
      );
      break;
    case "user":
      return (
        <>
          {renderMessageRole(message)}
          {renderMessageContent(message)}
        </>
      );
      break;
    case "system":
      return (
        <>
          {renderMessageRole(message)}
          {renderMessageText(message.content)}
        </>
      );
    case "tool":
      return (
        <>
          {renderMessageRole(message)}
          <div>Tool Call ID: {message.toolCallId}</div>
          {renderMessageText(message.content)}
        </>
      );
      break;
  }
});

export default Message;
