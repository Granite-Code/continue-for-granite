import type { ConfigHandler } from "core/config/ConfigHandler";
import type { IDE } from "core/index";
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

  // grab document and choose a random line and character
  const document = editor.document;
  const lineCount = document.lineCount;
  const randomLine = Math.floor(Math.random() * lineCount);
  const lineText = document.lineAt(randomLine).text;
  const randomChar = Math.floor(Math.random() * (lineText.length + 1));
  const position = new vscode.Position(randomLine, randomChar);
  console.log("random cursor postion: ", position);

  const uriString = document.uri.toString();
  const start = new vscode.Position(randomLine, randomChar);

  // const fullText = document.getText();
  // const startOffset = document.offsetAt(start);
  // const remaining = fullText.length - startOffset;
  // const MIN_MASK = 20;
  // const MAX_MASK = 50;
  // let maskLength =
  //   Math.floor(Math.random() * (MAX_MASK - MIN_MASK + 1)) + MIN_MASK;

  // maskLength = Math.min(maskLength, remaining);
  // console.log("mask length: ", maskLength);

  //calculate the end position from that offset
  // const endOffset = startOffset + maskLength;
  // const end = document.positionAt(endOffset);
  // const maskedChunk = fullText.slice(startOffset, endOffset);
  // console.log("masked chunk of code: ", maskedChunk);

  // ide.addMaskedRange?.(uriString, new vscode.Range(start, end));
  ///////

  //lines to mask (1–3)
  const MAX_LINES = 3;
  const maskLines = Math.floor(Math.random() * MAX_LINES) + 1;
  console.log("number of lines masked", maskLines);

  //calculate the end line
  const endLine = Math.min(document.lineCount - 1, randomLine + maskLines);
  const endChar = document.lineAt(endLine).text.length;

  //build the mask and apply it
  const end = new vscode.Position(endLine, endChar);
  ide.addMaskedRange?.(uriString, new vscode.Range(start, end));

  ////////

  //create inline completion provider
  const provider = new ContinueCompletionProvider(
    configHandler,
    ide,
    webviewProtocol,
  );

  const channel = vscode.window.createOutputChannel("Autocomplete Test");
  channel.clear();
  channel.show(true);

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

  console.log("autocomplete items: ", items);
}
