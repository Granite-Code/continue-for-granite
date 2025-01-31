import * as vscode from "vscode";

import { getExtensionUri, getNonce } from "./util/vscode";
import { LLMLogger } from "core/llm/logger";

export class ContinueLogWebviewViewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "continue.continueLogView";

  public get isReady(): boolean {
    return !!this.webview;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._webviewView = webviewView;
    this._webview = webviewView.webview;
    webviewView.webview.html = this.getSidebarContent(
      this.extensionContext,
      webviewView,
    );
  }

  private _webview?: vscode.Webview;
  private _webviewView?: vscode.WebviewView;

  get isVisible() {
    return this._webviewView?.visible;
  }

  get webview() {
    return this._webview;
  }

  sendMainUserInput(input: string) {
    this.webview?.postMessage({
      type: "userInput",
      input,
    });
  }

  constructor(
    private readonly windowId: string,
    private readonly extensionContext: vscode.ExtensionContext,
    private readonly llmLogger: LLMLogger,
  ) {
    llmLogger.onLogItem((item) => {
      this._webview?.postMessage(item);
    });
  }

  getSidebarContent(
    context: vscode.ExtensionContext | undefined,
    panel: vscode.WebviewPanel | vscode.WebviewView,
    page: string | undefined = undefined,
  ): string {
    const extensionUri = getExtensionUri();
    let scriptUri: string;
    let styleMainUri: string;

    const inDevelopmentMode =
      context?.extensionMode === vscode.ExtensionMode.Development;
    if (!inDevelopmentMode) {
      scriptUri = panel.webview
        .asWebviewUri(
          vscode.Uri.joinPath(extensionUri, "gui/assets/index-llmLog.js"),
        )
        .toString();
      styleMainUri = panel.webview
        .asWebviewUri(
          vscode.Uri.joinPath(extensionUri, "gui/assets/index-llmLog.css"),
        )
        .toString();
    } else {
      scriptUri = "http://localhost:5173/src/llmLog.tsx";
      styleMainUri = "http://localhost:5173/src/index-llmLog.css";
    }

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "gui"),
        vscode.Uri.joinPath(extensionUri, "assets"),
      ],
      enableCommandUris: true,
      portMapping: [
        {
          webviewPort: 65433,
          extensionHostPort: 65433,
        },
      ],
    };

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script>const vscode = acquireVsCodeApi();</script>
        <link href="http://localhost:5173/node_modules/@vscode/codicons/dist/codicon.css" rel="stylesheet">
        <link href="" rel="stylesheet">

        <title>Continue</title>
      </head>
      <body>
        <div id="root"></div>

        ${
          inDevelopmentMode
            ? `<script type="module">
          import RefreshRuntime from "http://localhost:5173/@react-refresh"
          RefreshRuntime.injectIntoGlobalHook(window)
          window.$RefreshReg$ = () => {}
          window.$RefreshSig$ = () => (type) => type
          window.__vite_plugin_react_preamble_installed__ = true
          </script>`
            : ""
        }
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>

      </body>
    </html>`;
  }
}
