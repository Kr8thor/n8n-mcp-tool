#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// MCP Tool for n8n Workflow Management
class N8nWorkflowManager {
  constructor() {
    this.containerName = process.env.N8N_CONTAINER_NAME || 'n8n-container';
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }

  async listWorkflows() {
    try {
      const result = await this.executeCommand(`docker exec ${this.containerName} n8n list:workflow`);
      return result;
    } catch (error) {
      return `Error listing workflows: ${error.message}`;
    }
  }

  async updateWorkflow(workflowId, updateFile) {
    try {
      // Backup existing workflow
      await this.executeCommand(`docker exec ${this.containerName} n8n export:workflow --id=${workflowId} --output=/tmp/backup-${workflowId}.json`);
      
      // Copy update file to container
      await this.executeCommand(`docker cp ${updateFile} ${this.containerName}:/tmp/update.json`);
      
      // Import updated workflow
      await this.executeCommand(`docker exec ${this.containerName} n8n import:workflow --input=/tmp/update.json`);
      
      // Activate workflow
      await this.executeCommand(`docker exec ${this.containerName} n8n update:workflow --id=${workflowId} --active=true`);
      
      // Restart container
      await this.executeCommand(`docker restart ${this.containerName}`);
      
      return 'Workflow updated successfully';
    } catch (error) {
      return `Error updating workflow: ${error.message}`;
    }
  }

  async restartContainer() {
    try {
      await this.executeCommand(`docker restart ${this.containerName}`);
      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 20000));
      return 'Container restarted successfully';
    } catch (error) {
      return `Error restarting container: ${error.message}`;
    }
  }

  async backupWorkflows() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `n8n-backup-${timestamp}.json`;
      
      await this.executeCommand(`docker exec ${this.containerName} n8n export:workflow --all --output=/tmp/${backupFile}`);
      await this.executeCommand(`docker cp ${this.containerName}:/tmp/${backupFile} ./${backupFile}`);
      
      return `Backup created: ${backupFile}`;
    } catch (error) {
      return `Error creating backup: ${error.message}`;
    }
  }

  async troubleshoot(workflowId) {
    try {
      const checks = [];
      
      // Check container status
      const containerStatus = await this.executeCommand(`docker ps --filter name=${this.containerName} --format "{{.Status}}"`);
      checks.push(`Container status: ${containerStatus.trim()}`);
      
      // Check workflow status
      const workflowStatus = await this.executeCommand(`docker exec ${this.containerName} n8n list:workflow | grep ${workflowId}`);
      checks.push(`Workflow status: ${workflowStatus.trim()}`);
      
      // Check container logs
      const logs = await this.executeCommand(`docker logs --tail 20 ${this.containerName}`);
      checks.push(`Recent logs:\n${logs}`);
      
      return checks.join('\n\n');
    } catch (error) {
      return `Error during troubleshooting: ${error.message}`;
    }
  }
}

// MCP Server interface
class MCPServer {
  constructor() {
    this.manager = new N8nWorkflowManager();
  }

  async handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'list-workflows':
        return await this.manager.listWorkflows();
      
      case 'update-workflow':
        return await this.manager.updateWorkflow(params.id, params.file);
      
      case 'restart-container':
        return await this.manager.restartContainer();
      
      case 'backup-workflows':
        return await this.manager.backupWorkflows();
      
      case 'troubleshoot':
        return await this.manager.troubleshoot(params.workflow);
      
      default:
        return 'Unknown command';
    }
  }

  start() {
    process.stdin.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        const response = await this.handleRequest(request);
        console.log(JSON.stringify({ result: response }));
      } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
      }
    });
  }
}

// Start the MCP server
const server = new MCPServer();
server.start();