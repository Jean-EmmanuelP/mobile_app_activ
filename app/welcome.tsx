import * as React from "react";
import { Dimensions, Text, View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useDerivedValue, useAnimatedReaction, runOnJS, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import { useRouter, Link } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';

const data = [
  { 
    id: 1, 
    image: require('../assets/images/home/waiting.jpg'),
    title: "Prendre soin de sa santé",
    description: "Un suivi personnalisé pour votre bien-être"
  },
  { 
    id: 2, 
    image: require('../assets/images/home/questionnaire.jpg'),
    title: "Questionnaire interactif",
    description: "Remplissez votre bilan de santé en quelques minutes"
  },
  { 
    id: 3, 
    image: require('../assets/images/home/medecin.jpeg'),
    title: "Consultation médicale",
    description: "Partagez vos résultats avec votre médecin"
  },
];

const width = Dimensions.get("window").width;

function WelcomeScreenContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const textOpacity = useSharedValue(1);
  const textTranslateY = useSharedValue(0);
  
  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      count: index - progress.value,
      animated: true,
    });
  };

  const onSnapToItem = (index: number) => {
    setCurrentIndex(index);
  };

  // Fonction pour changer l'index avec animation
  const changeIndexWithAnimation = React.useCallback((newIndex: number) => {
    // Animation de sortie
    textOpacity.value = withTiming(0, { 
      duration: 150, 
      easing: Easing.out(Easing.ease) 
    });
    textTranslateY.value = withTiming(-20, { 
      duration: 150, 
      easing: Easing.out(Easing.ease) 
    });
    
    // Changer l'index après l'animation de sortie
    setTimeout(() => {
      setCurrentIndex(newIndex);
      
      // Animation d'entrée
      textTranslateY.value = 20;
      textOpacity.value = withTiming(1, { 
        duration: 150, 
        easing: Easing.out(Easing.ease) 
      });
      textTranslateY.value = withTiming(0, { 
        duration: 150, 
        easing: Easing.out(Easing.ease) 
      });
    }, 150);
  }, [textOpacity, textTranslateY]);

  // Réaction immédiate basée sur le progrès avec animation
  useAnimatedReaction(
    () => {
      // Changement au milieu de la transition (0.5) pour plus de réactivité
      const currentSlide = Math.floor(progress.value + 0.5);
      return currentSlide;
    },
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        const newIndex = currentValue % data.length;
        runOnJS(changeIndexWithAnimation)(newIndex);
      }
    },
    [data.length, changeIndexWithAnimation]
  );

  const handlePatientChoice = () => {
    router.push('/pre-intake');
  };

  // Style animé pour le texte
  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

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
          onSnapToItem={onSnapToItem}
          renderItem={({ item }) => (
            <View style={styles.carouselItem}>
              <Image source={item.image} style={styles.carouselImage} />
            </View>
          )}
          autoPlay={true}
          autoPlayInterval={3000}
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
        
        {/* Texte descriptif */}
        <Animated.View style={[styles.textSection, animatedTextStyle]}>
          <Text style={styles.slideTitle}>
            {data[currentIndex]?.title}
          </Text>
          <Text style={styles.slideDescription}>
            {data[currentIndex]?.description}
          </Text>
        </Animated.View>
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
    paddingTop: Dimensions.get('window').height * 0.15,
  },
  carouselItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
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
    marginBottom: 10,
  },
  textSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 80,
    justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 18,
    fontFamily: 'NotoIkea',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideDescription: {
    fontSize: 14,
    fontFamily: 'NotoIkea',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSection: {
    backgroundColor: 'white',
    paddingTop: 20,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  button: {
    padding: 20,
    borderRadius: 50,
    alignItems: 'center',
  },
  patientButton: {
    backgroundColor: '#000000',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'NotoIkea',
    marginBottom: 5,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'NotoIkea',
    fontWeight: 'bold',
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
    fontFamily: 'NotoIkea',
    color: '#666',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});