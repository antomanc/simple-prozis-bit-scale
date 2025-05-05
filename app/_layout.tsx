import { useFonts } from 'expo-font';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import ScaleScanner from '../components/ScaleScanner';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <PaperProvider>
      <ScaleScanner />
    </PaperProvider>
  );
}
