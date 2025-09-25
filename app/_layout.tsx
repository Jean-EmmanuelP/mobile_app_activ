import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    NotoIkea: require('@/assets/fonts/Noto_Ikea_400.woff2'),
  });

  if (!loaded) {
    return null;
  }

  // Set default font family for all Text and TextInput components
  if (loaded) {
    const defaultTextStyle = Text.defaultProps?.style || {};
    const defaultTextInputStyle = TextInput.defaultProps?.style || {};
    
    Text.defaultProps = {
      ...Text.defaultProps,
      style: [{ fontFamily: 'NotoIkea' }, defaultTextStyle],
    };

    TextInput.defaultProps = {
      ...TextInput.defaultProps,
      style: [{ fontFamily: 'NotoIkea' }, defaultTextInputStyle],
    };
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider value={DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="welcome" options={{ headerShown: false }} />
              <Stack.Screen name="pre-intake" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="terms-modal"
                options={{
                  presentation: 'modal',
                  headerShown: false
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}
