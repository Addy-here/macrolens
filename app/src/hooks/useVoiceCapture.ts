import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';
import { SPEECH_HINTS } from '../utils/describe';

export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'finishing';

export interface VoiceError {
  message: string;
  /** Permission was refused; offer a way to Settings. */
  needsSettings?: boolean;
}

/** Stop on its own after this much quiet once something has been said. */
const PAUSE_MS = 2200;
/** Give up if nothing at all is heard. */
const NOTHING_HEARD_MS = 9000;

function joinText(a: string, b: string) {
  const left = a.trim();
  const right = b.trim();
  if (!left) return right;
  if (!right) return left;
  // Some iOS versions report each result cumulatively; don't say things twice.
  if (right.toLowerCase().startsWith(left.toLowerCase())) return right;
  return `${left} ${right}`;
}

const NOT_SET_UP =
  'Speech recognition isn’t set up on this iPhone yet. Turn on Dictation in Settings › General › Keyboard (it downloads the speech model), or type instead.';

function speechLocale() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-US';
  // The food reference is English; other languages still go to the AI fallback as text.
  return locale.toLowerCase().startsWith('en') ? locale.replace('_', '-') : 'en-US';
}

/**
 * On-device speech recognition for describing a meal. Interim text streams
 * in as you talk; recognition stops by itself after a pause. Audio is not
 * stored, and with on-device recognition it never leaves the phone.
 */
export function useVoiceCapture() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  /** 0–1 input level, for the listening animation. */
  const level = useSharedValue(0);
  const startedAt = useRef(0);
  const lastHeard = useRef(0);
  const heardAnything = useRef(false);
  const interimRef = useRef('');
  /** The options of the current attempt, so a failed on-device start can retry on Apple's servers. */
  const attempt = useRef<ExpoSpeechRecognitionOptions | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    startedAt.current = Date.now();
    lastHeard.current = Date.now();
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (text.trim()) {
      heardAnything.current = true;
      lastHeard.current = Date.now();
    }
    if (event.isFinal) {
      setFinalText((previous) => joinText(previous, text));
      interimRef.current = '';
      setInterim('');
    } else {
      interimRef.current = text;
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent('nomatch', () => {
    if (!heardAnything.current) setError({ message: 'Didn’t catch that. Tap the mic and say what you ate.' });
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    const normalised = Math.min(Math.max((event.value + 2) / 12, 0), 1);
    level.value = withTiming(normalised, { duration: 90 });
    if (event.value > 1) lastHeard.current = Date.now();
  });

  useSpeechRecognitionEvent('end', () => {
    level.value = withTiming(0, { duration: 200 });
    setStatus('idle');
    // A final result can be missed if recognition is cut short; keep what was heard.
    const pending = interimRef.current;
    if (pending.trim()) setFinalText((previous) => joinText(previous, pending));
    interimRef.current = '';
    setInterim('');
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted') return;
    // The on-device model may not be downloaded yet (and simulators often lack it). Retry once with server recognition.
    const current = attempt.current;
    if (
      current?.requiresOnDeviceRecognition &&
      !heardAnything.current &&
      !['not-allowed', 'no-speech', 'speech-timeout'].includes(event.error)
    ) {
      attempt.current = { ...current, requiresOnDeviceRecognition: false };
      ExpoSpeechRecognitionModule.start(attempt.current);
      return;
    }
    setStatus('idle');
    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setError({ message: 'Didn’t catch that. Tap the mic and say what you ate.' });
    } else if (event.error === 'not-allowed') {
      setError({ message: 'Microphone or speech recognition is off for Macrolens.', needsSettings: true });
    } else if (event.error === 'service-not-allowed' || /initiali[sz]e recognizer/i.test(event.message ?? '')) {
      setError({ message: NOT_SET_UP });
    } else if (event.error === 'language-not-supported') {
      setError({ message: 'Speech recognition isn’t available for this language. You can type instead.' });
    } else if (event.error === 'network') {
      setError({ message: 'Speech recognition needs a connection on this device. You can type instead.' });
    } else {
      if (__DEV__) console.warn(`Speech recognition error: ${event.error} — ${event.message}`);
      setError({ message: 'Speech recognition stopped unexpectedly. Try again, or type instead.' });
    }
  });

  // Stop after a pause, or if nothing was said at all.
  useEffect(() => {
    if (status !== 'listening') return;
    const timer = setInterval(() => {
      const now = Date.now();
      if (heardAnything.current && now - lastHeard.current > PAUSE_MS) {
        ExpoSpeechRecognitionModule.stop();
        setStatus('finishing');
      } else if (!heardAnything.current && now - startedAt.current > NOTHING_HEARD_MS) {
        ExpoSpeechRecognitionModule.abort();
        setStatus('idle');
        setError({ message: 'Didn’t catch that. Tap the mic and say what you ate.' });
      }
    }, 300);
    return () => clearInterval(timer);
  }, [status]);

  const start = useCallback(
    async (fileUri?: string) => {
      setError(null);
      setFinalText('');
      setInterim('');
      interimRef.current = '';
      heardAnything.current = false;

      if (Platform.OS === 'web') {
        setError({ message: 'Voice logging is on iPhone. You can type instead.' });
        return;
      }
      if (!fileUri) {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          setError({ message: 'Microphone or speech recognition is off for Macrolens.', needsSettings: true });
          return;
        }
      }
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError({ message: 'Speech recognition isn’t available right now. You can type instead.' });
        return;
      }

      setStatus('starting');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      attempt.current = {
        lang: speechLocale(),
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        // Private and offline when the device has the model; falls back to Apple's servers otherwise.
        requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        contextualStrings: SPEECH_HINTS.slice(0, 100),
        iosTaskHint: 'dictation',
        volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
        audioSource: fileUri ? { uri: fileUri } : undefined,
      };
      ExpoSpeechRecognitionModule.start(attempt.current);
    },
    [],
  );

  const stop = useCallback(() => {
    void Haptics.selectionAsync();
    setStatus('finishing');
    ExpoSpeechRecognitionModule.stop();
  }, []);

  /** Development only: act as if listening, with a moving level and a transcript, to look at the UI in a simulator. */
  const simulate = useCallback(
    (text: string) => {
      if (!__DEV__) return;
      heardAnything.current = true;
      startedAt.current = Date.now();
      lastHeard.current = Date.now() + 60000;
      setError(null);
      setStatus('listening');
      setInterim(text);
      interimRef.current = text;
      const timer = setInterval(() => {
        level.value = withTiming(0.2 + Math.random() * 0.7, { duration: 90 });
      }, 100);
      setTimeout(() => clearInterval(timer), 15000);
    },
    [level],
  );

  const cancel = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    setStatus('idle');
    setFinalText('');
    setInterim('');
    interimRef.current = '';
  }, []);

  // Never leave the microphone running behind another screen.
  useEffect(() => () => ExpoSpeechRecognitionModule.abort(), []);

  return {
    status,
    active: status !== 'idle',
    transcript: joinText(finalText, interim),
    level,
    error,
    clearError: () => setError(null),
    start,
    stop,
    cancel,
    simulate,
  };
}
