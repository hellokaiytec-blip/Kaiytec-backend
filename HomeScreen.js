// ============================================================
// src/screens/buyer/HomeScreen.js
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import ListingCard from '../../components/ListingCard';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌍' },
  { id: 'food', label: 'Food', icon: '🍎' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'clothing', label: 'Clothing', icon: '👗' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, sellersRes] = await Promise.all([
        client.get('/products', { params: { category: category !== 'all' ? category : undefined } }),
        client.get('/sellers', { params: { limit: 10 } }),
      ]);
      setProducts(productsRes.data.products || []);
      setSellers(sellersRes.data.sellers || []);
    } catch (err) {
      console.log('Home fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSearch = () => {
    navigation.navigate('Search', { query: searchQuery });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.tagline}>Discover trusted sellers nearby</Text>
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.mapBtnText}>📍 Map</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={handleSearch} activeOpacity={0.7}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Search products, sellers, services...</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, category === cat.id && styles.catChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Verified Sellers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Verified Sellers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search', { type: 'sellers' })}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sellers.map(seller => (
              <TouchableOpacity
                key={seller.id}
                style={styles.sellerCard}
                onPress={() => navigation.navigate('Search', { sellerId: seller.id })}
              >
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>
                    {seller.business_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.sellerName} numberOfLines={1}>{seller.business_name}</Text>
                <View style={styles.sellerRating}>
                  <Text style={styles.star}>⭐</Text>
                  <Text style={styles.ratingText}>{parseFloat(seller.rating).toFixed(1)}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {category === 'all' ? '🔥 Latest Products' : `${CATEGORIES.find(c=>c.id===category)?.icon} ${CATEGORIES.find(c=>c.id===category)?.label}`}
          </Text>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>Check back soon or explore other categories</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {products.map(product => (
                <ListingCard
                  key={product.id}
                  item={product}
                  type="product"
                  onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                  style={styles.gridCard}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    backgroundColor: Colors.primary,
  },
  greeting: { fontSize: Typography.lg, fontWeight: '700', color: Colors.white },
  tagline: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  mapBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: Spacing.base, paddingVertical: 8,
  },
  mapBtnText: { color: Colors.white, fontWeight: '600', fontSize: Typography.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.xl, marginTop: Spacing.base,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    ...Shadows.md,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchPlaceholder: { fontSize: Typography.base, color: Colors.textMuted },
  categories: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catIcon: { fontSize: 15 },
  catLabel: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSecondary },
  catLabelActive: { color: Colors.white, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  seeAll: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  sellerCard: {
    width: 110, backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, marginRight: Spacing.md, alignItems: 'center',
    ...Shadows.sm,
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  sellerAvatarText: { color: Colors.white, fontSize: Typography.lg, fontWeight: '800' },
  sellerName: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  sellerRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  star: { fontSize: 11 },
  ratingText: { fontSize: Typography.xs, color: Colors.textSecondary, marginLeft: 2 },
  verifiedBadge: {
    marginTop: 6, backgroundColor: Colors.primarySoft,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm,
  },
  verifiedText: { fontSize: 9, color: Colors.primary, fontWeight: '700' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridCard: { width: '47%' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
});
