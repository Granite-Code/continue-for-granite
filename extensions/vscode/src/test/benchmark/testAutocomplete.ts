import type { IDE } from "core";
import type { ConfigHandler } from "core/config/ConfigHandler";
import * as vscode from "vscode";
import { ContinueCompletionProvider } from "../../autocomplete/completionProvider";
import type { VsCodeWebviewProtocol } from "../../webviewProtocol";

export async function runAutocompleteTest(
  configHandler: ConfigHandler,
  ide: IDE,
  webviewProtocol: VsCodeWebviewProtocol,
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return vscode.window.showErrorMessage("no editor");
  }


  //grab document and choose a random line and character

  const document = editor.document;
  const lineCount = document.lineCount;
  const randomLine = Math.floor(Math.random() * lineCount);
  // const lineText = document.lineAt(randomLine).text;
  // const randomChar = Math.floor(Math.random() * (lineText.length + 1));
  const position = new vscode.Position(randomLine, 0 );
  // console.log("random postion:", position);

  //create inline completion provider
  const provider = new ContinueCompletionProvider(
    configHandler,
    ide,
    webviewProtocol,
  );

  const tokenSource = new vscode.CancellationTokenSource();
  const context: vscode.InlineCompletionContext = {
    triggerKind: vscode.InlineCompletionTriggerKind.Invoke,
    selectedCompletionInfo: undefined,
  };

  //invoke provider at random position
  const items = await provider.provideInlineCompletionItems(
    document,
    position,
    context,
    tokenSource.token,
  );

  console.log("autocomplete items:", items);


}
