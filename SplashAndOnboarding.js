// ============================================================
// src/screens/auth/SplashScreen.js
// ============================================================
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography } from '../../theme';

export default function SplashScreen({ navigation }) {
  const scale = new Animated.Value(0.8);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { transform: [{ scale }], opacity }]}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>K</Text>
        </View>
        <Text style={styles.name}>Kaiytec</Text>
        <Text style={styles.tagline}>Marketplace</Text>
      </Animated.View>
      <Text style={styles.footer}>Trusted commerce for Africa 🌍</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { alignItems: 'center' },
  logo: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  logoLetter: { color: Colors.white, fontSize: 56, fontWeight: '900' },
  name: { color: Colors.white, fontSize: 38, fontWeight: '900', letterSpacing: 1 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '400', letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 },
  footer: {
    position: 'absolute', bottom: 48,
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
  },
});


// ============================================================
// src/screens/auth/OnboardingScreen.js
// ============================================================
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '🛍️',
    title: 'Shop with Confidence',
    subtitle: 'Browse verified sellers and service providers in your area. Every listing is checked and approved.',
    bg: Colors.primary,
  },
  {
    id: '2',
    icon: '🏪',
    title: 'Sell to Thousands',
    subtitle: 'List your products, track performance, and grow your business with our seller dashboard.',
    bg: '#1A3C6A',
  },
  {
    id: '3',
    icon: '💬',
    title: 'Connect via WhatsApp',
    subtitle: 'No complicated checkout. Contact sellers directly on WhatsApp and close deals fast.',
    bg: '#1A5C3A',
  },
  {
    id: '4',
    icon: '✅',
    title: 'Built on Trust',
    subtitle: 'Every seller is verified with government ID. Ratings from real buyers keep standards high.',
    bg: '#4A1A6A',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const next = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(prev => prev + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const skip = () => navigation.replace('Login');

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg, width }]}>
            <SafeAreaView style={styles.slideInner}>
              <TouchableOpacity style={styles.skipBtn} onPress={skip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </SafeAreaView>
          </View>
        )}
        keyExtractor={item => item.id}
      />

      {/* Bottom Controls */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started →' : 'Next →'}
          </Text>
        </TouchableOpacity>

        {/* Sign in link */}
        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.signinLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  slide: { flex: 1 },
  slideInner: { flex: 1, padding: Spacing.xl, paddingTop: 0 },
  skipBtn: { alignSelf: 'flex-end', padding: Spacing.md },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.base },
  iconContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 120 },
  title: {
    fontSize: Typography.xxl, fontWeight: '900', color: Colors.white,
    textAlign: 'center', lineHeight: 38, marginBottom: Spacing.base,
  },
  subtitle: {
    fontSize: Typography.base, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xxl,
  },
  bottom: {
    backgroundColor: Colors.white, padding: Spacing.xl,
    paddingBottom: 40, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', marginBottom: Spacing.md,
  },
  nextBtnText: { color: Colors.white, fontSize: Typography.base, fontWeight: '800' },
  signinRow: { flexDirection: 'row', justifyContent: 'center' },
  signinText: { fontSize: Typography.sm, color: Colors.textSecondary },
  signinLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '700' },
});
