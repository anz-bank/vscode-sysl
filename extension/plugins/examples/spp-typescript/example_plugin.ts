/**
 * Example of a Sysl plugin for VS Code.
 *
 * A Node.js program that trivially implements the plugin protocol.
 */

import * as fs from "fs";

/**
 * Reads the request from stdin and writes an appropriate response to stdout.
 */
function main() {
  const req = JSON.parse(fs.readFileSync(process.stdin.fd, "utf-8"));

  const res: any = {};
  if ("initialize" in req) {
    res.initialize = initialize();
  } else if ("onchange" in req) {
    res.onchange = onChange();
  } else {
    res.error = {};
  }

  fs.writeFileSync(process.stdout.fd, JSON.stringify(res));
}

const exampleType = {
  id: "example",
  name: "Example",
};

function initialize() {
  return {
    capabilities: {
      diagrams: {
        availabilities: [
          {
            type: exampleType,
            available: true,
          },
        ],
      },
    },
  };
}

function onChange() {
  return {
    renderDiagram: [
      {
        type: exampleType,
        content: {
          nodes: [{ key: "a" }, { key: "b" }],
          edges: [{ key: "a->b", from: "a", to: "b" }],
        },
      },
    ],
  };
}

main();
