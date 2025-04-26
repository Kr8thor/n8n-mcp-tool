# n8n Workflow Management Guide

This guide provides comprehensive rules and best practices for managing n8n workflows, particularly when running in Docker containers.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Accessing Workflows](#accessing-workflows)
3. [Updating Workflows](#updating-workflows)
4. [Container Management](#container-management)
5. [Troubleshooting](#troubleshooting)
6. [CLI Commands](#cli-commands)
7. [Best Practices](#best-practices)

## Prerequisites

- Docker installed and running
- n8n running in a Docker container
- Basic understanding of CLI commands
- Access to container shell

## Accessing Workflows

### 1. Finding Workflow Files
```bash
# List all workflows in JSON format
docker exec n8n-container n8n list:workflow

# Export all workflows
docker exec n8n-container n8n export:workflow --all --output=/tmp/all-workflows.json
docker cp n8n-container:/tmp/all-workflows.json ./
```

### 2. Accessing Specific Workflow
```bash
# Export specific workflow
docker exec n8n-container n8n export:workflow --id=<workflow-id> --output=/tmp/workflow.json
docker cp n8n-container:/tmp/workflow.json ./
```

## Updating Workflows

### 1. Prepare Updated Workflow
- Create updated workflow JSON file locally
- Ensure all node configurations are correct
- Test JSON validity

### 2. Import Updated Workflow
```bash
# Copy updated workflow to container
docker cp updated-workflow.json n8n-container:/tmp/

# Import with overwrite
docker exec n8n-container n8n import:workflow --input=/tmp/updated-workflow.json

# Activate workflow
docker exec n8n-container n8n update:workflow --id=<workflow-id> --active=true
```

### 3. Ensure Changes Persist
```bash
# Restart container to apply changes
docker restart n8n-container

# Wait for n8n to fully start
sleep 20
```

## Container Management

### 1. Basic Container Commands
```bash
# List running containers
docker ps --filter name=n8n

# Restart container
docker restart n8n-container

# Stop and start container
docker stop n8n-container
docker start n8n-container

# View container logs
docker logs n8n-container

# Execute commands inside container
docker exec n8n-container <command>
```

### 2. Backup and Restore
```bash
# Create backup
docker exec n8n-container n8n export:workflow --all --backup --output=/tmp/backup.json
docker cp n8n-container:/tmp/backup.json ./backup-$(date +%Y%m%d).json

# Restore from backup
docker cp backup.json n8n-container:/tmp/
docker exec n8n-container n8n import:workflow --input=/tmp/backup.json
```

## Troubleshooting

### 1. Common Issues

#### Workflow Not Updating
- Close all browser tabs
- Clear browser cache
- Restart container
- Wait for full initialization

#### Changes Not Persisting
- Ensure container restart
- Check import success
- Verify activation status

#### Green Checkmarks Missing
- Workflow not activated
- Container needs restart
- Browser cache issue

### 2. Diagnostic Commands
```bash
# Check workflow status
docker exec n8n-container n8n list:workflow

# View container status
docker ps -a --filter name=n8n

# Check n8n logs
docker logs --tail 50 n8n-container

# Test container health
docker exec n8n-container curl localhost:5678
```

## CLI Commands

### Essential n8n CLI Commands
```bash
# List workflows
n8n list:workflow

# Export workflows
n8n export:workflow --all
n8n export:workflow --id=<id>

# Import workflows
n8n import:workflow --input=<file>

# Update workflow
n8n update:workflow --id=<id> --active=true

# Create backup
n8n export:workflow --backup

# Get workflow info
n8n get:workflow --id=<id>
```

## Best Practices

### 1. Always Create Backups
- Before making changes
- Regular scheduled backups
- Keep version history

### 2. Test Before Production
- Use test workflows
- Verify node connections
- Test with sample data

### 3. Proper Restart Sequence
1. Import workflow
2. Activate workflow
3. Restart container
4. Wait for initialization
5. Close and reopen browser

### 4. Documentation
- Document workflow changes
- Keep configuration records
- Maintain change logs

### 5. Error Handling
- Check logs for errors
- Verify credentials
- Test connections
- Validate JSON

## Automation Scripts

### Complete Update Script
```javascript
const { exec } = require('child_process');
const fs = require('fs');

async function updateWorkflow(workflowId, updateFile) {
  // Backup
  await exec(`docker exec n8n-container n8n export:workflow --id=${workflowId} --output=/tmp/backup.json`);
  
  // Copy and import
  await exec(`docker cp ${updateFile} n8n-container:/tmp/update.json`);
  await exec(`docker exec n8n-container n8n import:workflow --input=/tmp/update.json`);
  
  // Activate
  await exec(`docker exec n8n-container n8n update:workflow --id=${workflowId} --active=true`);
  
  // Restart
  await exec('docker restart n8n-container');
  
  console.log('Update complete!');
}
```

## MCP Integration

This guide can be integrated as an MCP tool for Claude desktop to provide workflow management capabilities. The tool should include:

1. Workflow access functions
2. Update procedures
3. Troubleshooting utilities
4. Container management
5. Backup/restore operations

### MCP Tool Configuration
```json
{
  "name": "n8n-workflow-manager",
  "version": "1.0.0",
  "description": "Manage n8n workflows in Docker containers",
  "commands": [
    "list-workflows",
    "update-workflow",
    "restart-container",
    "backup-workflows",
    "troubleshoot"
  ]
}
```

## Conclusion

This guide provides a comprehensive approach to managing n8n workflows in Docker environments. Following these rules and best practices ensures smooth operation, reliable updates, and effective troubleshooting.