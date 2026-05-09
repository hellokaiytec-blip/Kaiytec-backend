// ============================================================
// src/screens/seller/AddProductScreen.js
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const CATEGORIES = ['Food & Groceries', 'Electronics', 'Clothing & Fashion', 'Furniture', 'Beauty', 'Agriculture', 'Books', 'Other'];

export default function AddProductScreen({ route, navigation }) {
  const existingProduct = route.params?.product;
  const isEditing = !!existingProduct;

  const [form, setForm] = useState({
    name: existingProduct?.name || '',
    description: existingProduct?.description || '',
    price: existingProduct?.price?.toString() || '',
    cost_price: existingProduct?.cost_price?.toString() || '',
    stock_quantity: existingProduct?.stock_quantity?.toString() || '',
    category: existingProduct?.category || '',
  });
  const [images, setImages] = useState(existingProduct?.images || []);
  const [newImages, setNewImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickImages = async () => {
    if (images.length + newImages.length >= 4) {
      return Alert.alert('Max 4 images', 'You can upload up to 4 product photos.');
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 4 - images.length - newImages.length,
    });
    if (!res.canceled) {
      setNewImages(prev => [...prev, ...res.assets].slice(0, 4));
    }
  };

  const removeImage = (index, isNew) => {
    if (isNew) setNewImages(prev => prev.filter((_, i) => i !== index));
    else setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) {
      return Alert.alert('Missing info', 'Product name and price are required.');
    }
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      return Alert.alert('Invalid price', 'Please enter a valid price.');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));

      // Add existing image URLs
      images.forEach((url, i) => formData.append(`existing_images[${i}]`, url));

      // Add new image files
      newImages.forEach((img, i) => {
        formData.append('images', {
          uri: img.uri,
          name: `product_${i}.jpg`,
          type: 'image/jpeg',
        });
      });

      if (isEditing) {
        await client.put(`/products/${existingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Updated!', 'Product has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await client.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('🎉 Product Listed!', 'Your product is now live on the marketplace.', [
          { text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') },
        ]);
      }
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const allImages = [
    ...images.map(uri => ({ uri, isNew: false })),
    ...newImages.map(img => ({ uri: img.uri, isNew: true, newIndex: newImages.indexOf(img) })),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Photos (max 4)</Text>
          <View style={styles.imageGrid}>
            {allImages.map((img, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                <TouchableOpacity
                  style={styles.removeImg}
                  onPress={() => removeImage(img.isNew ? img.newIndex : i, img.isNew)}
                >
                  <Text style={styles.removeImgText}>✕</Text>
                </TouchableOpacity>
                {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
              </View>
            ))}
            {allImages.length < 4 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Text style={styles.addImageIcon}>📷</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <Field label="Product Name *" value={form.name} onChange={v => update('name', v)} placeholder="e.g. Women's Summer Dress" />
          <Field label="Description" value={form.description} onChange={v => update('description', v)} placeholder="Describe your product..." multiline />

          {/* Category picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, form.category === cat && styles.catChipActive]}
                  onPress={() => update('category', cat)}
                >
                  <Text style={[styles.catText, form.category === cat && styles.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Pricing & Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Inventory</Text>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field label="Selling Price (Le) *" value={form.price} onChange={v => update('price', v)} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Cost Price (Le)" value={form.cost_price} onChange={v => update('cost_price', v)} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
          <Field label="Stock Quantity" value={form.stock_quantity} onChange={v => update('stock_quantity', v)} placeholder="0" keyboardType="numeric" />

          {form.price && form.cost_price && (
            <View style={styles.marginCard}>
              <Text style={styles.marginLabel}>Estimated Margin</Text>
              <Text style={styles.marginValue}>
                Le {(parseFloat(form.price || 0) - parseFloat(form.cost_price || 0)).toLocaleString()}
                {' '}({Math.round(((parseFloat(form.price || 0) - parseFloat(form.cost_price || 0)) / parseFloat(form.price || 1)) * 100)}%)
              </Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>{isEditing ? 'Update Product' : '🚀 List Product'}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backText: { color: Colors.white, fontSize: Typography.xl, fontWeight: '700', width: 40 },
  headerTitle: { color: Colors.white, fontSize: Typography.md, fontWeight: '800' },
  scroll: { padding: Spacing.xl },
  section: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl,
    marginBottom: Spacing.base, ...Shadows.sm,
  },
  sectionTitle: { fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  imageThumb: { width: 80, height: 80, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImg: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  removeImgText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  mainBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,61,42,0.8)', padding: 2,
  },
  mainBadgeText: { color: Colors.white, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  addImageBtn: {
    width: 80, height: 80, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addImageIcon: { fontSize: 24 },
  addImageText: { fontSize: 9, color: Colors.textMuted, fontWeight: '500' },
  field: { marginBottom: Spacing.md },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: Typography.base, color: Colors.textPrimary, backgroundColor: Colors.offWhite,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  catScroll: { marginTop: 4 },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: Spacing.sm, backgroundColor: Colors.offWhite,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSecondary },
  catTextActive: { color: Colors.white },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  marginCard: {
    backgroundColor: Colors.primarySoft, borderRadius: Radius.md,
    padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: Spacing.sm,
  },
  marginLabel: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  marginValue: { fontSize: Typography.base, color: Colors.primary, fontWeight: '800' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', ...Shadows.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: Typography.base, fontWeight: '800' },
});


// ============================================================
// src/screens/provider/ProviderDashboard.js
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { StarRating } from '../../components/components';

export default function ProviderDashboard({ navigation }) {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetch = async () => {
    try {
      const res = await client.get('/providers/me');
      setProvider(res.data.provider);
    } catch (err) {
      if (err.response?.status === 403) navigation.replace('ProviderRegister');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const toggleAvailability = async () => {
    if (!provider) return;
    setToggling(true);
    try {
      await client.patch('/providers/me/availability', { is_available: !provider.is_available });
      setProvider(p => ({ ...p, is_available: !p.is_available }));
    } catch (err) { console.log(err.message); }
    finally { setToggling(false); }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (!provider) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Dashboard</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={Colors.primary} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>{provider.full_name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{provider.full_name}</Text>
          <Text style={styles.profileServices}>{provider.services_offered?.join(' · ')}</Text>

          <View style={[styles.statusBadge, provider.is_available ? styles.statusAvail : styles.statusBusy]}>
            <View style={[styles.statusDot, { backgroundColor: provider.is_available ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{provider.is_available ? 'Available' : 'Not Available'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.total_views || 0}</Text>
            <Text style={styles.statLabel}>Profile Views</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.total_whatsapp_clicks || 0}</Text>
            <Text style={styles.statLabel}>WA Contacts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{parseFloat(provider.rating || 0).toFixed(1)}⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Availability Toggle */}
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>Availability Status</Text>
            <Text style={styles.toggleSubtitle}>
              {provider.is_available
                ? 'You\'re visible to buyers. Toggle off when busy.'
                : 'You\'re hidden. Toggle on when ready for work.'}
            </Text>
          </View>
          <Switch
            value={provider.is_available}
            onValueChange={toggleAvailability}
            trackColor={{ false: '#D1D5DB', true: Colors.primary }}
            thumbColor={Colors.white}
            disabled={toggling}
          />
        </View>

        {/* Rating Display */}
        {provider.review_count > 0 && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Your Rating</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingBig}>{parseFloat(provider.rating || 0).toFixed(1)}</Text>
              <View>
                <StarRating value={Math.round(provider.rating || 0)} size={20} />
                <Text style={styles.ratingCount}>Based on {provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Completeness */}
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>Profile Completeness</Text>
          {[
            { label: 'Full Name', done: !!provider.full_name },
            { label: 'Services Listed', done: provider.services_offered?.length > 0 },
            { label: 'WhatsApp Number', done: !!provider.whatsapp_number },
            { label: 'Bio / Description', done: !!provider.bio },
            { label: 'Location Set', done: !!provider.location_lat },
          ].map(item => (
            <View key={item.label} style={styles.checkRow}>
              <Text style={styles.checkIcon}>{item.done ? '✅' : '⭕'}</Text>
              <Text style={[styles.checkLabel, !item.done && styles.checkLabelPending]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
  headerTitle: { color: Colors.white, fontSize: Typography.lg, fontWeight: '800' },
  profileCard: {
    backgroundColor: Colors.white, margin: Spacing.xl, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center', ...Shadows.sm,
  },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  avatarText: { color: Colors.white, fontSize: Typography.xxl, fontWeight: '900' },
  profileName: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary },
  profileServices: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, marginTop: Spacing.md,
  },
  statusAvail: { backgroundColor: '#D1FAE5' },
  statusBusy: { backgroundColor: '#FEE2E2' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm, marginBottom: Spacing.base,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: Typography.xl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  toggleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: Spacing.xl, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.sm, marginBottom: Spacing.base,
  },
  toggleTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  toggleSubtitle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, maxWidth: '80%' },
  ratingCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.xl, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.sm, marginBottom: Spacing.base,
  },
  ratingTitle: { fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  ratingBig: { fontSize: 48, fontWeight: '900', color: Colors.primary },
  ratingCount: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  completeCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.xl, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.sm,
  },
  completeTitle: { fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  checkIcon: { fontSize: 18 },
  checkLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textPrimary },
  checkLabelPending: { color: Colors.textMuted },
});
