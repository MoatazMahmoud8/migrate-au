import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type SearchItem = {
  id: string;
  category: 'visa' | 'state' | 'tool' | 'occupation';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: 'route' | 'url';
  target: string;
};

const INDEX: SearchItem[] = [
  // Visas
  { id: 'v189', category: 'visa', title: 'Subclass 189 — Skilled Independent', subtitle: 'Permanent · No sponsorship · 65+ pts', icon: 'globe-outline', color: Colors.accent, action: 'route', target: '/(tabs)/calculator' },
  { id: 'v190', category: 'visa', title: 'Subclass 190 — Skilled Nominated', subtitle: 'Permanent · State sponsored · +5 pts', icon: 'location-outline', color: Colors.accent, action: 'route', target: '/(tabs)/calculator' },
  { id: 'v491', category: 'visa', title: 'Subclass 491 — Regional', subtitle: 'Provisional · Regional · +15 pts', icon: 'map-outline', color: Colors.accent, action: 'route', target: '/(tabs)/calculator' },
  { id: 'v482', category: 'visa', title: 'Subclass 482 — Skills in Demand', subtitle: 'Temporary · Employer sponsored', icon: 'briefcase-outline', color: Colors.accent, action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
  { id: 'v186', category: 'visa', title: 'Subclass 186 — Employer Nominated', subtitle: 'Permanent · Employer sponsored', icon: 'briefcase-outline', color: Colors.accent, action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
  { id: 'v485', category: 'visa', title: 'Subclass 485 — Temporary Graduate', subtitle: 'Post-study work', icon: 'ribbon-outline', color: Colors.accent, action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
  { id: 'v820', category: 'visa', title: 'Subclass 820/801 — Partner Onshore', subtitle: 'Family · Permanent pathway', icon: 'heart-outline', color: '#FF6B8A', action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801' },
  { id: 'v500', category: 'visa', title: 'Subclass 500 — Student Visa', subtitle: 'Full-time study at CRICOS provider', icon: 'school-outline', color: Colors.success, action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500' },
  { id: 'v417', category: 'visa', title: 'Subclass 417/462 — Working Holiday', subtitle: 'Age 18-30 · Eligible passports', icon: 'sunny-outline', color: Colors.secondary, action: 'url', target: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/working-holiday' },

  // States
  { id: 's-nsw', category: 'state', title: 'New South Wales', subtitle: '190 · 491 · VMAS program', icon: 'map-outline', color: '#4F8EF7', action: 'route', target: '/(tabs)/states' },
  { id: 's-vic', category: 'state', title: 'Victoria', subtitle: '190 · 491 · VSMP', icon: 'map-outline', color: '#00C2FF', action: 'route', target: '/(tabs)/states' },
  { id: 's-qld', category: 'state', title: 'Queensland', subtitle: '190 · 491', icon: 'map-outline', color: '#FF6B8A', action: 'route', target: '/(tabs)/states' },
  { id: 's-sa',  category: 'state', title: 'South Australia', subtitle: '190 · 491 · Business migration', icon: 'map-outline', color: '#FF7043', action: 'route', target: '/(tabs)/states' },
  { id: 's-wa',  category: 'state', title: 'Western Australia', subtitle: '190 · 491', icon: 'map-outline', color: '#FFCD00', action: 'route', target: '/(tabs)/states' },
  { id: 's-tas', category: 'state', title: 'Tasmania', subtitle: '190 · 491', icon: 'map-outline', color: '#00D68F', action: 'route', target: '/(tabs)/states' },
  { id: 's-act', category: 'state', title: 'Australian Capital Territory', subtitle: '190 · Critical Skills', icon: 'map-outline', color: '#A78BFA', action: 'route', target: '/(tabs)/states' },
  { id: 's-nt',  category: 'state', title: 'Northern Territory', subtitle: '190 · 491 · Business migration', icon: 'map-outline', color: '#FFB800', action: 'route', target: '/(tabs)/states' },

  // Tools
  { id: 't-calc', category: 'tool', title: 'Points Calculator', subtitle: 'Calculate your skilled migration points', icon: 'calculator-outline', color: Colors.secondary, action: 'route', target: '/(tabs)/calculator' },
  { id: 't-eng',  category: 'tool', title: 'English Tests', subtitle: 'IELTS · PTE · TOEFL · CAE · OET scores', icon: 'book-outline', color: Colors.success, action: 'route', target: '/(tabs)/english-tests' },
  { id: 't-aria', category: 'tool', title: 'Ask Aria AI', subtitle: '24/7 AI migration consultant', icon: 'sparkles-outline', color: '#A78BFA', action: 'route', target: '/(tabs)/ai' },
  { id: 't-news', category: 'tool', title: 'Updates & Alerts', subtitle: 'Migration news per state', icon: 'notifications-outline', color: '#FB923C', action: 'route', target: '/(tabs)/notifications' },
  { id: 't-skl',  category: 'tool', title: 'Skills Occupation List', subtitle: 'CSOL · MLTSSL · STSOL · ROL — searchable in-app', icon: 'list-outline', color: Colors.accent, action: 'route', target: '/occupations' },
  { id: 't-proc', category: 'tool', title: 'Processing Times', subtitle: 'Latest DHA timeframes — in-app', icon: 'time-outline', color: '#FB923C', action: 'route', target: '/processing-times' },
  { id: 't-mara', category: 'tool', title: 'Find a MARA Agent', subtitle: 'Registered migration agents', icon: 'person-circle-outline', color: Colors.accent, action: 'url', target: 'https://portal.mara.gov.au' },
];

const CATEGORY_LABEL: Record<SearchItem['category'], string> = {
  visa: 'Visas',
  state: 'States',
  tool: 'Tools',
  occupation: 'Occupations',
};

export default function SearchModal({ visible, onClose }: Props) {
  const Colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDEX;
    return INDEX.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    setQuery('');
    setTimeout(() => {
      if (item.action === 'url') Linking.openURL(item.target);
      else router.push(item.target as any);
    }, 100);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.searchBar, { backgroundColor: Colors.surface }]}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              autoFocus
              placeholder="Search visas, states, tools…"
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.textPrimary }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {results.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No results for "{query}"</Text>
            <Text style={styles.emptySub}>Try a visa subclass (189, 482), a state (NSW, VIC), or a tool name.</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <View style={[styles.rowIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.subtitle}</Text>
                </View>
                <View style={styles.rowTag}>
                  <Text style={styles.rowTagText}>{CATEGORY_LABEL[item.category]}</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  cancelBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  cancelText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  rowSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  rowTag: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  rowTagText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sep: { height: 1, backgroundColor: Colors.divider },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
});
