import { LLMInteraction } from "../../hooks/useLLMLog";

export interface StatusIconProps {
  interaction: LLMInteraction;
}

export default function StatusIcon({ interaction }: StatusIconProps) {
  if (interaction.end) {
    switch (interaction.end.kind) {
      case "success":
        return (
          <div className="codicon codicon-check text-[color:var(--vscode-charts-green)]"></div>
        );
      case "cancel":
        return (
          <div className="codicon codicon-error text-[color:var(--vscode-list-warningForeground)]"></div>
        );
      case "error":
        return (
          <div className="codicon codicon-stop-circle text-[color:var(--vscode-list-errorForeground)]"></div>
        );
    }
  } else {
    return <div className="codicon codicon-ellipsis"></div>;
  }
}
