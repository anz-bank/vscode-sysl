# Sysl extension for Visual Studio Code

Accelerate your Sysl spec development with rich language features and interactive side-by-side diagrams.

## Structure

```
.
├── package.json            # Manifest
├── extension               # VS Code integration points
│   └── src
│       ├── lsp             # Implementation of the LSP client, including server download
│       ├── syntax          # Configuration for syntax highlighting
│       ├── test            # Tests for the extension
│       ├── constants.ts    # Names used by the extension declared in package.json
│       └── main.ts         # Extension entry point
```

## Features

### Goto Definition

Find definition of a type.

### Syntax Highlighting

Sysl source syntax highlighting improves the legibility of Sysl specifications.

The Sysl language server provides additional language features, and is implemented in [anz-bank/sysl](https://github.com/anz-bank/sysl/blob/master/cmd/sysllsp/main.go).

### Commands

#### sysl.tools.installSyslLsp

Initiates a process to install the Sysl Language Server, which provides Sysl language features such as autocompletion.

## Requirements

-   [Visual Studio Code](https://code.visualstudio.com/)
-   `yarn`

## Usage

### Running the extension

-   Run `yarn install` in this folder
-   Press `F5` to invoke the `Run Extension` launch configuration
-   In the `[Extension Development Host]` instance of VS Code, open a Sysl file (`*.sysl`) to exercise the extension's features

### Building the extension

-   `yarn install`
-   `yarn compile`
-   `yarn package` creates a [VSIX bundle](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix)


## Release Notes

### 0.2.0

-   Clean up repository for new development
    -   Remove unused `oldserver`
    -   Update and refactor old code, including launch tasks, `package.json`, dependencies, TypeScript code and config
    -   Update and fix tests - no real coverage, but there wasn't before either, and they run properly now
    -   Add `publish` GitHub workflow to publishes commits to `master`
    -   Tidy with `prettier`
    -   Switch from `npm` to `yarn`

### 0.1.2

-   Stop extension stealing the output window

### 0.1.1

-   Fixed incorrect CI/CD configuration

### 0.1.0

-   Upgrading vscode-sysl plugin base to current sample version
-   Using a golang lsp instead of typescipt for sysl diagnostics

### 0.0.8

-   Total rewrite of syntax highlighter

### 0.0.7

-   Updated the syntax highlighting

### 0.0.6

-   Introduce sysl.Build command
-   Fix path issues on windows

### 0.0.5

-   onDefinition for view calls
-   Updated syntax highlighting rules
-   Recognize latest version of sysl grammar
-   use sysljs 1.0.3

### 0.0.4

-   Recognize latest version of sysl grammar
-   use sysljs 1.0.2

### 0.0.3

-   Recognize latest version of sysl grammar

### 0.0.2

-   Adds gosysl for windows.
-   Handles sysl transformation syntax.

### 0.0.1

Initial version.

-   Syntax highlighting.
-   Syntax errors.
-   Go to Definition for Application, Endpoints.
-   `go-sysl` binary added for osx users.
