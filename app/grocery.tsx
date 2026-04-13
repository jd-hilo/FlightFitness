import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { usePlanStore } from '@/stores/planStore';

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const groceryList = usePlanStore((s) => s.groceryList);

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.gold,
          headerTitleStyle: {
            fontFamily: theme.fonts.headlineBold,
          },
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24, paddingTop: 16 },
        ]}
        style={styles.screen}>
        {!groceryList?.length ? (
          <Text style={styles.muted}>No grocery list yet. Generate a plan first.</Text>
        ) : (
          groceryList.map((item, i) => (
            <View key={`${item.name}-${i}`} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.quantity ? (
                  <Text style={styles.qty}>{item.quantity}</Text>
                ) : null}
              </View>
              {item.category ? (
                <Text style={styles.cat}>{item.category}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
    gap: 12,
  },
  name: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  qty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  cat: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  muted: {
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    fontSize: 15,
  },
});
