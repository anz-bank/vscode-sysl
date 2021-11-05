import path from "path";
import { URI } from "vscode-uri";
import { Webview } from "../web/webview";

/** Returns the static HTML for the renderer. */
export function rendererHtml(webview: Webview, basePath: string): string {
  // Use a nonce to whitelist which scripts can be run
  const nonce = getNonce();

  const base = path.join(basePath, "renderer", "build", "static");
  const scriptUri = webview.asWebviewUri(URI.file(path.join(base, "js", "main.js")));
  const styleMainUri = webview.asWebviewUri(URI.file(path.join(base, "css", "main.css")));

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleMainUri}" rel="stylesheet" />

        <title>Sysl Diagram Editor</title>
    </head>
    <body>
        <div id="root"/>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

/** Returns a random string. */
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
