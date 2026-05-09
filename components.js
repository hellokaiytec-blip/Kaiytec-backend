// ============================================================
// src/components/ListingCard.js
// ============================================================
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import VerifiedBadge from './VerifiedBadge';

export default function ListingCard({ item, type, onPress, style }) {
  const image = item.images?.[0] || null;
  const name = type === 'product' ? item.name : item.business_name || item.full_name;
  const price = item.price ? `Le ${parseFloat(item.price).toLocaleString()}` : null;
  const service = item.services_offered?.[0] || null;
  const rating = parseFloat(item.rating) || 0;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>{type === 'product' ? '📦' : '🏪'}</Text>
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <VerifiedBadge />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>

        {price && (
          <Text style={styles.price}>{price}</Text>
        )}
        {service && !price && (
          <Text style={styles.service}>{service}</Text>
        )}

        {/* Rating */}
        {rating > 0 && (
          <View style={styles.ratingRow}>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            {item.review_count > 0 && (
              <Text style={styles.reviewCount}>({item.review_count})</Text>
            )}
          </View>
        )}

        {/* Low stock */}
        {type === 'product' && item.stock_quantity <= 5 && item.stock_quantity > 0 && (
          <Text style={styles.lowStock}>⚠️ Only {item.stock_quantity} left</Text>
        )}
        {type === 'product' && item.stock_quantity === 0 && (
          <Text style={styles.outOfStock}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  imageContainer: { position: 'relative', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 36 },
  badgeOverlay: { position: 'absolute', top: 8, left: 8 },
  content: { padding: Spacing.md },
  name: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  price: { fontSize: Typography.md, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  service: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  star: { fontSize: 11 },
  ratingText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textPrimary },
  reviewCount: { fontSize: Typography.xs, color: Colors.textMuted },
  lowStock: { fontSize: 10, color: Colors.warning, marginTop: 4, fontWeight: '600' },
  outOfStock: { fontSize: 10, color: Colors.error, marginTop: 4, fontWeight: '600' },
});

// ============================================================
// src/components/WhatsAppButton.js
// ============================================================
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert } from 'react-native';
import client from '../api/client';
import { Radius, Spacing, Typography } from '../theme';

export function WhatsAppButton({ phone, entityType, entityId, productName, sellerName }) {
  const handlePress = async () => {
    if (!phone) {
      return Alert.alert('Not Available', 'WhatsApp contact not set up for this listing.');
    }

    // Track interaction
    try {
      await client.post('/analytics/track', {
        entity_type: entityType,
        entity_id: entityId,
        interaction_type: 'whatsapp_click',
      });
    } catch (_) {}

    // Build pre-filled message
    const message = productName
      ? `Hi! I found your listing on Kaiytec Marketplace.\n\nProduct: *${productName}*\nSeller: ${sellerName || ''}\n\nIs this still available?`
      : `Hi! I found your profile on Kaiytec Marketplace and I'd like to enquire about your services.`;

    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to contact this seller.');
    }
  };

  return (
    <TouchableOpacity style={wStyles.btn} onPress={handlePress} activeOpacity={0.85}>
      <Text style={wStyles.icon}>💬</Text>
      <Text style={wStyles.text}>Contact on WhatsApp</Text>
    </TouchableOpacity>
  );
}

const wStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.xl, gap: 8,
  },
  icon: { fontSize: 20 },
  text: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});

// ============================================================
// src/components/VerifiedBadge.js
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme';

export function VerifiedBadge({ size = 'sm' }) {
  return (
    <View style={[vStyles.badge, size === 'lg' && vStyles.badgeLg]}>
      <Text style={[vStyles.text, size === 'lg' && vStyles.textLg]}>✓ Verified</Text>
    </View>
  );
}

const vStyles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeLg: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  textLg: { fontSize: 12 },
});

// ============================================================
// src/components/StarRating.js
// ============================================================
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export function StarRating({ value = 0, onChange, size = 24 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange?.(star)} disabled={!onChange}>
          <Text style={{ fontSize: size, opacity: star <= value ? 1 : 0.25 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================
// src/components/LoadingScreen.js
// ============================================================
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

export default function LoadingScreen() {
  return (
    <View style={lStyles.container}>
      <View style={lStyles.logo}>
        <Text style={lStyles.logoText}>K</Text>
      </View>
      <Text style={lStyles.name}>Kaiytec</Text>
      <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
    </View>
  );
}

const lStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: Colors.white, fontSize: 48, fontWeight: '900' },
  name: { color: Colors.white, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
});

export { WhatsAppButton, VerifiedBadge, StarRating };
