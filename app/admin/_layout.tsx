import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';

export default function AdminLayout() {
  const Colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
