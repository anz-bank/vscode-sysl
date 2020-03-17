# **The** VS Code extension for Sysl

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── oldserver // old Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Features

### Goto Definition

Find definition of a type.

### Syntax Highlighting

Provides syntax colouring for the Sysl Language.

* `package.json` - this is the manifest file in which you declare your language support and define the location of the grammar file that has been copied into your extension.
* `syntaxes/sysl.tmLanguage.json` - this is the Text mate grammar file that is used for tokenization.
* `language-configuration.json` - this is the language configuration, defining the tokens that are used for comments and brackets.

### Commands

#### sysl.SelectRoot

`sysl` tool expects root folder to import other modules. Set root by using this command as Sysl parser requires root to be set.

#### sysl.Build

Builds all the open sysl files and generates output in workspace root's `.sysl-tmp` directory.

## Requirements

npm
ts
vsce

## Usage

### Running the extension

* Run `npm install` in this folder. This installs all necessary npm modules in both the client folder
* Open VS Code on this folder.
* Press Ctrl+Shift+B to compile the client.
* Switch to the Debug viewlet.
* Select `Launch Client` from the drop down.
* Run the launch config.
* If you want to debug the server as well use the launch configuration `Attach to Server`
* In the [Extension Development Host] instance of VSCode, open a sysl document in 'plain text' language mode.
  * Type sysl code for syntax highlighting and diagnostics

### Building the extension

* `npm install`
* `npm run compile`
* `npm run package` creates a vsix extension

## Known Issues

* `sysl.Build` commands are no longer functional
* `sysl.SelectRoot` command WIP for golang implementation
* `Attach to server` no longer works due to upgrading to go server (WIP)
* `Goto definition` WIP for golang implementation

## Release Notes

### 0.1.0

* Upgrading vscode-sysl plugin base to current sample version
* Using a golang lsp instead of typescipt for sysl diagnostics

### 0.0.8

* Total rewrite of syntax highlighter

### 0.0.7

* Updated the syntax highlighting

### 0.0.6

* Introduce sysl.Build command
* Fix path issues on windows

### 0.0.5

* onDefinition for view calls
* Updated syntax highlighting rules
* Recognize latest version of sysl grammar
* use sysljs 1.0.3

### 0.0.4

* Recognize latest version of sysl grammar
* use sysljs 1.0.2

### 0.0.3

* Recognize latest version of sysl grammar

### 0.0.2

* Adds gosysl for windows.
* Handles sysl transformation syntax.

### 0.0.1

Initial version.

* Syntax highlighting.
* Syntax errors.
* Go to Definition for Application, Endpoints.
* `go-sysl` binary added for osx users.
