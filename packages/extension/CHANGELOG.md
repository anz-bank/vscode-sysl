# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.55.0] - 2022-12-01

### Changed

- Fixed publishing of extension
- Tidied repo contents, moved this `CHANGELOG` out of the `README`

## [0.53.0]

- Activate the extension more aggressively (if the workspace has any Sysl specs).
- Add new configuration settings to toggle Sysl binary autoupdating and network plugin fetching.
- Add new command to import a Sysl spec from the current file (or its directory in some cases).
- Notify plugins of user events in a broader range of file types (including all possible import sources and `plaintext`).
- Use Yarn workspaces and Lerna to better modularise the extension, renderer, and model and plugin libs.
- Register a command `action:<action.id>` for each registered action to allow plugins to simular action invocations.
- Add support for plugins to provide (and resolve) CodeLenses.
- Add NPM publish job for the renderer (`@anz-bank/vscode-sysl-renderer`).
- Improve resilience against plugins errors.
- Update deps, refactor, and tidy.

## [0.52.0]

- Add renderer support for "table" views based on [opentable](https://github.com/swsvindland/opentable), an OSS fork of [Handsontable](https://handsontable.com/).
- Send view models to LSP plugins on open.
- Exclude `~ignore` tagged elements from integration diagram.
- Use `LayeredDigraphLayout` for integration and ERD diagrams.

## [0.50.0]

- Show progress notification while fetching network plugins, and error message for plugins that fail to start.
- Replace Mocha with Jest for unit testing the extension; use mocked VS Code APIs.
- Filter local plugins by extension and platform (only .exe on Windows, no .exe on other platforms).
- Fix bug in memoization of Sysl CLI invocations.

## [0.49.0]

- Improve integration diagram plugin to use LSP framework.
- Improve ERD diagram to use Sysl SDK and handle type decorators (e.g. `set of <reference>`).
- Improve default diagram node template to have bigger text relative to the box.

## [0.47.0]

- Support plugin actions by compiling models when invoked on `.sysl` files.

## [0.46.0]

- Fix communication of models between extension and LSP plugins.

## [0.44.0]

- Generate Sysl models in the extension to send to plugins.
  - This change means plugins can work with compiled Sysl models without needing `sysl` to compile
    the models themselves. This is simpler and more efficient, avoiding duplicate compiles, but also
    frees plugins to more easily run remotely without needing access to imported specs.
  - Sysl model generation for plugins is memoized, so even though each plugin client asks to
    generate a model, the tasks is only executed once.
- Notify plugins of model changes via new `model/didChange` notifications.
- Tidy up build tooling and deps for `model`, `plugin`, and the built-in `erd` plugin.

## [0.36.0]

- Support custom plugin config

## [0.33.0]

- Accommodate `.sysld` files

## [0.30.0]

- Update npm workflow names
- Replace `npm` with `yarn` in CI steps

## [0.29.0]

- Refactor `/plugin` and `/model` into npm packages
- Add GitHub workflow to publish npm packages upon changes and version increments

## [0.28.0]

- Add error icons to tabs with error messages

## [0.27.0]

- Add loading spinners to tabs

## [0.26.0]

- UI updates:
  - Increase drawer widths to view more text information.
  - Selecting an edge selects all the edges in the link group.

## [0.24.0]

- Allow remote plugins to be discovered via the network.
- Fix ERD plugin errors.

## [0.23.0]

- Add _plugin actions_. LSP plugins can dynamically contribute actions to the extension, analogous to how the extension contributes commands to the client.
  - The "Sysl: List Actions" command displays a quick pick menu, and the select action is invoked via `executeCommand` to be handled by the plugin server.
- Auto-open (in memory) auxiliary Sysl specs when their main specs are opened.
- Fix diagram snapshot feature.

## [0.22.0]

- Allow plugins to specify opacity of nodes and links.

## [0.21.0]

- Collapse links based on label, source and destination.

## [0.19.0]

- Introduce new architecture for extension plugins.
  - Plugins are now designed around the [LSP protocol](https://microsoft.github.io/language-server-protocol/). Each plugin can be implemented as an LSP language server, meaning it can provide the full set of text-based language features, as well as drawing diagrams.
  - Both LSP language server plugins and old-style plugins (Sysl transforms and generic binaries) share a common `PluginClient` class. The old-style plugins will likely be deprecated once it is sufficiently straightforward to build LSP servers.
  - Introduce `View` abstraction for non-text display features on the client (e.g. diagrams, HTML pages). The new `MultiView` class aggregates child `View`s under tabs within a single custom editor webview.
- Bump minimum Sysl binary version to v0.465.0.
  - Replace the standalone Sysl LSP with the version built into the new Sysl binary.
  - Accept Sysl source on stdin so `sysl protobuf` and `sysl transform` can work with unsaved specs.

## [0.18.0]

- Include `viewId` in diagram change events from the renderer, and pass it through to plugins as change context.

## [0.17.0]

- Display Sysl syntax error messages to the user.

## [0.16.0]

- Improved link routing to avoid nodes and expanded groups.

## [0.15.0]

- Allow plugins to specify maximum lines of text.

## [0.14.0]

- Fix horizontal scroll behaviour when diagram is zoomed in.

## [0.13.0]

- Fix selection behaviour:
  - Selections made in one tab are deselected when the tab is changed.

## [0.12.0]

- View diagram hierarchy in a side panel.

## [0.11.0]

- View details of selected diagram elements in a side panel.

## [0.10.0]

- Publish diagram selection event to extension.

## [0.9.0]

- Display progress indicator when updating the webview.

## [0.8.0]

- Update default styles for diagram text.

## [0.7.1]

- Add command/button to save a snapshot of the current diagram as an SVG.

## [0.6.0]

- Display error messages in the diagram renderer if something goes wrong with rendering.

## [0.5.1]

- Fix dependency version.

## [0.5.0]

- Add initial version of Sysl Plugin Protocol spec in [`plugin.schema.json`](extension/protocol/plugin.schema.json).
  - A plugin is any program that implements this protocol: receiving requests and sending responses according to the schema.
  - Diagram model changes are published to plugins via the extension, and their responses can render new diagrams.
  - See the [example](extension/protocol) directory for a minimal example of implementing a plugin "server".
  - Multiple plugins can be detected and invoked, and each can return multiple diagrams. Multiple diagrams are selectable via tabs in the renderer.
- Add support for "screenshots" (SVG exports) of diagrams in UI tests (stable comparison and assertion still TODO).
- General refactoring and rendering improvements.

## [0.4.0]

- Minor cleanup

## [0.3.0]

- Basic side-by-side integration diagram rendering.
- Initial support for plugins to render custom diagrams.
- Cross-platform end-to-end test framework ([follows docs with @vscode/test-electron](https://code.visualstudio.com/api/working-with-extensions/testing-extension)).

## [0.2.2]

- Add UI testing
  - A very [explanatory blog post](https://developers.redhat.com/blog/2019/11/18/new-tools-for-automating-end-to-end-tests-for-vs-code-extensions#writing_the_tests)

## [0.2.1]

- Fix automatic indentation behavior:
  - Indent the line following a line ending in `:`
  - Never dedent automatically

## [0.2.0]

- Clean up repository for new development
  - Remove unused `oldserver`
  - Update and refactor old code, including launch tasks, `package.json`, dependencies, TypeScript code and config
  - Update and fix tests - no real coverage, but there wasn't before either, and they run properly now
  - Add `publish` GitHub workflow to publishes commits to `master`
  - Tidy with `prettier`
  - Switch from `npm` to `yarn`

## [0.1.2]

- Stop extension stealing the output window

## [0.1.1]

- Fixed incorrect CI/CD configuration

## [0.1.0]

- Upgrading vscode-sysl plugin base to current sample version
- Using a golang lsp instead of typescipt for sysl diagnostics

## [0.0.8]

- Total rewrite of syntax highlighter

## [0.0.7]

- Updated the syntax highlighting

## [0.0.6]

- Introduce sysl.Build command
- Fix path issues on windows

## [0.0.5]

- onDefinition for view calls
- Updated syntax highlighting rules
- Recognize latest version of sysl grammar
- use sysljs 1.0.3

## [0.0.4]

- Recognize latest version of sysl grammar
- use sysljs 1.0.2

## [0.0.3]

- Recognize latest version of sysl grammar

## [0.0.2]

- Adds gosysl for windows.
- Handles sysl transformation syntax.

## [0.0.1]

Initial version.

- Syntax highlighting.
- Syntax errors.
- Go to Definition for Application, Endpoints.
- `go-sysl` binary added for osx users.
