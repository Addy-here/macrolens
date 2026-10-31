import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { router } from 'expo-router';
import { useLogIntentStore } from '../store/useLogIntentStore';

/**
 * Home Screen quick actions: touch and hold the app icon. Apple allows four;
 * these are the four things people open a food log to do (HIG, Home Screen
 * quick actions). The first sits nearest the icon.
 */
const ACTIONS: QuickActions.Action[] = [
  { id: 'speak', title: 'Say a Meal', icon: 'symbol:mic.fill' },
  { id: 'photo', title: 'Snap a Meal', icon: 'symbol:camera.fill' },
  { id: 'search', title: 'Search Foods', icon: 'symbol:magnifyingglass' },
  { id: 'weigh', title: 'Log Weight', icon: 'symbol:scalemass.fill' },
];

export function runQuickAction(id: string) {
  // Start from the tabs, whatever sheet was open when the app went to the background.
  if (router.canDismiss()) router.dismissAll();
  if (id === 'speak' || id === 'photo') {
    useLogIntentStore.getState().request(id === 'speak' ? { kind: 'listen' } : { kind: 'capture', source: 'camera' });
    router.navigate('/log');
  } else if (id === 'search') {
    router.push('/search');
  } else if (id === 'weigh') {
    router.navigate('/plan');
    router.push('/weigh-in');
  }
}

/**
 * Registers the actions and handles them, including the one that launched the
 * app. Mounted in the tabs layout, not the root, so navigation is ready.
 */
export function useQuickActions() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void QuickActions.setItems(ACTIONS);
  }, []);
  // A frame's delay lets the tabs finish mounting on a cold launch.
  useQuickActionCallback((action) => {
    setTimeout(() => runQuickAction(action.id), 0);
  });
}
