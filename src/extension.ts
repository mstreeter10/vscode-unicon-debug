// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import * as child_process from 'child_process';

const DEFAULT_PORT = 4711;
let unicon: child_process.ChildProcessWithoutNullStreams;

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('unicon-debugger.runEditorContents', (resource: vscode.Uri) => {
			vscode.debug.startDebugging(undefined, {
				type: 'unicon-debugger',
				name: 'Run Editor Contents',
				request: 'launch',
				program: resource.fsPath,
				noDebug: true,
				port: DEFAULT_PORT
			});
		}),
		vscode.commands.registerCommand('unicon-debugger.debugEditorContents', (resource: vscode.Uri) => {
			vscode.debug.startDebugging(undefined, {
				type: 'unicon-debugger',
				name: 'Debug Editor Contents',
				request: 'launch',
				program: resource.fsPath,
				port: DEFAULT_PORT,
				stopOnEntry: true
			});
		}),
		vscode.commands.registerCommand('unicon-debugger.attach', () => {
			vscode.debug.startDebugging(undefined, {
				type: 'unicon-debugger',
				name: 'Attach to Unicon',
				request: 'attach',
				port: DEFAULT_PORT
			});
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand('unicon-debugger.getProgramName', config => {
		return vscode.window.showInputBox({
			placeHolder: "Please enter the name of a .icn file in the workspace folder"
		});
	}));

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('unicon-debugger', new UniconDebugConfigurationProvider()));
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('unicon-debugger', {
		provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
			return [
				{
					type: 'unicon-debugger',
					name: 'Attach to Unicon',
					request: 'attach',
					port: DEFAULT_PORT
				},
				{
					type: 'unicon-debugger',
					name: 'Launch in Unicon',
					request: 'launch',
					program: '${file}',
					port: DEFAULT_PORT
				}
			];
		}
	}, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

	unicon = child_process.spawn("udap", [ "--socket", DEFAULT_PORT.toString() ]);
	unicon.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});
	unicon.stderr.on('data', (data) => {
		console.error(`stderr: ${data}`);
	});
	unicon.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
	}); 

	const factory = new UniconDebugAdapterFactory();
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('unicon-debugger', factory));
	if ('dispose' in factory) {
		context.subscriptions.push(factory);
	}
}

export function deactivate() {
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
				config.port = DEFAULT_PORT;
				config.stopOnEntry = true;
			}
		}

		return config;
	}
}

class UniconDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession, _: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterServer(session.configuration.port, session.configuration.host);
	}
	dispose() {
	}
}