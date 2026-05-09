// ============================================================
// src/screens/buyer/ProductDetailScreen.js
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { WhatsAppButton } from '../../components/components';
import { StarRating } from '../../components/components';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [prodRes, reviewsRes] = await Promise.all([
          client.get(`/products/${productId}`),
          client.get(`/reviews?product_id=${productId}`),
        ]);
        setProduct(prodRes.data.product);
        setSeller(prodRes.data.seller);
        setReviews(reviewsRes.data.reviews || []);

        // Track view
        client.post('/analytics/track', {
          entity_type: 'product',
          entity_id: productId,
          interaction_type: 'view',
        }).catch(() => {});
      } catch (err) {
        console.log('Error loading product:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loading}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const images = product.images || [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageCarousel}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
                )}
                keyExtractor={(_, i) => String(i)}
              />
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={styles.placeholderIcon}>📦</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Product Info */}
          <View style={styles.infoCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>Le {parseFloat(product.price).toLocaleString()}</Text>
              {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                <View style={styles.stockBadge}>
                  <Text style={styles.stockText}>⚠️ Only {product.stock_quantity} left</Text>
                </View>
              )}
              {product.stock_quantity === 0 && (
                <View style={[styles.stockBadge, styles.outBadge]}>
                  <Text style={[styles.stockText, { color: Colors.error }]}>Out of stock</Text>
                </View>
              )}
            </View>
            <Text style={styles.productName}>{product.name}</Text>

            {/* Rating summary */}
            {reviews.length > 0 && (
              <View style={styles.ratingRow}>
                <StarRating value={Math.round(avgRating)} size={16} />
                <Text style={styles.ratingText}>
                  {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </Text>
              </View>
            )}

            {product.category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{product.category}</Text>
              </View>
            )}

            {product.description && (
              <Text style={styles.description}>{product.description}</Text>
            )}
          </View>

          {/* Seller Card */}
          {seller && (
            <View style={styles.sellerCard}>
              <Text style={styles.sectionTitle}>Sold by</Text>
              <View style={styles.sellerRow}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>
                    {seller.business_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{seller.business_name}</Text>
                  <View style={styles.verifiedRow}>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ Verified</Text>
                    </View>
                    {seller.rating > 0 && (
                      <Text style={styles.sellerRating}>⭐ {parseFloat(seller.rating).toFixed(1)}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* WhatsApp Contact */}
          {seller?.whatsapp_number && (
            <View style={styles.waSection}>
              <WhatsAppButton
                phone={seller.whatsapp_number}
                entityType="product"
                entityId={product.id}
                productName={product.name}
                sellerName={seller.business_name}
              />
            </View>
          )}

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
            ) : (
              reviews.slice(0, 5).map(review => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <StarRating value={review.rating} size={14} />
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute', top: 50, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    ...Shadows.md,
  },
  backText: { fontSize: 20, color: Colors.primary, fontWeight: '700' },
  imageCarousel: { width, height: width, backgroundColor: Colors.borderLight },
  mainImage: { width, height: width },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 80 },
  dots: { position: 'absolute', bottom: 16, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  body: { padding: Spacing.xl, gap: Spacing.base },
  infoCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  price: { fontSize: Typography.xxl, fontWeight: '900', color: Colors.primary },
  stockBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  outBadge: { backgroundColor: '#FEE2E2' },
  stockText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.warning },
  productName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, lineHeight: 26 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  ratingText: { fontSize: Typography.sm, color: Colors.textSecondary },
  categoryChip: {
    alignSelf: 'flex-start', backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginTop: Spacing.sm,
  },
  categoryText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.primary },
  description: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22, marginTop: Spacing.base },
  sellerCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerAvatarText: { color: Colors.white, fontSize: Typography.lg, fontWeight: '800' },
  sellerName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  verifiedBadge: { backgroundColor: Colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  verifiedText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  sellerRating: { fontSize: Typography.sm, color: Colors.textSecondary },
  waSection: { },
  reviewsSection: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.sm },
  noReviews: { fontSize: Typography.sm, color: Colors.textMuted, fontStyle: 'italic' },
  reviewCard: {
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewDate: { fontSize: Typography.xs, color: Colors.textMuted },
  reviewComment: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
});


// ============================================================
// src/screens/buyer/SearchScreen.js
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import ListingCard from '../../components/ListingCard';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const TABS = ['Products', 'Sellers', 'Services'];

export function SearchScreen({ route, navigation }) {
  const [query, setQuery] = useState(route.params?.query || '');
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const endpoints = [
        `/products?search=${encodeURIComponent(q)}`,
        `/sellers?search=${encodeURIComponent(q)}`,
        `/providers?search=${encodeURIComponent(q)}`,
      ];
      const res = await client.get(endpoints[activeTab]);
      const key = ['products', 'sellers', 'providers'][activeTab];
      setResults(res.data[key] || []);
    } catch (err) {
      console.log('Search error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  const handleTabChange = (idx) => {
    setActiveTab(idx);
    setResults([]);
    if (query) doSearch();
  };

  const navigateToItem = (item) => {
    if (activeTab === 0) navigation.navigate('ProductDetail', { productId: item.id });
    else if (activeTab === 1) navigation.navigate('ProductDetail', { sellerId: item.id });
    else navigation.navigate('ProviderDetail', { providerId: item.id });
  };

  return (
    <SafeAreaView style={sStyles.container}>
      {/* Search Header */}
      <View style={sStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={sStyles.backBtn}>
          <Text style={sStyles.backText}>←</Text>
        </TouchableOpacity>
        <View style={sStyles.inputWrap}>
          <Text style={sStyles.searchIcon}>🔍</Text>
          <TextInput
            style={sStyles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, sellers, services..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => doSearch()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Text style={sStyles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={sStyles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} style={[sStyles.tab, activeTab === i && sStyles.tabActive]} onPress={() => handleTabChange(i)}>
            <Text style={[sStyles.tabText, activeTab === i && sStyles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={sStyles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : !searched ? (
        <View style={sStyles.center}>
          <Text style={sStyles.hint}>Search for products, sellers, or service providers</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={sStyles.center}>
          <Text style={sStyles.emptyIcon}>🔍</Text>
          <Text style={sStyles.emptyTitle}>No results found</Text>
          <Text style={sStyles.emptySubtitle}>Try different keywords or explore another category</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={activeTab === 0 ? 2 : 1}
          key={activeTab}
          columnWrapperStyle={activeTab === 0 ? { gap: Spacing.md } : undefined}
          contentContainerStyle={sStyles.list}
          renderItem={({ item }) => (
            activeTab === 0 ? (
              <ListingCard item={item} type="product" onPress={() => navigateToItem(item)} style={{ flex: 1 }} />
            ) : (
              <TouchableOpacity style={sStyles.listItem} onPress={() => navigateToItem(item)}>
                <View style={sStyles.listAvatar}>
                  <Text style={sStyles.listAvatarText}>
                    {(item.business_name || item.full_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sStyles.listName}>{item.business_name || item.full_name}</Text>
                  <Text style={sStyles.listSub} numberOfLines={1}>
                    {item.location_label || item.services_offered?.join(', ') || ''}
                  </Text>
                  {item.rating > 0 && <Text style={sStyles.listRating}>⭐ {parseFloat(item.rating).toFixed(1)}</Text>}
                </View>
                <View style={sStyles.verifiedBadge}>
                  <Text style={sStyles.verifiedText}>✓</Text>
                </View>
              </TouchableOpacity>
            )
          )}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const sStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.primary },
  backBtn: { padding: 6 },
  backText: { color: Colors.white, fontSize: Typography.xl, fontWeight: '700' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  input: { flex: 1, paddingVertical: 10, fontSize: Typography.base, color: Colors.textPrimary },
  clearIcon: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sm, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  hint: { fontSize: Typography.base, color: Colors.textMuted, textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: Spacing.xl, gap: Spacing.md },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  listAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  listAvatarText: { color: Colors.white, fontSize: Typography.lg, fontWeight: '800' },
  listName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  listSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  listRating: { fontSize: Typography.xs, marginTop: 4 },
  verifiedBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
});

export default SearchScreen;
