import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from 'expo-audio';

import {
  restTimerSoundById,
  type RestTimerSoundId,
} from '@/lib/restTimerSounds';
import { useRestTimerSoundStore } from '@/stores/restTimerSoundStore';

let player: AudioPlayer | null = null;
let loadedSoundId: RestTimerSoundId | null = null;
let initPromise: Promise<void> | null = null;

function ensureAudioMode(): Promise<void> {
  if (!initPromise) {
    initPromise = setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      initPromise = null;
    });
  }
  return initPromise ?? Promise.resolve();
}

async function playerForSound(soundId: RestTimerSoundId): Promise<AudioPlayer | null> {
  try {
    await ensureAudioMode();
    if (player && loadedSoundId === soundId) return player;

    const source = restTimerSoundById(soundId).source;
    if (!player) {
      player = createAudioPlayer(source);
    } else {
      player.replace(source);
    }
    player.volume = 1;
    loadedSoundId = soundId;
    return player;
  } catch {
    return null;
  }
}

async function playSource(soundId: RestTimerSoundId): Promise<void> {
  const active = await playerForSound(soundId);
  if (!active) return;
  await setIsAudioActiveAsync(true);
  await active.seekTo(0);
  active.play();
}

/** Warm the selected ding when the rest overlay opens. */
export function prepareRestTimerDing(): void {
  const soundId = useRestTimerSoundStore.getState().soundId;
  void playerForSound(soundId);
}

/** Play the user's selected rest-complete sound. */
export async function playRestTimerDing(): Promise<void> {
  try {
    const soundId = useRestTimerSoundStore.getState().soundId;
    await playSource(soundId);
  } catch {
    // native module unavailable — ignore
  }
}

/** Preview any rest-timer sound from the profile picker. */
export async function previewRestTimerSound(soundId: RestTimerSoundId): Promise<void> {
  try {
    await playSource(soundId);
  } catch {
    // ignore
  }
}
