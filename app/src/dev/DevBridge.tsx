import { useEffect } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { runDevCommand, type DevParams } from './devCommands';

/**
 * Development only. Polls Documents/dev-command.txt for a command written
 * from the Mac into the simulator's app container (see scratch `dev.sh` in
 * docs/AGENT-GUIDE.md), because a dev build makes iOS ask "Open in
 * Macrolens?" before every deep link. The file is deleted once read.
 */
export function DevBridge() {
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'ios') return;
    const file = new File(Paths.document, 'dev-command.txt');
    const timer = setInterval(() => {
      if (!file.exists) return;
      let value = '';
      try {
        value = file.textSync().trim();
        file.delete();
      } catch {
        return;
      }
      const params: DevParams = {};
      for (const part of value.split('&')) {
        const split = part.indexOf('=');
        if (split < 0) continue;
        (params as Record<string, string>)[part.slice(0, split)] = decodeURIComponent(part.slice(split + 1));
      }
      void runDevCommand(params);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return null;
}
