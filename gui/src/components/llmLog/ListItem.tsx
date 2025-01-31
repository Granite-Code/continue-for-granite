import { LLMInteractionItem } from "core";
import useLLMSummary from "../../hooks/useLLMSummary";
import { LLMInteraction } from "../../hooks/useLLMLog";
import StatusIcon from "./StatusIcon";

export interface ListItemProps {
  interactionId: string;
  interaction: LLMInteraction;
  selected: boolean;
  onClickInteraction: (interactionId: string) => void;
}

export default function ListItem({
  interactionId,
  interaction,
  onClickInteraction,
  selected,
}: ListItemProps) {
  const summary = useLLMSummary(interaction);

  return (
    <li
      className={
        "mt-1 p-0.5 " +
        (selected
          ? "bg-[color:var(--vscode-list-inactiveSelectionBackground)]" +
            " text-[color:var(--vscode-list-inctiveSelectionForeground)]" +
            " group-focus-within:bg-[color:var(--vscode-list-activeSelectionBackground)]" +
            " group-focus-within:text-[color:var(--vscode-list-activeSelectionForeground)]"
          : "")
      }
      key={interactionId}
      onClick={() => onClickInteraction(interactionId)}
    >
      <StatusIcon interaction={interaction}></StatusIcon> {interactionId} -{" "}
      {summary.type}
    </li>
  );
}
