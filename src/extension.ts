// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import * as child_process from 'child_process';

let DEFAULT_PORT: number;
let adapterfactory: child_process.ChildProcessWithoutNullStreams;

export function activate(context: vscode.ExtensionContext) {

	DEFAULT_PORT = Math.floor(Math.random() * (65505 - 49152) + 49152);

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

	adapterfactory = child_process.spawn("adapterfactory", [ DEFAULT_PORT.toString() ]);
	adapterfactory.stdout.on('data', (data) => {
		console.log(`${data}`);
	});
	adapterfactory.stderr.on('data', (data) => {
		console.error(`${data}`);
	});
	adapterfactory.on('close', (code) => {
		console.log(`adapterfactory exited with code ${code}`);
	});

	const factory = new UniconDebugAdapterFactory();
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('unicon-debugger', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}
}

export function deactivate() {
	const kill = require('kill-port')
	kill(DEFAULT_PORT, 'tcp')
	adapterfactory.kill();
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
				config.stopOnEntry = true;
			}
		}
		return config;
	}
}

class UniconDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession, _: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterServer(DEFAULT_PORT, session.configuration.host);
	}
	dispose() {
	}
}