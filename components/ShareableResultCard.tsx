/**
 * ShareableResultCard
 *
 * Off-screen "milestone card" (Duolingo/Spotify-Wrapped style) rendered at a
 * fixed pixel size so it captures cleanly regardless of the host screen's
 * live layout. Never shown inline — mount it off-screen (see
 * `utils/shareCard.ts`) and capture it with `react-native-view-shot`.
 *
 * Two variants share one visual language:
 *  - "points": Points Calculator result (visa subclass + total score)
 *  - "occupation": ANZSCO occupation detail (title/code + nomination status)
 */
import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors as DarkColors } from '../constants/theme';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 480;

export interface PointsShareData {
  kind: 'points';
  visaSubclass: '189' | '190' | '491';
  total: number;
  eligible: boolean;
  threshold?: number;
}

export interface OccupationShareData {
  kind: 'occupation';
  anzsco: string;
  name: string;
  nominationStatus: string; // e.g. "Eligible for EOI (190 / 491)"
  openStatesCount?: number;
  totalStatesCount?: number;
}

export type ShareCardData = PointsShareData | OccupationShareData;

function formattedDate(): string {
  return new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const ShareableResultCard = forwardRef<View, { data: ShareCardData; appVersion?: string }>(
  ({ data, appVersion }, ref) => {
    return (
      <View ref={ref} collapsable={false} style={styles.root}>
        <LinearGradient
          colors={['#001224', '#002D62', '#001224']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header: brand badge + date/version */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <Image source={require('../assets/icon.png')} style={styles.badgeIcon} resizeMode="contain" />
              <Text style={styles.badgeText}>MigrateAU</Text>
            </View>
            <Text style={styles.metaText}>
              {formattedDate()}
              {appVersion ? ` • v${appVersion}` : ''}
            </Text>
          </View>

          {/* Core metrics */}
          <View style={styles.metricsArea}>
            {data.kind === 'points' ? (
              <PointsMetrics data={data} />
            ) : (
              <OccupationMetrics data={data} />
            )}
          </View>

          {/* Call-to-action footer */}
          <View style={styles.ctaFooter}>
            <Text style={styles.ctaText}>
              Estimate your Australian PR points & track rounds on MigrateAU
            </Text>
            <View style={styles.linkRow}>
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>QR</Text>
              </View>
              <Text style={styles.linkText}>migrateau.app/get</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }
);
ShareableResultCard.displayName = 'ShareableResultCard';

function PointsMetrics({ data }: { data: PointsShareData }) {
  const threshold = data.threshold ?? 65;
  const color = data.eligible ? DarkColors.success : DarkColors.warning;
  return (
    <>
      <View style={[styles.visaPill, { borderColor: color }]}>
        <Text style={[styles.visaPillText, { color }]}>Subclass {data.visaSubclass}</Text>
      </View>
      <Text style={styles.bigScore}>{data.total}</Text>
      <Text style={styles.bigScoreLabel}>Total Points</Text>
      <View style={[styles.statusChip, { backgroundColor: `${color}22`, borderColor: color }]}>
        <Text style={[styles.statusChipText, { color }]}>
          {data.eligible ? `✓ Above ${threshold}pt threshold` : `${threshold - data.total} pts to ${threshold}`}
        </Text>
      </View>
    </>
  );
}

function OccupationMetrics({ data }: { data: OccupationShareData }) {
  return (
    <>
      <View style={[styles.visaPill, { borderColor: DarkColors.accent }]}>
        <Text style={[styles.visaPillText, { color: DarkColors.accent }]}>ANZSCO {data.anzsco}</Text>
      </View>
      <Text style={styles.occTitle} numberOfLines={3}>
        {data.name}
      </Text>
      <View style={[styles.statusChip, { backgroundColor: `${DarkColors.success}22`, borderColor: DarkColors.success }]}>
        <Text style={[styles.statusChipText, { color: DarkColors.success }]} numberOfLines={2}>
          {data.nominationStatus}
        </Text>
      </View>
      {data.openStatesCount !== undefined && data.totalStatesCount !== undefined && (
        <Text style={styles.subMetric}>
          Eligible for EOI in {data.openStatesCount} of {data.totalStatesCount} states
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  badgeText: {
    color: '#EDF2FF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  metaText: {
    color: '#7A9BBF',
    fontSize: 11,
    fontWeight: '500',
  },
  metricsArea: {
    alignItems: 'center',
    gap: 10,
  },
  visaPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  visaPillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bigScore: {
    color: '#EDF2FF',
    fontSize: 72,
    fontWeight: '800',
    marginTop: 8,
  },
  bigScoreLabel: {
    color: '#7A9BBF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  occTitle: {
    color: '#EDF2FF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  statusChip: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  subMetric: {
    color: '#7A9BBF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  ctaFooter: {
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 16,
  },
  ctaText: {
    color: '#EDF2FF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    color: '#EDF2FF',
    fontSize: 7,
    fontWeight: '700',
  },
  linkText: {
    color: '#FFCD00',
    fontSize: 13,
    fontWeight: '700',
  },
});

export { CARD_WIDTH, CARD_HEIGHT };
