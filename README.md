# <img width="400px" src="resources/readme/vscode-logo-text.png"/> + <img width="400px" src="resources/readme/sysl-logo-text.png"/>

# Sysl extension for Visual Studio Code

Accelerate your [Sysl](https://sysl.io/) spec development with rich language features and interactive side-by-side diagrams.

![Screenshot of the Sysl extension](resources/readme/hero-screenshot.png)

## Features

### Syntax

Sysl source syntax highlighting improves the legibility of Sysl specifications.

The Sysl language server provides additional language features, and is implemented in [anz-bank/sysl](https://github.com/anz-bank/sysl/blob/master/cmd/sysllsp/main.go).

### Diagrams

Visualize a specification as an interactive diagram in real time.

## Requirements

Just [Visual Studio Code](https://code.visualstudio.com/). The extension will fetch any other dependencies it needs (e.g. the Sysl binary).

## Contributing

When building (`yarn build`), if you're getting an error on macOS similar to
> Package pixman-1 was not found in the pkg-config search path

Try running the following command:
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

If you then get an error running `yarn`
> Library not loaded: /usr/local/opt/icu4c/lib/libicui18n.70.dylib

Run `brew upgrade && brew link --overwrite node@18` to fix it.

If you're getting the error:
``` Error: error:0308010C:digital envelope routines::unsupported
           at new Hash (node:internal/crypto/hash:68:19)
           at Object.createHash (node:crypto:138:10)
           at module.exports (/Users/guralnea/dev/vscode-sysl/node_modules/webpack/lib/util/createHash.js:135:53)
           at NormalModule._initBuildHash (/Users/guralnea/dev/vscode-sysl/node_modules/webpack/lib/NormalModule.js:417:16)
           at /Users/guralnea/dev/vscode-sysl/node_modules/webpack/lib/NormalModule.js:452:10
           at /Users/guralnea/dev/vscode-sysl/node_modules/webpack/lib/NormalModule.js:323:13
           at /Users/guralnea/dev/vscode-sysl/node_modules/loader-runner/lib/LoaderRunner.js:367:11
           at /Users/guralnea/dev/vscode-sysl/node_modules/loader-runner/lib/LoaderRunner.js:233:18
           at context.callback (/Users/guralnea/dev/vscode-sysl/node_modules/loader-runner/lib/LoaderRunner.js:111:13)
           at /Users/guralnea/dev/vscode-sysl/node_modules/react-scripts/node_modules/babel-loader/lib/index.js:59:103 {
         opensslErrorStack: [ 'error:03000086:digital envelope routines::initialization error' ],
         library: 'digital envelope routines',
         reason: 'unsupported',
         code: 'ERR_OSSL_EVP_UNSUPPORTED'
       }
```

Please downgrade to Node v18 running:
```
brew install node@18
brew link --overwrite node@18
```
