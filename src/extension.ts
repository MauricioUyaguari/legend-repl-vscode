/**
 * Copyright (c) 2023-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';
import {
  Uri,

  type ExtensionContext,
  window,
  commands,
  ThemeIcon,
  type CancellationToken,
  type TerminalProfile,
  type ProviderResult,
  TerminalLink,
} from 'vscode';

const REPL_NAME = 'Legend REPL';

export function activate(context: ExtensionContext): void {
  createReplTerminal(context);
}

export function deactivate(): void {
  console.log('lets exist');
}

class LegendTerminalLink extends TerminalLink {
  url: Uri;

  constructor(startIndex: number, lenght: number, url: Uri, tooltip?: string) {
    super(startIndex, lenght, tooltip);
    this.url = url;
  }
}

export function createReplTerminal(context: ExtensionContext): void {
  const provider = window.registerTerminalProfileProvider(
    'legend.terminal.repl',
    {
      provideTerminalProfile(
        token: CancellationToken,
      ): ProviderResult<TerminalProfile> {
        return ({
          options: {
            name: REPL_NAME,
            shellPath: 'java',
            shellArgs: [
              '-jar',
              context.asAbsolutePath(
                path.join('server', 'legend-repl-beta-2.jar'),
              ),
            ],
            message: 'Welcome to Legend REPL Cube. This is the stand alone REPL extension for vs code.',
            iconPath: new ThemeIcon('repl'),
            isTransient: true,
          },
        });
      },
    },
  );

  context.subscriptions.push(provider);

  // eslint-disable-next-line no-process-env
  if (process.env.VSCODE_PROXY_URI !== undefined) {
    const terminalLinkProvider = window.registerTerminalLinkProvider({
      provideTerminalLinks: (terminalContext) => {
        if (terminalContext.terminal.creationOptions.name !== REPL_NAME) {
          return [];
        }

        const isLocalHost =
          terminalContext.line.startsWith('http://localhost:');
        let indexOfReplPath = terminalContext.line.indexOf('/repl');

        if (!isLocalHost || indexOfReplPath === -1) {
          return [];
        }

        const localHostUrl = Uri.parse(terminalContext.line);
        const port = localHostUrl.authority.split(':')[1]!;

        // eslint-disable-next-line no-process-env
        if (process.env.VSCODE_PROXY_URI!.endsWith('/')) {
          // manage the trailing / when concat paths...
          indexOfReplPath++;
        }

        const proxyUrl = Uri.parse(
          // eslint-disable-next-line no-process-env
          process.env.VSCODE_PROXY_URI!.replace('{{port}}', port) +
            terminalContext.line.substring(indexOfReplPath),
        );
        return [
          new LegendTerminalLink(
            0,
            terminalContext.line.length,
            proxyUrl,
            'Open on Browser',
          ),
        ];
      },

      handleTerminalLink: (link: LegendTerminalLink) => {
        commands.executeCommand('simpleBrowser.api.open', link.url);
      },
    });

    context.subscriptions.push(terminalLinkProvider);
  }
}

