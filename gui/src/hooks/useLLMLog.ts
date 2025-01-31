import { useEffect, useReducer } from "react";
import {
  AssistantChatMessage,
  LLMInteractionCancel,
  LLMInteractionChunk,
  LLMInteractionError,
  LLMInteractionItem,
  LLMInteractionMessage,
  LLMInteractionStartChat,
  LLMInteractionStartComplete,
  LLMInteractionStartFim,
  LLMInteractionSuccess,
  UserChatMessage,
} from "core";
import { last } from "lodash";
import { isTerminalCodeBlock } from "../components/markdown/utils";

export interface LLMInteractionItemGroup {
  items: LLMInteractionItem[];
}

export interface LLMInteraction {
  start?:
    | LLMInteractionStartChat
    | LLMInteractionStartComplete
    | LLMInteractionStartFim;
  result: LLMInteractionItemGroup[];
  end?: LLMInteractionSuccess | LLMInteractionError | LLMInteractionCancel;
}

export type LLMLog = Map<string, LLMInteraction>;

function* splitString(
  str: string,
): Generator<[string, boolean], void, unknown> {
  const parts = str.split("\n");
  for (let i = 0; i < parts.length - 1; i++) {
    yield [parts[i] + "\n", true];
  }

  const remaining = parts[parts.length - 1];
  if (remaining != "") {
    yield [parts[parts.length - 1], false];
  }
}

function* splitAssistantMessage(
  item: LLMInteractionMessage,
  message: AssistantChatMessage,
): Generator<[LLMInteractionMessage, boolean], void, unknown> {
  if (message.toolCalls != undefined) {
    yield [item, true];
  } else if (typeof item.message.content === "string") {
    if (item.message.content.indexOf("\n") == -1) {
      yield [item, false];
    } else {
      for (const [s, endsPara] of splitString(item.message.content)) {
        yield [
          {
            ...item,
            message: {
              ...message,
              content: s,
            },
          },
          endsPara,
        ];
      }
    }
  } else {
    const parts = item.message.content;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      if (part.type == "imageUrl") {
        yield [
          {
            ...item,
            message: {
              ...message,
              content: [part],
            },
          },
          true,
        ];
      } else {
        let lastSplitItem: LLMInteractionMessage | undefined;
        let lastEndsPara: boolean = false;
        for (const [s, endsPara] of splitString(part.text)) {
          if (lastSplitItem !== undefined) {
            yield [lastSplitItem, lastEndsPara];
          }
          lastSplitItem = {
            ...item,
            message: {
              ...message,
              content: s,
            },
          };
          lastEndsPara = endsPara;
        }
        if (lastSplitItem !== undefined) {
          if (nextPart && nextPart.type != "text") {
            yield [lastSplitItem, true];
          } else {
            yield [lastSplitItem, lastEndsPara];
          }
        }
      }
    }
  }
}

function* splitItem(
  item: LLMInteractionChunk | LLMInteractionMessage,
): Generator<
  [LLMInteractionMessage | LLMInteractionChunk, boolean],
  void,
  unknown
> {
  switch (item.kind) {
    case "chunk":
      if (item.chunk.indexOf("\n") == -1) {
        yield [item, false];
      } else {
        for (const [s, endsPara] of splitString(item.chunk)) {
          yield [
            {
              ...item,
              chunk: s,
            },
            endsPara,
          ];
        }
      }
      break;
    case "message":
      switch (item.message.role) {
        case "user":
        case "system":
        case "tool":
          yield [item, true];
          break;
        case "assistant":
          yield* splitAssistantMessage(item, item.message);
          break;
      }
  }
}

function appendToInteractionResult(
  interaction: LLMInteraction,
  item: LLMInteractionChunk | LLMInteractionMessage,
) {
  let group = interaction.result[interaction.result.length - 1];
  if (group === undefined) {
    group = { items: [] };
    interaction.result = [...interaction.result, group];
  } else {
    group = { items: [...group.items] };
    interaction.result = interaction.result.slice(0, -1);
    interaction.result.push(group);
  }

  for (const [split, endsPara] of splitItem(item)) {
    group.items.push(split);
    if (endsPara) {
      group = { items: [] };
      interaction.result = [...interaction.result, group];
    }
  }
}

export default function useLLMLog() {
  const [llmLog, dispatchLlmLog] = useReducer(
    (llmLog: LLMLog, item: LLMInteractionItem) => {
      const newLog = new Map([...llmLog]);

      const oldInteraction = newLog.get(item.interactionId);
      let newInteraction;
      if (oldInteraction === undefined) {
        newInteraction = { result: [] };
      } else {
        newInteraction = { ...oldInteraction };
      }
      newLog.set(item.interactionId, newInteraction);

      switch (item.kind) {
        case "startChat":
        case "startComplete":
        case "startFim":
          newInteraction.start = item;
          break;
        case "chunk":
        case "message":
          appendToInteractionResult(newInteraction, item);
          break;
        case "success":
        case "error":
        case "cancel":
          newInteraction.end = item;
      }

      return newLog;
    },
    new Map(),
  );

  useEffect(function () {
    const onMessage = (event: MessageEvent) => {
      dispatchLlmLog(event.data);
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return llmLog;
}
