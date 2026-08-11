export type RestTimerSoundId =
  | 'bell-light'
  | 'bell-soft'
  | 'chime-bright'
  | 'bell-duo';

export type RestTimerSoundOption = {
  id: RestTimerSoundId;
  label: string;
  description: string;
  source: number;
};

export const REST_TIMER_SOUND_OPTIONS: RestTimerSoundOption[] = [
  {
    id: 'bell-light',
    label: 'Light bell',
    description: 'Airy, delicate high bell',
    source: require('@/assets/sounds/rest-timer/bell-light.wav'),
  },
  {
    id: 'bell-soft',
    label: 'Soft bell',
    description: 'Warm tone with a gentle tail',
    source: require('@/assets/sounds/rest-timer/bell-soft.wav'),
  },
  {
    id: 'chime-bright',
    label: 'Bright chime',
    description: 'Short, clean glass chime',
    source: require('@/assets/sounds/rest-timer/chime-bright.wav'),
  },
  {
    id: 'bell-duo',
    label: 'Bell duo',
    description: 'Two light bell notes',
    source: require('@/assets/sounds/rest-timer/bell-duo.wav'),
  },
];

export const DEFAULT_REST_TIMER_SOUND_ID: RestTimerSoundId = 'bell-soft';

export function restTimerSoundById(id: RestTimerSoundId): RestTimerSoundOption {
  return (
    REST_TIMER_SOUND_OPTIONS.find((o) => o.id === id) ??
    REST_TIMER_SOUND_OPTIONS[0]!
  );
}
