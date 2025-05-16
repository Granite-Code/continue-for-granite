import type {ConfigHandler} from "core/config/ConfigHandler";
import type {IDE} from "core/index";
import {distance} from "fastest-levenshtein";
import * as vscode from "vscode";
import {ContinueCompletionProvider} from "../../autocomplete/completionProvider";
import type {VsCodeWebviewProtocol} from "../../webviewProtocol";

export interface MaskResult {
  project: string;
  file: string;
  maskIndex: number;
  // start: { line: number; char: number };
  // end: { line: number; char: number };
  maskedChunk: string;
  completion: string | null;
  similarity: number;
}

function cleanString(str: string): string {
  return str.replace(/\\/g, "").replace(/\n/g, ""); //removes newlines, backslashes
}

// generate random ranges within the document
function generateRandomMasks(
  document: vscode.TextDocument,
  count = 10,
  min_mask = 1,
  max_mask = 3,
): vscode.Range[] {
  let m_w = 0.55,
    m_z = 0.55;
  function rnd(): number {
    m_w = (m_w * 1103515245 + 12345) % 4294967296;
    m_z = (m_z * 69069 + 1234567) % 4294967296;
    return ((m_w + m_z) % 4294967296) / 4294967296;
  }
  // pick 10 random masks with ranges between 1-3 lines
  const masks: vscode.Range[] = [];
  const lineCount = document.lineCount;

  for (let i = 0; i < count; i++) {
    const randomLine = Math.floor(rnd() * lineCount);
    const randomChar = Math.floor(
      rnd() * (document.lineAt(randomLine).text.length + 1),
    );
    const start = new vscode.Position(randomLine, randomChar);

    const maskLines = Math.floor(rnd() * (max_mask - min_mask + 1)) + min_mask;
    const endLine = Math.min(lineCount - 1, randomLine + maskLines);
    const endChar = document.lineAt(endLine).text.length;
    const end = new vscode.Position(endLine, endChar);

    masks.push(new vscode.Range(start, end));
  }

  return masks;
}

// run the autocomplete tests for a single document
export async function testAutocomplete(
  document: vscode.TextDocument,
  projectName: string,
  configHandler: ConfigHandler,
  ide: IDE,
  webviewProtocol: VsCodeWebviewProtocol,
): Promise<MaskResult[]> {
  const uri = document.uri.toString();
  const fullText = document.getText();
  const masks = generateRandomMasks(document);

  const results: MaskResult[] = [];

  const channel = vscode.window.createOutputChannel("Autocomplete Test");
  channel.clear();
  channel.show(true);

  const tokenSource = new vscode.CancellationTokenSource();
  const context: vscode.InlineCompletionContext = {
    triggerKind: vscode.InlineCompletionTriggerKind.Invoke,
    selectedCompletionInfo: undefined,
  };

  // iterate each mask, clear old, apply new, run completion, logging
  for (let i = 0; i < masks.length; i++) {
    const provider = new ContinueCompletionProvider(
      configHandler,
      ide,
      webviewProtocol,
    );
    const mask = masks[i];

    // clear previous masks if exists
    ide.removeMaskedRange?.(uri);

    // apply this mask
    ide.addMaskedRange(uri, mask);

    const startOffset = document.offsetAt(mask.start);
    const endOffset = document.offsetAt(mask.end);
    // console.log(`RAW MASK: ${fullText.slice(startOffset, endOffset)} CLEAN MASK: ${cleanString(fullText.slice(startOffset, endOffset))} `)
    const maskedChunk = cleanString(fullText.slice(startOffset, endOffset));

    // logging mask details
    channel.appendLine(`\nMask ${i + 1}`);
    channel.appendLine(
      `start: line ${mask.start.line}, char ${mask.start.character}`,
    );
    channel.appendLine(
      `end: line ${mask.end.line}, char ${mask.end.character}`,
    );
    channel.appendLine(`masked chunk: ${maskedChunk}`);

    // run completion
    const items = await provider.provideInlineCompletionItems(
      document,
      mask.start,
      context,
      tokenSource.token,
    );

    // compute similarity
    let completion: string | null = null;
    let similarity = 0;
    if (items && items.length > 0 && items[0]?.insertText) {
      // console.log(`RAW COMPLETION: ${items[0].insertText} CLEAN COMPLETION: ${cleanString(items[0].insertText)} `)
      completion = cleanString(items[0].insertText);
      channel.appendLine(`autocompletion item: ${completion}`);
      // const dist = distance(maskedChunk, completion);
      // const longerString = Math.max(maskedChunk.length, completion.length);
      // similarityScore = longerString === 0 ? 1 : 1 - dist / longerString;


      const dist = distance(maskedChunk, completion);
      const totalLength = maskedChunk.length + completion.length;
      similarity = totalLength === 0 ? 1 : 1 - dist / totalLength;

      channel.appendLine(`similarity score: ${similarity}`);
    }

    results.push({
      project: projectName,
      file: document.uri.fsPath,
      maskIndex: i,
      // start:      { line: masks[i].start.line, char: masks[i].start.character },
      // end:        { line: masks[i].end.line,   char: masks[i].end.character   },
      maskedChunk,
      completion,
      similarity,
    });
  }

  // cleanup last mask
  ide.removeMaskedRange?.(uri);
  return results;
}
