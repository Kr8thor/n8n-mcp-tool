#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// N8n Workflow Manager
class N8nWorkflowManager {
  constructor() {
    this.containerName = process.env.N8N_CONTAINER_NAME || 'n8n-container';
  }

  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('WARNING')) {
        console.error('Command stderr:', stderr);
      }
      return stdout;
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  async listWorkflows() {
    try {
      const result = await this.executeCommand(`docker exec ${this.containerName} n8n list:workflow --no-header`);
      const workflows = result.trim().split('\n').map(line => {
        const [id, name, active] = line.trim().split(/\s{2,}/);
        return { id, name, active: active === 'Active' };
      });
      return workflows;
    } catch (error) {
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }

  async updateWorkflow(workflowId, updateData) {
    try {
      // Save update data to temporary file
      const tmpFile = `/tmp/workflow-update-${Date.now()}.json`;
      await execAsync(`echo '${JSON.stringify(updateData)}' > ${tmpFile}`);
      
      // Copy to container
      await this.executeCommand(`docker cp ${tmpFile} ${this.containerName}:/tmp/update.json`);
      
      // Import updated workflow
      await this.executeCommand(`docker exec ${this.containerName} n8n import:workflow --input=/tmp/update.json`);
      
      // Clean up
      await execAsync(`rm ${tmpFile}`);
      
      return { success: true, message: 'Workflow updated successfully' };
    } catch (error) {
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  async restartContainer() {
    try {
      await this.executeCommand(`docker restart ${this.containerName}`);
      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
      return { success: true, message: 'Container restarted successfully' };
    } catch (error) {
      throw new Error(`Failed to restart container: ${error.message}`);
    }
  }

  async backupWorkflows() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `n8n-backup-${timestamp}.json`;
      
      await this.executeCommand(`docker exec ${this.containerName} n8n export:workflow --all --output=/tmp/${backupFile}`);
      await this.executeCommand(`docker cp ${this.containerName}:/tmp/${backupFile} ./${backupFile}`);
      
      return { success: true, file: backupFile };
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async troubleshoot(workflowId) {
    try {
      const checks = [];
      
      // Check container status
      const containerStatus = await this.executeCommand(`docker ps --filter name=${this.containerName} --format "{{.Status}}"`);
      checks.push({ check: 'Container Status', result: containerStatus.trim() });
      
      // Check workflow status
      try {
        const workflowStatus = await this.executeCommand(`docker exec ${this.containerName} n8n list:workflow | grep ${workflowId}`);
        checks.push({ check: 'Workflow Status', result: workflowStatus.trim() });
      } catch (error) {
        checks.push({ check: 'Workflow Status', result: 'Workflow not found' });
      }
      
      // Get container logs
      const logs = await this.executeCommand(`docker logs --tail 20 ${this.containerName}`);
      checks.push({ check: 'Recent Logs', result: logs });
      
      return checks;
    } catch (error) {
      throw new Error(`Failed to troubleshoot: ${error.message}`);
    }
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'n8n-workflow-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize n8n manager
const n8nManager = new N8nWorkflowManager();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_workflows',
        description: 'List all n8n workflows in the container',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_workflow',
        description: 'Update a workflow with new configuration',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string' },
            updateData: { type: 'object' },
          },
          required: ['workflowId', 'updateData'],
        },
      },
      {
        name: 'restart_container',
        description: 'Restart the n8n Docker container',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'backup_workflows',
        description: 'Create a backup of all workflows',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'troubleshoot',
        description: 'Troubleshoot a workflow by checking its status and logs',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string' },
          },
          required: ['workflowId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_workflows':
        const workflows = await n8nManager.listWorkflows();
        return { content: [{ type: 'text', text: JSON.stringify(workflows, null, 2) }] };

      case 'update_workflow':
        const updateResult = await n8nManager.updateWorkflow(args.workflowId, args.updateData);
        return { content: [{ type: 'text', text: JSON.stringify(updateResult, null, 2) }] };

      case 'restart_container':
        const restartResult = await n8nManager.restartContainer();
        return { content: [{ type: 'text', text: JSON.stringify(restartResult, null, 2) }] };

      case 'backup_workflows':
        const backupResult = await n8nManager.backupWorkflows();
        return { content: [{ type: 'text', text: JSON.stringify(backupResult, null, 2) }] };

      case 'troubleshoot':
        const troubleshootResult = await n8nManager.troubleshoot(args.workflowId);
        return { content: [{ type: 'text', text: JSON.stringify(troubleshootResult, null, 2) }] };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});