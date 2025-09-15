import * as React from "react";
import { Dimensions, Text, View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import { useRouter, Link } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';

const data = [
  { id: 1, image: require('../assets/images/home/patient.jpg') },
  { id: 2, image: require('../assets/images/home/patient.jpg') },
  { id: 3, image: require('../assets/images/home/patient.jpg') },
];

const width = Dimensions.get("window").width;

function WelcomeScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);
  
  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      count: index - progress.value,
      animated: true,
    });
  };

  const handlePatientChoice = () => {
    router.push('/(tabs)');
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Carrousel en haut */}
      <View style={styles.carouselSection}>
        <Carousel
          ref={ref}
          width={width}
          height={width * 0.7}
          data={data}
          onProgressChange={progress}
          renderItem={({ item }) => (
            <View style={styles.carouselItem}>
              <Image source={item.image} style={styles.carouselImage} />
            </View>
          )}
          autoPlay={true}
          autoPlayInterval={2000}
          loop={true}
        />
   
        <Pagination.Basic
          progress={progress}
          data={data}
          dotStyle={styles.dot}
          activeDotStyle={styles.activeDot}
          containerStyle={styles.paginationContainer}
          onPress={onPressPagination}
        />
      </View>

      {/* Boutons en bas */}
      <View style={styles.bottomSection}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.patientButton]} 
            onPress={handlePatientChoice}
          >
            <Text style={styles.buttonDescription}>
              Accéder au questionnaire de santé
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Link href="/terms-modal" asChild>
            <TouchableOpacity style={styles.termsButton}>
              <Text style={styles.termsText}>Conditions générales d&apos;utilisation</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

export default function WelcomeScreen() {
  return (
    <SafeAreaProvider>
      <WelcomeScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  carouselSection: {
    flex: 1,
  },
  carouselItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    borderRadius: 40,
    width: '85%',
    height: '100%',
    resizeMode: 'cover',
  },
  dot: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 50,
    width: 8,
    height: 8,
  },
  activeDot: {
    backgroundColor: 'black',
    borderRadius: 50,
    width: 8,
    height: 8,
  },
  paginationContainer: {
    gap: 5,
    marginTop: 20,
    marginBottom: 20,
  },
  bottomSection: {
    backgroundColor: 'white',
    paddingTop: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  termsButton: {
    padding: 10,
  },
  termsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});