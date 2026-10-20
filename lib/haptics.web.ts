/** Web / screenshot stub — native haptics are unavailable. */

export enum ImpactStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Soft = 'soft',
  Rigid = 'rigid',
}

export enum NotificationType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export function hapticImpact(_style?: ImpactStyle) {}
export function hapticNotify(_type?: NotificationType) {}
export function hapticSelection() {}
