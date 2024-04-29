// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import * as child_process from 'child_process';

let port: number;
let adapter: child_process.ChildProcessWithoutNullStreams;
let customPort = false;
let customAdapterInstance = false;

export function activate(context: vscode.ExtensionContext) {
   context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('unicon-debugger', new UniconDebugConfigurationProvider()));
   context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('unicon-debugger', {
      provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
         return [
            {
               type: 'unicon-debugger',
               name: 'Launch in Unicon',
               request: 'launch',
               program: '${file}'
            }
         ];
      }
   }, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

   const factory = new UniconDebugAdapterFactory();
   context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('unicon-debugger', factory));
   if ('dispose' in factory) {
      context.subscriptions.push(factory);
   }
}

export function deactivate() {
   const kill = require('kill-port')
   kill(port, 'tcp')
   adapter.kill();
}

class UniconDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
   resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
      if (!config.type && !config.request && !config.name) {
         const editor = vscode.window.activeTextEditor;
         if (editor && editor.document.languageId === 'unicon') {
            config.type = 'unicon-debugger';
            config.name = 'Launch';
            config.request = 'launch';
            config.program = '${file}';
         }
      }

      if (config.port) {
         customPort = true;
         port = config.port
      } 
      else {
         customPort = false;
      }

      if (config.customAdapterInstance) {
         customAdapterInstance = true;
      }
      else {
         customAdapterInstance = false;
      }

      return config;
   }
}

class UniconDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
   async createDebugAdapterDescriptor(session: vscode.DebugSession, _: vscode.DebugAdapterExecutable | undefined): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>> {

      if (!customPort) {
         port = Math.floor(Math.random() * (65505 - 49152) + 49152);
      }

      if (!customAdapterInstance) {
         adapter = child_process.spawn("udb", [ "--adapter", port.toString() ]);
         adapter.stdout.on('data', (data) => {
            console.log(`${data}`);
         });
         adapter.stderr.on('data', (data) => {
            console.error(`${data}`);
         });
         adapter.on('close', (code) => {
            console.log(`adapter exited with code ${code}`);
         });

         await new Promise(f => setTimeout(f, 1000));
      }

      return new vscode.DebugAdapterServer(port, session.configuration.host);
   }
   dispose() {
   }
}