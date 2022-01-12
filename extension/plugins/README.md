# Extension Plugins

The Sysl extension is an open-source project, meaning everything it ships with is available to the public. This is wonderful for distribution, but problematic if you want to include features that are private to your organization.

Plugins provide a solution. Plugins are programs providing additional features to the extension that are discovered and executed at runtime. They need not ship as part of the extension, so long as the extension can find them.

By default, the extension will treat programs matching `.sysl/diagram_renderers/*` in your workspace as plugins that render diagrams. It also has hard-coded knowledge about the public plugins in this directory.

This plugin capability is still new and will evolve significantly over time.
