# n8n MCP Tool

This repository contains an MCP (Model Context Protocol) tool for managing n8n workflows through Claude desktop.

## Installation

1. Clone this repository
2. Add to your Claude desktop configuration
3. Restart Claude desktop

## Features

- List and search n8n workflows
- Update workflow configurations
- Manage Docker containers
- Troubleshoot workflow issues
- Backup and restore workflows

## Usage

The tool provides several commands:

### List Workflows
```
list-workflows
```

### Update Workflow
```
update-workflow --id <workflow-id> --file <update-file>
```

### Restart Container
```
restart-container --name <container-name>
```

### Backup Workflows
```
backup-workflows --output <backup-file>
```

### Troubleshoot
```
troubleshoot --workflow <workflow-id>
```

## Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n-manager": {
      "command": "node",
      "args": ["path/to/n8n-mcp-tool/index.js"]
    }
  }
}
```

## Contributing

Feel free to submit issues and pull requests.

## License

MIT License
