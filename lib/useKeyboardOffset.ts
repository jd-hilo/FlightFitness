import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent, Platform } from 'react-native';

/**
 * Tracks the on-screen keyboard height so ScrollViews / lists can add bottom
 * padding. More reliable inside `Modal` than `KeyboardAvoidingView` alone.
 */
export function useKeyboardOffset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = (e: KeyboardEvent) => {
      setHeight(e.endCoordinates.height);
    };
    const hide = () => setHeight(0);
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, show);
    const h = Keyboard.addListener(hideEvt, hide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  return height;
}
