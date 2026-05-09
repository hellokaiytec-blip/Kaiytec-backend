// src/screens/seller/SellerDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export default function SellerDashboard({ navigation }) {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await client.get('/products/seller/dashboard');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        // Not yet approved
        navigation.replace('SellerRegister');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const deleteProduct = async (id) => {
    Alert.alert('Delete Product', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/products/${id}`);
            fetchDashboard();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete product.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!data) return null;

  const { stats, products, lowStockAlerts, bestSelling } = data;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Dashboard</Text>
          <Text style={styles.headerSubtitle}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.addBtnText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor={Colors.primary} />}
      >
        {/* Stats Row */}
        <View style={styles.statsGrid}>
          <StatCard icon="📦" label="Products" value={stats?.total_products || 0} color={Colors.primary} />
          <StatCard icon="👁" label="Total Views" value={stats?.total_views || 0} color="#3B82F6" />
          <StatCard icon="💬" label="WA Clicks" value={stats?.total_clicks || 0} color="#25D366" />
          <StatCard icon="💰" label="Est. Revenue" value={`Le ${parseInt(stats?.est_revenue || 0).toLocaleString()}`} color={Colors.accent} small />
        </View>

        {/* Low Stock Alerts */}
        {lowStockAlerts?.length > 0 && (
          <View style={styles.alertSection}>
            <Text style={styles.alertHeader}>⚠️ Low Stock Alerts</Text>
            {lowStockAlerts.map(p => (
              <View key={p.id} style={styles.alertItem}>
                <Text style={styles.alertName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.alertQty}>{p.stock_quantity} left</Text>
              </View>
            ))}
          </View>
        )}

        {/* Best Selling */}
        {bestSelling?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Best Performing</Text>
            {bestSelling.slice(0, 3).map((p, i) => (
              <View key={p.id} style={styles.bestItem}>
                <View style={styles.bestRank}>
                  <Text style={styles.bestRankText}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bestName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.bestMeta}>{p.total_whatsapp_clicks} WA clicks · {p.total_views} views</Text>
                </View>
                <Text style={styles.bestPrice}>Le {parseFloat(p.price).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 All Products ({products?.length || 0})</Text>

          {products?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>Tap "+ Add Product" to list your first item</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddProduct')}>
                <Text style={styles.emptyBtnText}>Add Your First Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            products.map(product => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productMeta}>
                    Le {parseFloat(product.price).toLocaleString()} · Stock: {product.stock_quantity}
                  </Text>
                  <Text style={styles.productStats}>
                    {product.total_views} views · {product.total_whatsapp_clicks} clicks
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('AddProduct', { product })}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteProduct(product.id)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color, small }) {
  return (
    <View style={[sStyles.card, { borderTopColor: color }]}>
      <Text style={sStyles.icon}>{icon}</Text>
      <Text style={[sStyles.value, small && sStyles.valueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={sStyles.label}>{label}</Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderTopWidth: 3,
    ...Shadows.sm,
  },
  icon: { fontSize: 22, marginBottom: 6 },
  value: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary },
  valueSmall: { fontSize: Typography.sm },
  label: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 8,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.xl },
  alertSection: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    backgroundColor: '#FFF3DC', borderRadius: Radius.lg, padding: Spacing.base,
    borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  alertHeader: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  alertName: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },
  alertQty: { fontSize: Typography.sm, fontWeight: '700', color: Colors.warning },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.base },
  bestItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadows.sm,
  },
  bestRank: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  bestRankText: { fontSize: Typography.sm, fontWeight: '800', color: Colors.primary },
  bestName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  bestMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  bestPrice: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primary },
  productRow: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', ...Shadows.sm,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  productMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  productStats: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  productActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  editBtn: { backgroundColor: Colors.primarySoft, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  editBtnText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  emptyBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: 12,
  },
  emptyBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.base },
});
