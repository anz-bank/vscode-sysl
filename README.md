# <img width="400px" src="./docs/vscode-logo-text.png"/> + <img width="400px" src="./docs/sysl-logo-text.png"/>

# Sysl extension for Visual Studio Code

Accelerate your Sysl spec development with rich language features and interactive side-by-side diagrams.

![Screenshot of the Sysl extension](./docs/hero-screenshot.png)

## Structure

```
.
├── package.json        # Manifest for the complete extension
├── extension           # VS Code integration points
│   ├── editor          # Custom editor binding for the renderer
│   ├── lsp             # Code relating to the Language Server Protocol
|   │   ├── client      # Implementation of the Sysl language client (calls `sysl lsp`)
|   │   └── server      # Template for building simple LSP servers
│   ├── plugins         # Logic for Sysl extension plugins, binding the client to servers
|   │   ├── erd         # Built-in entity-relationship diagram plugin
|   │   ├── examples    # Example plugin implementations
|   │   └── integration # Built-in integration diagram plugin
│   ├── protocol        # Schema and generated code for legacy plugin protocol
│   ├── syntax          # Configuration for syntax highlighting
│   ├── test            # Tests for the extension
|   │   ├── fixtures    # Source files for testing
|   │   └── ui          # End-to-end UI test cases
│   ├── tools           # Logic for working with external programs (especially Sysl)
│   ├── constants.ts    # Names used by the extension declared in package.json
│   └── main.ts         # Extension entry point
│
└── renderer            # React app to render custom views for the extension
    ├── build           # Build output (the extension loads runtime JS/CSS from here)
    ├── src             # React app source code
    │   ├── components  # Components that comprise the app
    │   │   ├── diagram # GoJS diagram rendering
    │   │   ├── html    # HTML page rendering
    │   │   ├── layout  # Containers of other components
    │   │   ├── views   # Types for the renderer to work with view abstractions
    │   │   └── vscode  # Abstraction of VS Code bindings
    │   ├── index.css   # Root styling
    │   ├── index.ts    # Document root
    │   └── App.tsx     # React app container
    ├── craco.config.js # Additional config for the create-react-app build
    └── package.json    # Manifest for the React app

```

## Features

### Syntax Highlighting

Sysl source syntax highlighting improves the legibility of Sysl specifications.

The Sysl language server provides additional language features, and is implemented in [anz-bank/sysl](https://github.com/anz-bank/sysl/blob/master/cmd/sysllsp/main.go).

### Diagram rendering

Visualize a specification as an interactive diagram in real time.

### Configuration

| Setting                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `sysl.tool.binaryPath` | Path to the Sysl binary to use for Sysl operations. |

### Commands

| Command              | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `sysl.renderDiagram` | Renders the current Sysl spec as an interactive diagram in a custom editor. |

## Requirements

Just [Visual Studio Code](https://code.visualstudio.com/). The extension will fetch any other dependencies it needs (e.g. the Sysl binary).

---

## Development

### Building

- `yarn install`: Installs all JS dependencies.
- `yarn build`: Transpiles TypeScript and creates a production build of both renderer and extension scripts.
- `yarn package` creates a [VSIX bundle](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix) of the complete extension.

To work on the renderer in isolation, run `yarn install` and `yarn start` in the `renderer/` directory.

### Testing

To run the extension manually in an Extension Development Host, press `F5` to invoke the `Run Extension` launch configuration. In the new VS Code window, open a Sysl file (`*.sysl`) to exercise the extension's features

To run automated tests, including end-to-end UI tests, run `yarn test` or launch the `Test Extension` launch configuration.

---

## Release Notes

### 0.21.0

- Collapse links based on label, source and destination.

### 0.19.0

- Introduce new architecture for extension plugins.
  - Plugins are now designed around the [LSP protocol](https://microsoft.github.io/language-server-protocol/). Each plugin can be implemented as an LSP language server, meaning it can provide the full set of text-based language features, as well as drawing diagrams.
  - Both LSP language server plugins and old-style plugins (Sysl transforms and generic binaries) share a common `PluginClient` class. The old-style plugins will likely be deprecated once it is sufficiently straightforward to build LSP servers.
  - Introduce `View` abstraction for non-text display features on the client (e.g. diagrams, HTML pages). The new `MultiView` class aggregates child `View`s under tabs within a single custom editor webview.
- Bump minimum Sysl binary version to v0.465.0.
  - Replace the standalone Sysl LSP with the version built into the new Sysl binary.
  - Accept Sysl source on stdin so `sysl protobuf` and `sysl transform` can work with unsaved specs.

### 0.18.0

- Include `viewId` in diagram change events from the renderer, and pass it through to plugins as change context.

### 0.17.0

- Display Sysl syntax error messages to the user.

### 0.16.0

- Improved link routing to avoid nodes and expanded groups.

### 0.15.0

- Allow plugins to specify maximum lines of text.

### 0.14.0

- Fix horizontal scroll behaviour when diagram is zoomed in.

### 0.13.0

- Fix selection behaviour:
  - Selections made in one tab are deselected when the tab is changed.

### 0.12.0

- View diagram hierarchy in a side panel.

### 0.11.0

- View details of selected diagram elements in a side panel.

### 0.10.0

- Publish diagram selection event to extension.

### 0.9.0

- Display progress indicator when updating the webview.

### 0.8.0

- Update default styles for diagram text.

### 0.7.1

- Add command/button to save a snapshot of the current diagram as an SVG.

### 0.6.0

- Display error messages in the diagram renderer if something goes wrong with rendering.

### 0.5.1

- Fix dependency version.

### 0.5.0

- Add initial version of Sysl Plugin Protocol spec in [`plugin.schema.json`](extension/protocol/plugin.schema.json).
  - A plugin is any program that implements this protocol: receiving requests and sending responses according to the schema.
  - Diagram model changes are published to plugins via the extension, and their responses can render new diagrams.
  - See the [example](extension/protocol) directory for a minimal example of implementing a plugin "server".
  - Multiple plugins can be detected and invoked, and each can return multiple diagrams. Multiple diagrams are selectable via tabs in the renderer.
- Add support for "screenshots" (SVG exports) of diagrams in UI tests (stable comparison and assertion still TODO).
- General refactoring and rendering improvements.

### 0.4.0

- Minor cleanup

### 0.3.0

- Basic side-by-side integration diagram rendering.
- Initial support for plugins to render custom diagrams.
- Cross-platform end-to-end test framework ([follows docs with @vscode/test-electron](https://code.visualstudio.com/api/working-with-extensions/testing-extension)).

### 0.2.2

- Add UI testing
  - A very [explanatory blog post](https://developers.redhat.com/blog/2019/11/18/new-tools-for-automating-end-to-end-tests-for-vs-code-extensions#writing_the_tests)

### 0.2.1

- Fix automatic indentation behavior:
  - Indent the line following a line ending in `:`
  - Never dedent automatically

### 0.2.0

- Clean up repository for new development
  - Remove unused `oldserver`
  - Update and refactor old code, including launch tasks, `package.json`, dependencies, TypeScript code and config
  - Update and fix tests - no real coverage, but there wasn't before either, and they run properly now
  - Add `publish` GitHub workflow to publishes commits to `master`
  - Tidy with `prettier`
  - Switch from `npm` to `yarn`

### 0.1.2

- Stop extension stealing the output window

### 0.1.1

- Fixed incorrect CI/CD configuration

### 0.1.0

- Upgrading vscode-sysl plugin base to current sample version
- Using a golang lsp instead of typescipt for sysl diagnostics

### 0.0.8

- Total rewrite of syntax highlighter

### 0.0.7

- Updated the syntax highlighting

### 0.0.6

- Introduce sysl.Build command
- Fix path issues on windows

### 0.0.5

- onDefinition for view calls
- Updated syntax highlighting rules
- Recognize latest version of sysl grammar
- use sysljs 1.0.3

### 0.0.4

- Recognize latest version of sysl grammar
- use sysljs 1.0.2

### 0.0.3

- Recognize latest version of sysl grammar

### 0.0.2

- Adds gosysl for windows.
- Handles sysl transformation syntax.

### 0.0.1

Initial version.

- Syntax highlighting.
- Syntax errors.
- Go to Definition for Application, Endpoints.
- `go-sysl` binary added for osx users.
