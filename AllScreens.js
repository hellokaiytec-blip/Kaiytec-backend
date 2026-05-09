// ============================================================
// src/screens/buyer/MapScreen.js
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'sellers', 'providers'

  useEffect(() => {
    initMap();
  }, []);

  const initMap = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location access to see nearby sellers on the map.',
          [{ text: 'OK' }]
        );
        // Use Freetown, Sierra Leone as default
        setLocation({ latitude: 8.4657, longitude: -13.2317 });
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }

      // Fetch all sellers and providers with locations
      const [sellersRes, providersRes] = await Promise.all([
        client.get('/sellers?limit=100'),
        client.get('/providers?limit=100'),
      ]);
      setSellers(sellersRes.data.sellers?.filter(s => s.location_lat && s.location_lng) || []);
      setProviders(providersRes.data.providers?.filter(p => p.location_lat && p.location_lng) || []);
    } catch (err) {
      console.log('Map init error:', err.message);
      setLocation({ latitude: 8.4657, longitude: -13.2317 }); // Freetown default
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location, latitudeDelta: 0.05, longitudeDelta: 0.05,
      }, 500);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  const visibleSellers = filter !== 'providers' ? sellers : [];
  const visibleProviders = filter !== 'sellers' ? providers : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 8.4657,
          longitude: location?.longitude || -13.2317,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Seller Markers */}
        {visibleSellers.map(seller => (
          <Marker
            key={`s-${seller.id}`}
            coordinate={{
              latitude: parseFloat(seller.location_lat),
              longitude: parseFloat(seller.location_lng),
            }}
            pinColor={Colors.primary}
          >
            <View style={styles.sellerPin}>
              <Text style={styles.pinIcon}>🏪</Text>
            </View>
            <Callout onPress={() => navigation.navigate('ProductDetail', { sellerId: seller.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{seller.business_name}</Text>
                <Text style={styles.calloutSub}>⭐ {parseFloat(seller.rating || 0).toFixed(1)} · Tap to view</Text>
                <View style={styles.calloutBadge}>
                  <Text style={styles.calloutBadgeText}>✓ Verified Seller</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Provider Markers */}
        {visibleProviders.map(provider => (
          <Marker
            key={`p-${provider.id}`}
            coordinate={{
              latitude: parseFloat(provider.location_lat),
              longitude: parseFloat(provider.location_lng),
            }}
          >
            <View style={[styles.sellerPin, styles.providerPin]}>
              <Text style={styles.pinIcon}>🔧</Text>
            </View>
            <Callout onPress={() => navigation.navigate('ProviderDetail', { providerId: provider.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{provider.full_name}</Text>
                <Text style={styles.calloutSub}>{provider.services_offered?.[0]}</Text>
                <Text style={styles.calloutSub}>{provider.is_available ? '🟢 Available' : '🔴 Busy'}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {['all', 'sellers', 'providers'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? '🌍 All' : f === 'sellers' ? '🏪 Sellers' : '🔧 Services'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Center button */}
      <TouchableOpacity style={styles.centerBtn} onPress={centerOnUser}>
        <Text style={styles.centerBtnText}>📍</Text>
      </TouchableOpacity>

      {/* Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {visibleSellers.length + visibleProviders.length} nearby
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.base, color: Colors.textSecondary },
  map: { flex: 1 },
  sellerPin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary, ...Shadows.md,
  },
  providerPin: { borderColor: Colors.accent },
  pinIcon: { fontSize: 20 },
  callout: { padding: Spacing.sm, minWidth: 160 },
  calloutName: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  calloutSub: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  calloutBadge: {
    marginTop: 6, backgroundColor: Colors.primarySoft,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm, alignSelf: 'flex-start',
  },
  calloutBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  filterRow: {
    position: 'absolute', top: 60, left: Spacing.base, right: Spacing.base,
    flexDirection: 'row', gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.white, ...Shadows.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  centerBtn: {
    position: 'absolute', bottom: 100, right: Spacing.xl,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadows.lg,
  },
  centerBtnText: { fontSize: 22 },
  counter: {
    position: 'absolute', bottom: 100, left: Spacing.xl,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, ...Shadows.md,
  },
  counterText: { color: Colors.white, fontSize: Typography.sm, fontWeight: '700' },
});


// ============================================================
// src/screens/seller/SellerRegisterScreen.js
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import client from '../../api/client';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export function SellerRegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    business_name: '', business_address: '', description: '', whatsapp_number: '',
  });
  const [govtId, setGovtId] = useState(null);
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickImage = async (setter) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled) setter(res.assets[0]);
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Enable location access to use GPS.');
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    const geocode = await Location.reverseGeocodeAsync(loc.coords);
    if (geocode[0]) {
      setLocationLabel(`${geocode[0].street || ''} ${geocode[0].city || ''}, ${geocode[0].country || ''}`.trim());
    }
  };

  const handleSubmit = async () => {
    if (!form.business_name || !form.business_address) {
      return Alert.alert('Missing info', 'Please fill in business name and address.');
    }
    if (!govtId || !passportPhoto) {
      return Alert.alert('Documents required', 'Please upload your Government ID and passport photo for verification.');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (coords) {
        formData.append('location_lat', coords.lat);
        formData.append('location_lng', coords.lng);
        formData.append('location_label', locationLabel);
      }
      formData.append('government_id', {
        uri: govtId.uri, name: 'govt_id.jpg', type: 'image/jpeg',
      });
      formData.append('passport_photo', {
        uri: passportPhoto.uri, name: 'passport.jpg', type: 'image/jpeg',
      });

      await client.post('/sellers/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        '✅ Application Submitted!',
        'Your seller application is under review. We\'ll notify you once approved (usually within 24 hours).',
        [{ text: 'OK', onPress: () => navigation.replace('SellerTabs') }]
      );
    } catch (err) {
      Alert.alert('Submission Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}><Text style={{ fontSize: 32 }}>🏪</Text></View>
          <Text style={styles.title}>Become a Seller</Text>
          <Text style={styles.subtitle}>
            Complete your profile to start selling on Kaiytec.
            All sellers are verified for buyer trust.
          </Text>
        </View>

        {/* Steps indicator */}
        <View style={styles.stepsRow}>
          {['Business Info', 'Documents', 'Location'].map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepDot}><Text style={styles.stepNum}>{i + 1}</Text></View>
              <Text style={styles.stepLabel}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          {[
            { key: 'business_name', label: 'Business Name *', placeholder: 'e.g. Fatima\'s Fashion Store' },
            { key: 'business_address', label: 'Business Address *', placeholder: 'e.g. 12 Siaka Stevens Street, Freetown' },
            { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+232 76 000 000' },
          ].map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          ))}
          <View style={styles.field}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={v => update('description', v)}
              placeholder="Tell buyers what you sell and what makes you special..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Document Uploads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification</Text>
          <Text style={styles.sectionSubtitle}>
            Required for seller approval. Documents are reviewed by our admin team only.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Government ID (NIC, Passport, Driver's License) *</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setGovtId)}>
              {govtId ? (
                <Image source={{ uri: govtId.uri }} style={styles.uploadPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>📄</Text>
                  <Text style={styles.uploadText}>Tap to upload Government ID</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Passport-style Photo *</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setPassportPhoto)}>
              {passportPhoto ? (
                <Image source={{ uri: passportPhoto.uri }} style={styles.uploadPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>🤳</Text>
                  <Text style={styles.uploadText}>Tap to upload your photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Location</Text>
          <TouchableOpacity style={styles.gpsBtn} onPress={getLocation}>
            <Text style={styles.gpsBtnIcon}>📍</Text>
            <Text style={styles.gpsBtnText}>Use My Current Location</Text>
          </TouchableOpacity>
          {locationLabel ? (
            <View style={styles.locationConfirm}>
              <Text style={styles.locationIcon}>✅</Text>
              <Text style={styles.locationText}>{locationLabel}</Text>
            </View>
          ) : null}
          <TextInput
            style={[styles.input, { marginTop: Spacing.sm }]}
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Or type your location manually"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>Submit Application →</Text>
          }
        </TouchableOpacity>

        <Text style={styles.reviewNote}>
          ⏱ Review typically takes 24–48 hours. You'll be notified once approved.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { padding: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  headerIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  step: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepNum: { color: Colors.white, fontWeight: '800', fontSize: Typography.sm },
  stepLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  section: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl,
    marginBottom: Spacing.base, ...Shadows.sm,
  },
  sectionTitle: { fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sectionSubtitle: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 18 },
  field: { marginBottom: Spacing.md },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: Typography.base, color: Colors.textPrimary, backgroundColor: Colors.offWhite,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  uploadBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    borderStyle: 'dashed', overflow: 'hidden',
  },
  uploadPlaceholder: { padding: Spacing.xl, alignItems: 'center' },
  uploadIcon: { fontSize: 36, marginBottom: 8 },
  uploadText: { fontSize: Typography.sm, color: Colors.textSecondary },
  uploadPreview: { width: '100%', height: 150, resizeMode: 'cover' },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primarySoft, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  gpsBtnIcon: { fontSize: 20 },
  gpsBtnText: { fontSize: Typography.base, fontWeight: '600', color: Colors.primary },
  locationConfirm: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.sm, padding: Spacing.md,
    backgroundColor: '#D1FAE5', borderRadius: Radius.md,
  },
  locationIcon: { fontSize: 18 },
  locationText: { fontSize: Typography.sm, color: '#065F46', flex: 1 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', ...Shadows.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: Typography.base, fontWeight: '800' },
  reviewNote: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});

export default SellerRegisterScreen;


// ============================================================
// src/screens/shared/ProfileScreen.js
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../store/authStore';
import client from '../../api/client';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, allowsEditing: true, aspect: [1, 1],
    });
    if (res.canceled) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri: res.assets[0].uri, name: 'avatar.jpg', type: 'image/jpeg' });
      const { data } = await client.put('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar_url: data.avatar_url });
    } catch (err) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const roleBadge = { buyer: '🛍 Buyer', seller: '🏪 Seller', provider: '🔧 Provider' }[user?.role] || user?.role;

  return (
    <SafeAreaView style={pStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={pStyles.header}>
          <TouchableOpacity onPress={handleAvatarUpload} style={pStyles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={pStyles.avatar} />
            ) : (
              <View style={pStyles.avatarPlaceholder}>
                <Text style={pStyles.avatarInitial}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={pStyles.editAvatar}>
              <Text style={pStyles.editAvatarIcon}>{uploading ? '⏳' : '📷'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={pStyles.name}>{user?.name}</Text>
          <Text style={pStyles.email}>{user?.email}</Text>
          <View style={pStyles.roleBadge}>
            <Text style={pStyles.roleText}>{roleBadge}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={pStyles.card}>
          <Text style={pStyles.cardTitle}>Account Details</Text>
          {[
            { label: 'Full Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone },
            { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
          ].map(item => (
            <View key={item.label} style={pStyles.infoRow}>
              <Text style={pStyles.infoLabel}>{item.label}</Text>
              <Text style={pStyles.infoValue}>{item.value || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={pStyles.card}>
          <Text style={pStyles.cardTitle}>Settings</Text>
          {[
            { icon: '✏️', label: 'Edit Profile' },
            { icon: '🔒', label: 'Change Password' },
            { icon: '🔔', label: 'Notifications' },
            { icon: '❓', label: 'Help & Support' },
            { icon: '📋', label: 'Terms of Service' },
            { icon: '🔐', label: 'Privacy Policy' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={pStyles.menuItem}>
              <Text style={pStyles.menuIcon}>{item.icon}</Text>
              <Text style={pStyles.menuLabel}>{item.label}</Text>
              <Text style={pStyles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={pStyles.logoutBtn} onPress={handleLogout}>
          <Text style={pStyles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={pStyles.version}>Kaiytec Marketplace v1.0.0</Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const pStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  header: { backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  avatarContainer: { position: 'relative', marginBottom: Spacing.base },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.white },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.white,
  },
  avatarInitial: { color: Colors.white, fontSize: Typography.xxl, fontWeight: '900' },
  editAvatar: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  editAvatarIcon: { fontSize: 14 },
  name: { fontSize: Typography.xl, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  email: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)' },
  roleBadge: {
    marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full,
  },
  roleText: { color: Colors.white, fontSize: Typography.sm, fontWeight: '600' },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl,
    margin: Spacing.xl, marginBottom: 0, ...Shadows.sm,
  },
  cardTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: Spacing.md },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  menuArrow: { fontSize: Typography.xl, color: Colors.textMuted },
  logoutBtn: {
    margin: Spacing.xl, backgroundColor: '#FEE2E2', borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  logoutText: { color: Colors.error, fontSize: Typography.base, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
});
