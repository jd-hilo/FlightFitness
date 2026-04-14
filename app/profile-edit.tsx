import { View, StyleSheet } from 'react-native';

import { ProfileAnswersForm } from '@/components/profile/ProfileAnswersForm';
import { theme } from '@/constants/theme';

export default function ProfileEditScreen() {
  return (
    <View style={styles.screen}>
      <ProfileAnswersForm />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
});
