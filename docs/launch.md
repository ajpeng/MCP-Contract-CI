# MCP Contract CI launch kit

## One-line description

Contract testing for MCP servers in CI. Catch breaking tool, resource, prompt, and schema changes before they break agent workflows.

## LinkedIn or X post

I built MCP Contract CI because MCP servers are becoming real product surfaces for agents, but their contracts often change without the release discipline we apply to public APIs.

It compares MCP capability manifests, flags breaking tool-schema changes in pull requests, and replays saved agent tool calls against a candidate server. The goal is simple: find the release that breaks an agent workflow before it reaches production.

The project includes a CLI, GitHub Action, versioned manifests, and live stdio replay. Feedback from people maintaining MCP servers would be especially useful.

https://github.com/ajpeng/MCP-Contract-CI

## Demo narrative

Start with the before manifest. Then show the candidate adding a required `timezone` field, removing an output field, and deleting a tool. Run the Action and point to the PR summary: it reports the breaking changes and the number of saved workflows affected. End by replaying the same trace against the candidate server.
