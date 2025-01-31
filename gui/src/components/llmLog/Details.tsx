import useLLMSummary from "../../hooks/useLLMSummary";
import { LLMInteraction } from "../../hooks/useLLMLog";
import ResultGroup from "./ResultGroup";
import Start from "./Start";
import { useEffect, useRef } from "react";
import End from "./End";
import StatusIcon from "./StatusIcon";

export interface DetailsProps {
  interaction: LLMInteraction;
}

export default function Details({ interaction }: DetailsProps) {
  const scrollTop = useRef<HTMLDivElement>(null);
  const lastResult = useRef<any>(null);
  const summary = useLLMSummary(interaction);

  useEffect(() => {
    if (interaction.end) {
      return;
    }

    const last = interaction.result[interaction.result.length - 1];
    if (last != lastResult.current) {
      lastResult.current = last;
      const lastChild = scrollTop.current?.lastChild;
      if (lastChild) {
        (lastChild as HTMLElement).scrollIntoView({
          behavior: "auto",
          block: "end",
        });
      }
    }
  });

  return (
    <div className="m-0 flex min-w-0 flex-1 shrink grow flex-col">
      <div className="shrink-0 text-base">
        <div className="columns-3 border-0 border-b-2 border-solid border-[color:var(--vscode-panel-border)] p-0">
          <div className="border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] text-sm">
            Type: {summary.type}
          </div>
          <div className="border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] text-sm">
            Result: <StatusIcon interaction={interaction}></StatusIcon>
            {summary.result}
          </div>
          <div className="border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] text-sm">
            TotalTime: {summary.totalTime}
          </div>
        </div>
        <div className="columns-3 border-0 border-b-2 border-solid border-[color:var(--vscode-panel-border)] p-0">
          <div className="border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] text-sm">
            Prompt Tokens: {summary.promptTokens}
          </div>
          <div className="border-0 border-r-2 border-solid border-[color:var(--vscode-panel-border)] text-sm">
            Generated Tokens: {summary.generatedTokens}
          </div>
        </div>
      </div>
      <div ref={scrollTop} className="grow overflow-auto">
        {interaction.start ? <Start item={interaction.start}></Start> : ""}
        {interaction.result.map((group, i) => {
          return <ResultGroup key={i} group={group}></ResultGroup>;
        })}
        {interaction.end ? <End item={interaction.end}></End> : ""}
      </div>
    </div>
  );
}
