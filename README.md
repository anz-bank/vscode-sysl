# vscode-sysl

[![Build Status](https://travis-ci.org/anz-bank/vscode-sysl.svg?branch=master)](https://travis-ci.org/anz-bank/vscode-sysl)

**The** VS Code extension for Sysl.

## Features

### Goto Definition

Find definition of a type.

### Syntax Highlighting

Provides syntax colouring for the Sysl Language.

### Commands

#### sysl.SelectRoot

`sysl` tool expects root folder to import other modules. Set root by using this command as Sysl parser requires root to be set.

#### sysl.Build

Builds all the open sysl files and generates output in workspace root's `.sysl-tmp` directory.

## Requirements

## Known Issues
- `sysl.Build` command builds all the currently open `.sysl` files.

## Release Notes

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
