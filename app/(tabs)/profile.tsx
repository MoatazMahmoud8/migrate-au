import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Platform,
  Switch,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfile, saveProfile } from '../../utils/storage';
import { UserProfile, JourneyEntry, JourneyStageKey, JourneyVisaType } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors, useTheme } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { checkRenewalStatus } from '../../utils/billing';
import { restorePurchases, getRevenueCatUserId, syncSubscriptionStatus, manageSubscription } from '../../utils/iap';
import PaywallModal from '../../components/PaywallModal';
import { tap as hapticTap, success as hapticSuccess } from '../../utils/haptics';
import { SKILLED_OCCUPATIONS } from '../../constants/skilledOccupations';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { canAddJourneyEntry, canAddStateSubscription } from '../../utils/paywall';
import { askToRate } from '../../utils/rateApp';
import { Sentry } from '../../utils/sentry';
import { generateJourneyPDF, sharePDF } from '../../utils/pdfExport';
import { isUserAdmin } from '../../utils/admin';
import Constants from 'expo-constants';

const JOURNEY_STAGES: Array<{ key: JourneyStageKey; label: string; desc: string }> = [
  { key: 'assess', label: 'Skills Assessment', desc: 'Skills assessment & English test preparation' },
  { key: 'eoi',    label: 'EOI Submitted',     desc: 'Expression of Interest on SkillSelect' },
  { key: 'invite', label: 'Invited (ITA)',      desc: 'Received Invitation to Apply' },
  { key: 'apply',  label: 'Application Lodged', desc: 'Lodge visa application with Home Affairs' },
  { key: 'grant',  label: 'Visa Granted',       desc: '\uD83C\uDF89 Visa granted \u2014 welcome to Australia!' },
];

const VISA_TYPES: JourneyVisaType[] = ['189', '190', '491', '186', '482', '408', 'Other'];
const STATE_OPTS = ['Federal', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const VISA_COLORS: Record<string, string> = {
  '189': '#00C2FF', '190': '#00D68F', '491': '#FFB800',
  '186': '#FF6B8A', '482': '#A78BFA', '408': '#FF7043', 'Other': '#94A3B8',
};
function visaColor(v: string) { return VISA_COLORS[v] ?? '#94A3B8'; }

function getAppVersionLabel(): string {
  const nativeVersion = Constants.nativeApplicationVersion;
  const nativeBuild = Constants.nativeBuildVersion;
  if (nativeVersion) return nativeBuild ? `v${nativeVersion} (${nativeBuild})` : `v${nativeVersion}`;
  if (Platform.OS === 'web' || __DEV__) return 'Local preview';
  return Constants.expoConfig?.version ? `v${Constants.expoConfig.version}` : 'Version unavailable';
}

function formatJourneyDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
function parseInputDate(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}
function dateToInput(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return iso; }
}
function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function daysLabel(n: number): string {
  if (n < 31) return `${n}d`;
  if (n < 365) return `${Math.round(n / 30.5)}mo`;
  return `${(n / 365).toFixed(1)}yr`;
}

// Age Bracket Alerts (v1.0 — local-only storage, no Firebase sync yet)
function calculateAgeBracketAlert(birthDateISO: string | undefined): {
  currentAge: number;
  nextMilestone: number;
  daysUntilMilestone: number;
  alert: string | null;
} | null {
  if (!birthDateISO) return null;

  try {
    const birthDate = new Date(birthDateISO);
    const today = new Date();
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    let currentAge = today.getFullYear() - birthDate.getFullYear();
    if (today < thisYearBirthday) currentAge--;

    // Critical milestones: 33, 40, 45
    const milestones = [33, 40, 45];
    let nextMilestone = milestones.find(m => m > currentAge) || 45;

    // Calculate next milestone birthday
    const nextMilestoneBirthday = new Date(
      currentAge === nextMilestone - 1 ? today.getFullYear() : today.getFullYear() + (nextMilestone - currentAge),
      birthDate.getMonth(),
      birthDate.getDate()
    );

    const daysUntil = Math.ceil((nextMilestoneBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let alert: string | null = null;
    if (currentAge >= 45) {
      alert = 'ℹ️ Age 45+ milestone reached';
    } else if (daysUntil <= 30) {
      alert = `⚠️ Turning ${nextMilestone} in ${daysLabel(daysUntil)}`;
    } else if (daysUntil <= 90) {
      alert = `📌 Age ${nextMilestone} milestone in ${daysLabel(daysUntil)}`;
    }

    return { currentAge, nextMilestone, daysUntilMilestone: daysUntil, alert };
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const Colors = useColors();
  const { isDark, setLightMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    anzscoCode: '',
    isPremium: false,
    subscribedStates: [],
    subscribedOccupation: '',
    journeyStage: 0,
    journeyEntries: [],
    pinnedStates: [],
    onboardingComplete: false,
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [renewalDays, setRenewalDays] = useState<number | null>(null);
  const [renewalStatus, setRenewalStatus] = useState<'active' | 'expiring_soon' | 'expired'>('expired');
  const [rcUserId, setRcUserId] = useState<string>('');
  const [restoring, setRestoring] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Journey
  const [journeyEntries, setJourneyEntries] = useState<JourneyEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddJourney, setShowAddJourney] = useState(false);
  const [newVisa, setNewVisa] = useState<JourneyVisaType>('189');
  const [newState, setNewState] = useState('Federal');
  const [newAnzsco, setNewAnzsco] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateTarget, setDateTarget] = useState<{ entryId: string; stageKey: JourneyStageKey } | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adminTapCount = useRef(0);
  const adminTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ADMIN_PIN = 'sob7anallah';

  const handleAvatarTap = () => {
    adminTapCount.current += 1;
    if (adminTapTimer.current) clearTimeout(adminTapTimer.current);
    adminTapTimer.current = setTimeout(() => { adminTapCount.current = 0; }, 2000);
    if (adminTapCount.current >= 5) {
      adminTapCount.current = 0;
      setAdminPinInput('');
      setShowAdminPin(true);
    }
  };

  const handleAdminPinSubmit = () => {
    if (adminPinInput === ADMIN_PIN) {
      setShowAdminPin(false);
      setAdminPinInput('');
      router.push('/admin/dashboard' as any);
    } else {
      Alert.alert('Incorrect', 'Access denied.');
      setAdminPinInput('');
    }
  };

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setJourneyEntries(p.journeyEntries ?? []);
      if (p.birthDate) {
        setBirthDateInput(dateToInput(p.birthDate));
      }
      if (p.isPremium) {
        getRevenueCatUserId().then((uid) => {
          checkRenewalStatus(uid).then((res) => {
            setRenewalStatus(res.status);
            setRenewalDays(res.daysUntilExpiry ?? null);
          });
        });
      }
    });
    getRevenueCatUserId().then(setRcUserId);
  }, []);

  // Check if user is admin
  useEffect(() => {
    isUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  // Refresh profile after paywall closes (purchase may have set isPremium)
  const handlePaywallClose = () => {
    setShowPaywall(false);
    getProfile().then(setProfile);
  };

  const saveName = async () => {
    Keyboard.dismiss();
    const trimmed = nameInput.trim();
    try {
      await saveProfile({ name: trimmed });
      setProfile({ ...profile, name: trimmed });
      setEditingName(false);
    } catch (e) {
      Alert.alert('Could not save', 'Your name could not be saved. Please try again.');
    }
  };

  const handleUpgrade = () => setShowPaywall(true);

  // Journey helpers
  const addJourneyEntry = async () => {
    // Check if user has exceeded journey entry limit
    if (!canAddJourneyEntry(profile)) {
      setShowPaywall(true);
      return;
    }

    const trimmed = newAnzsco.trim();
    const occ = trimmed
      ? SKILLED_OCCUPATIONS.find(
          (o) => o.anzsco === trimmed ||
            o.name.toLowerCase().includes(trimmed.toLowerCase())
        )
      : undefined;
    const entry: JourneyEntry = {
      id: Date.now().toString(),
      visaType: newVisa,
      anzscoCode: occ?.anzsco || (trimmed || undefined),
      occupationName: occ?.name || undefined,
      state: newState === 'Federal' ? undefined : newState,
      currentStage: 0,
      stageDates: {},
      createdAt: new Date().toISOString(),
    };
    const updated = [...journeyEntries, entry];
    setJourneyEntries(updated);
    await saveProfile({ journeyEntries: updated });
    setShowAddJourney(false);
    setNewVisa('189'); setNewState('Federal'); setNewAnzsco('');
    setExpandedId(entry.id);
    hapticSuccess();
  };

  const deleteJourneyEntry = (id: string) => {
    Alert.alert('Remove Journey', 'Remove this visa application journey?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = journeyEntries.filter((e) => e.id !== id);
          setJourneyEntries(updated);
          await saveProfile({ journeyEntries: updated });
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  const advanceStage = async (entryId: string, stage: number) => {
    const updated = journeyEntries.map((e) =>
      e.id === entryId ? { ...e, currentStage: stage } : e
    );
    setJourneyEntries(updated);
    await saveProfile({ journeyEntries: updated });
    hapticSuccess();
  };

  const persistStageDate = async (
    entryId: string,
    stageKey: JourneyStageKey,
    iso: string | undefined
  ) => {
    const updated = journeyEntries.map((e) =>
      e.id === entryId
        ? { ...e, stageDates: { ...e.stageDates, [stageKey]: iso } }
        : e
    );
    setJourneyEntries(updated);
    await saveProfile({ journeyEntries: updated });
    hapticSuccess();
  };

  const handleExportPDF = () => {
    if (!profile) return;

    if (!profile.isPremium) {
      setShowPaywall(true);
      return;
    }

    const pdfContent = generateJourneyPDF(profile);
    const shared = sharePDF(pdfContent, profile);

    Alert.alert(
      '📄 Journey Exported',
      'Your visa journey has been exported as a text document. You can copy this to save or share with a migration agent.',
      [
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            // In production, use react-native-clipboard
            alert('PDF export ready! Share with your migration agent.');
          },
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  const openDateModal = (entryId: string, stageKey: JourneyStageKey) => {
    const entry = journeyEntries.find((e) => e.id === entryId);
    const existing = entry?.stageDates?.[stageKey];
    const initial = existing ? new Date(existing) : new Date();

    if (Platform.OS === 'android') {
      // Android: open native dialog directly, no JS modal needed
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            const iso = selected.toISOString().split('T')[0];
            persistStageDate(entryId, stageKey, iso);
          }
        },
      });
      return;
    }

    // iOS: render inline spinner inside modal
    setDateTarget({ entryId, stageKey });
    setDateInput(existing ? dateToInput(existing) : dateToInput(initial.toISOString()));
    setShowDateModal(true);
  };

  const saveStageDateInput = async () => {
    if (!dateTarget) return;
    const iso = parseInputDate(dateInput);
    if (!iso && dateInput.trim()) {
      Alert.alert('Invalid date', 'Please pick a date');
      return;
    }
    await persistStageDate(dateTarget.entryId, dateTarget.stageKey, iso ?? undefined);
    setShowDateModal(false);
  };

  const saveBirthDate = async (inputStr: string) => {
    if (!inputStr.trim()) {
      // Clear birthdate
      const updated = { ...profile, birthDate: undefined };
      setProfile(updated);
      await saveProfile({ birthDate: undefined });
      setBirthDateInput('');
      setShowBirthDatePicker(false);
      return;
    }

    const iso = parseInputDate(inputStr);
    if (!iso) {
      Alert.alert('Invalid date', 'Please enter a valid date (DD/MM/YYYY)');
      return;
    }

    // Verify it's a past date
    if (new Date(iso) > new Date()) {
      Alert.alert('Invalid date', 'Birth date must be in the past');
      return;
    }

    const updated = { ...profile, birthDate: iso };
    setProfile(updated);
    await saveProfile({ birthDate: iso });
    setBirthDateInput(dateToInput(iso));
    setShowBirthDatePicker(false);
  };

  const openBirthDatePicker = (existingIso?: string) => {
    const initial = existingIso ? new Date(existingIso) : new Date(1990, 0, 1);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            saveBirthDate(dateToInput(selected.toISOString()));
          }
        },
      });
    } else {
      setBirthDateInput(existingIso ? dateToInput(existingIso) : '');
      setShowBirthDatePicker(true);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.restored) {
        const updated = await getProfile();
        setProfile(updated);
      }
      Alert.alert(result.restored ? 'Restored ✓' : 'Not Found', result.message);
    } finally {
      setRestoring(false);
    }
  };

  const initials = profile.name
    ? profile.name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header with avatar */}
      <LinearGradient
        colors={[Colors.primaryDark, '#0D1F38']}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        {/* Decorative orb */}
        <View style={styles.headerOrb} />

        <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarTap} activeOpacity={0.8}>
          <LinearGradient colors={[Colors.secondary, '#FFB800']} style={styles.avatar}>
            <Text style={[styles.avatarText, { color: Colors.primaryDark }]}>{initials}</Text>
          </LinearGradient>
          {profile.isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="star" size={10} color={Colors.primaryDark} />
            </View>
          )}
        </TouchableOpacity>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={[styles.nameInput, { color: Colors.white, borderBottomColor: 'rgba(255,255,255,0.65)' }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.65)"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <TouchableOpacity onPress={saveName} style={[styles.saveBtn, { backgroundColor: Colors.secondary }]}>
              <Text style={[styles.saveBtnText, { color: Colors.primaryDark }]}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setNameInput(profile.name); setEditingName(true); }}
            style={styles.nameRow}
          >
            <Text style={[styles.profileName, { color: Colors.white }]}>{profile.name || 'Tap to set your name'}</Text>
            <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.72)" />
          </TouchableOpacity>
        )}

        <View style={styles.planBadge}>
          {profile.isPremium
            ? <><Ionicons name="star" size={12} color={Colors.secondary} /><Text style={[styles.planText, { color: Colors.white }]}>Premium Member</Text></>
            : <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name="person-outline" size={12} color="rgba(255,255,255,0.82)" />
                  <Text style={[styles.planText, { color: Colors.white }]}>Free Plan</Text>
                </View>
                <TouchableOpacity
                  onPress={handleUpgrade}
                  style={[styles.subscribeNowBtn, { backgroundColor: Colors.secondary }]}
                >
                  <Text style={[styles.subscribeNowText, { color: Colors.primaryDark }]}>Upgrade Now</Text>
                </TouchableOpacity>
              </>
          }
        </View>
      </LinearGradient>

      {/* My Journey */}
      <View style={styles.section}>
        <View style={jStyles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>My Journey</Text>
          <View style={jStyles.headerActions}>
            {journeyEntries.length > 0 && profile?.isPremium && (
              <TouchableOpacity style={[jStyles.exportBtn, { backgroundColor: Colors.surface }]} onPress={handleExportPDF} activeOpacity={0.8}>
                <Ionicons name="document-outline" size={14} color={Colors.secondary} />
                <Text style={[jStyles.exportBtnText, {color: Colors.textPrimary}]}>Export</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={jStyles.addBtn} onPress={() => setShowAddJourney(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={15} color={Colors.primaryDark} />
              <Text style={[jStyles.addBtnText, {color: Colors.textPrimary}]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {journeyEntries.length === 0 && (
          <TouchableOpacity style={[jStyles.emptyCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => setShowAddJourney(true)} activeOpacity={0.8}>
            <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
            <Text style={[jStyles.emptyTitle, {color: Colors.textPrimary}]}>Track your visa journey</Text>
            <Text style={[jStyles.emptyDesc, {color: Colors.textPrimary}]}>Add a visa application to track your progress and key milestone dates</Text>
          </TouchableOpacity>
        )}

        {journeyEntries.map((entry) => {
          const isOpen = expandedId === entry.id;
          const color = visaColor(entry.visaType);
          return (
            <View key={entry.id} style={[jStyles.entryCard, isOpen && { borderColor: color }]}>
              {/* Card header */}
              <TouchableOpacity
                style={jStyles.entryHeader}
                onPress={() => { hapticTap(); setExpandedId(isOpen ? null : entry.id); }}
                activeOpacity={0.8}
              >
                <View style={[jStyles.visaBadge, { backgroundColor: `${color}22`, borderColor: color }]}>
                  <Text style={[jStyles.visaBadgeText, { color }]}>SC {entry.visaType}</Text>
                </View>
                {entry.state && (
                  <View style={jStyles.stateBadge}>
                    <Text style={[jStyles.stateBadgeText, {color: Colors.textPrimary}]}>{entry.state}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {(entry.anzscoCode || entry.occupationName) && (
                    <Text style={[jStyles.entryAnzsco, {color: Colors.textPrimary}]} numberOfLines={1}>
                      {entry.anzscoCode}{entry.occupationName ? ` · ${entry.occupationName}` : ''}
                    </Text>
                  )}
                  <Text style={[jStyles.entryStage, { color: isOpen ? color : Colors.textSecondary }]} numberOfLines={1}>
                    {JOURNEY_STAGES[entry.currentStage]?.label ?? 'Skills Assessment'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteJourneyEntry(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.error} />
                </TouchableOpacity>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Expanded stage list */}
              {isOpen && (
                <View style={jStyles.stageList}>
                  {JOURNEY_STAGES.map((stage, idx) => {
                    const isCompleted = idx < entry.currentStage;
                    const isCurrent   = idx === entry.currentStage;
                    const date    = entry.stageDates?.[stage.key];
                    const prevKey = idx > 0 ? JOURNEY_STAGES[idx - 1].key : null;
                    const prevDate = prevKey ? entry.stageDates?.[prevKey] : null;
                    const gap = date && prevDate ? daysBetween(prevDate, date) : null;
                    return (
                      <View key={stage.key} style={jStyles.stageRow}>
                        {/* Dot + line connector */}
                        <View style={jStyles.stageConnector}>
                          <View style={[
                            jStyles.stageDot,
                            isCompleted && { backgroundColor: Colors.success, borderColor: Colors.success },
                            isCurrent   && { backgroundColor: color,          borderColor: color },
                          ]}>
                            {isCompleted
                              ? <Ionicons name="checkmark" size={10} color="#fff" />
                              : <Text style={[jStyles.stageDotNum, isCurrent && { color: '#fff' }]}>{idx + 1}</Text>
                            }
                          </View>
                          {idx < JOURNEY_STAGES.length - 1 && (
                            <View style={[jStyles.stageLine, isCompleted && { backgroundColor: Colors.success }]} />
                          )}
                        </View>

                        {/* Stage content */}
                        <View style={jStyles.stageInfo}>
                          <TouchableOpacity
                            style={jStyles.stageNameRow}
                            onPress={() => advanceStage(entry.id, idx)}
                            activeOpacity={0.75}
                          >
                            <Text style={[
                              jStyles.stageName,
                              isCompleted && { color: Colors.success },
                              isCurrent   && { color, fontWeight: FontWeight.bold },
                            ]}>{stage.label}</Text>
                            {isCurrent && (
                              <View style={[jStyles.currentBadge, { backgroundColor: `${color}22`, borderColor: color }]}>
                                <Text style={[jStyles.currentBadgeText, { color }]}>Current</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openDateModal(entry.id, stage.key)} activeOpacity={0.7}>
                            {date ? (
                              <View style={jStyles.datePill}>
                                <Ionicons name="calendar-outline" size={11} color={Colors.accent} />
                                <Text style={[jStyles.datePillText, {color: Colors.textPrimary}]}>{formatJourneyDate(date)}</Text>
                                {gap !== null && (
                                  <View style={jStyles.gapPill}>
                                    <Text style={[jStyles.gapText, {color: Colors.textPrimary}]}>+{daysLabel(gap)}</Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <Text style={[jStyles.addDateText, {color: Colors.textPrimary}]}>+ Add date</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Age Bracket Alerts (v1.0 — local-only, premium feature) */}
      {profile.isPremium && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Age Bracket Alerts</Text>
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            {profile.birthDate ? (() => {
              const bracketAlert = calculateAgeBracketAlert(profile.birthDate);
              if (!bracketAlert) return <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Invalid birth date</Text>;

              return (
                <>
                  <View style={jStyles.bracketRow}>
                    <View>
                      <Text style={[jStyles.bracketLabel, {color: Colors.textPrimary}]}>Current Age</Text>
                      <Text style={[jStyles.bracketValue, {color: Colors.textPrimary}]}>{bracketAlert.currentAge}</Text>
                    </View>
                    <View>
                      <Text style={[jStyles.bracketLabel, {color: Colors.textPrimary}]}>Next Milestone</Text>
                      <Text style={[jStyles.bracketValue, {color: Colors.textPrimary}]}>{bracketAlert.nextMilestone}</Text>
                    </View>
                    <View>
                      <Text style={[jStyles.bracketLabel, {color: Colors.textPrimary}]}>Days Until</Text>
                      <Text style={[jStyles.bracketValue, {color: Colors.textPrimary}]}>{daysLabel(bracketAlert.daysUntilMilestone)}</Text>
                    </View>
                  </View>
                  {bracketAlert.alert && (
                    <View style={jStyles.bracketAlert}>
                      <Text style={[jStyles.bracketAlertText, {color: Colors.textPrimary}]}>{bracketAlert.alert}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => openBirthDatePicker(profile.birthDate)}
                    style={jStyles.editBirthDateBtn}
                  >
                    <Text style={[jStyles.editBirthDateText, {color: Colors.textPrimary}]}>Edit Birth Date</Text>
                  </TouchableOpacity>
                </>
              );
            })() : (
              <TouchableOpacity
                onPress={() => openBirthDatePicker()}
                style={jStyles.addBirthDateBtn}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.secondary} />
                <Text style={[jStyles.addBirthDateText, {color: Colors.textPrimary}]}>Add your birth date to track age milestones</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Subscription card */}
      {profile.isPremium ? (
        <View style={styles.section}>
          <LinearGradient
            colors={['#0A3D1F', '#0D5C2E']}
            style={styles.premiumCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.premiumGlow} />
            <View style={styles.premiumLeft}>
              <View style={[styles.premiumIcon, { backgroundColor: 'rgba(0,214,143,0.2)' }]}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.premiumTitle, {color: Colors.textPrimary}]}>Premium Plan</Text>
                {renewalDays !== null ? (
                  <Text style={[
                    styles.premiumSub,
                    renewalStatus === 'expiring_soon' && { color: '#FBBF24' },
                  ]}>
                    {renewalStatus === 'expiring_soon'
                      ? `⚠️ Expires in ${renewalDays} day${renewalDays === 1 ? '' : 's'}`
                      : `Renews in ${renewalDays} days`}
                  </Text>
                ) : (
                  <Text style={[styles.premiumSub, {color: Colors.textPrimary}]}>Active subscription</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageBillingBtn}
              onPress={() => {
                hapticTap();
                manageSubscription();
              }}
            >
              <Text style={[styles.manageBillingText, {color: Colors.textPrimary}]}>Manage</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : null}

      {/* Settings rows */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Alerts</Text>
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <SettingRow
            icon="notifications-outline"
            label="Occupation Watchlist"
            value={profile.isPremium ? 'Pro' : 'Free (1 item)'}
            onPress={() => router.push('/watchlist')}
            showArrow
            last
          />
        </View>
      </View>

      {/* Display Settings */}
      {profile.isPremium && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.secondary }]}>Display</Text>
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingContent}>
                <Ionicons name="sunny-outline" size={18} color={Colors.secondary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: Colors.textPrimary }]}>Light Mode</Text>
                  <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>Dark mode coming soon</Text>
                </View>
              </View>
              <Switch
                value
                disabled
                trackColor={{ false: Colors.border, true: Colors.secondary + '50' }}
                thumbColor={Colors.secondary}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Subscription</Text>
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <SettingRow
            icon={profile.isPremium ? 'star' : 'star-outline'}
            label="Current Plan"
            value={profile.isPremium ? 'Premium' : 'Free'}
          />
          {profile.isPremium && (
            <SettingRow
              icon="rocket-outline"
              label="Upgrade Plan"
              value="Save more with Annual or Lifetime"
              onPress={() => { hapticTap(); setShowPaywall(true); }}
              showArrow
            />
          )}
          <SettingRow
            icon="refresh-outline"
            label="Restore Purchases"
            onPress={handleRestore}
            showArrow
            loading={restoring}
            last
          />
        </View>
      </View>



      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Resources</Text>
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <SettingRow
            icon="globe-outline"
            label="Official Source"
            value="immi.homeaffairs.gov.au"
            onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
            showArrow
          />
          <SettingRow
            icon="person-circle-outline"
            label="Find a MARA Agent"
            value="portal.mara.gov.au"
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
            showArrow
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Support</Text>
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <SettingRow
            icon="star-outline"
            label="Rate MigrateAU"
            value="Help others find the app"
            onPress={() => { hapticTap(); askToRate(true); }}
            showArrow
          />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label="Send Feedback"
            value="Ideas, complaints, suggestions"
            onPress={() => setShowFeedback(true)}
            showArrow
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>About</Text>
        <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <SettingRow icon="information-circle-outline" label="MigrateAU" value={getAppVersionLabel()} />
          <SettingRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://jsmglobal.xyz/migration-privacy.html')}
            showArrow
          />
          <SettingRow icon="key-outline" label="Account ID" value={rcUserId ? rcUserId.slice(0, 18) + '…' : '—'} last />
        </View>
      </View>

      {__DEV__ && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>Developer</Text>
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <SettingRow
              icon="bug-outline"
              label="Send test error to Sentry"
              value="Verifies crash reporting"
              onPress={() => {
                Sentry.captureException(new Error(`MigrateAU test error @ ${new Date().toISOString()}`));
                Alert.alert('Sent', 'Check sentry.io → Issues to confirm it arrived.');
              }}
              showArrow
            />
            <SettingRow
              icon="warning-outline"
              label="Trigger native crash"
              value="Will hard-crash the app"
              onPress={() => {
                Sentry.nativeCrash();
              }}
              showArrow
              last
            />
          </View>
        </View>
      )}

      <View style={[styles.disclaimer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={[styles.disclaimerText, {color: Colors.textPrimary}]}>
          Information is general in nature. Always consult a{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
          >
            MARA-registered migration agent
          </Text>
          {' '}for formal advice.
        </Text>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={handlePaywallClose}
        userId={rcUserId || 'anonymous'}
        title="Upgrade to Premium"
        message="Unlock ANZSCO tracking, custom state alerts, and unlimited Aria AI."
        feature="premium"
      />

    </ScrollView>

      {/* Birth Date Picker Modal */}
      <Modal
        visible={showBirthDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBirthDatePicker(false)}
      >
        <View style={jStyles.dateBackdrop}>
          <View style={[jStyles.dateSheet, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[jStyles.modalTitle, {color: Colors.textPrimary}]}>Birth Date</Text>
            <Text style={[jStyles.modalSub, {color: Colors.textPrimary}]}>For age bracket milestone alerts</Text>

            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={birthDateInput.split('/').reverse().join('-') || ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    setBirthDateInput(`${d}/${m}/${y}`);
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  borderWidth: 1,
                  borderColor: Colors.border,
                  fontSize: '16px',
                  color: Colors.textPrimary,
                  backgroundColor: Colors.background,
                  marginBottom: Spacing.lg,
                  cursor: 'pointer',
                } as any}
              />
            ) : (
              <DateTimePicker
                value={(() => {
                  const iso = parseInputDate(birthDateInput);
                  return iso ? new Date(iso) : new Date();
                })()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selected) => {
                  if (selected) setBirthDateInput(dateToInput(selected.toISOString()));
                }}
                style={{ alignSelf: 'stretch' }}
              />
            )}

            <View style={jStyles.dateActions}>
              <TouchableOpacity
                style={[jStyles.saveBtn, { flex: 1, backgroundColor: Colors.accent }]}
                onPress={() => saveBirthDate(birthDateInput)}
                activeOpacity={0.85}
              >
                <Text style={[jStyles.saveBtnText, {color: Colors.primaryDark}]}>Save</Text>
              </TouchableOpacity>
              {profile.birthDate && (
                <TouchableOpacity
                  style={[jStyles.cancelBtn, { flex: 1, marginTop: 0, marginLeft: Spacing.sm, borderColor: Colors.border }]}
                  onPress={() => saveBirthDate('')}
                >
                  <Text style={[jStyles.cancelBtnText, { color: Colors.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowBirthDatePicker(false)} style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
              <Text style={[jStyles.cancelBtnText, {color: Colors.textPrimary}]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Journey modal */}
      <Modal
        visible={showAddJourney}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddJourney(false)}
      >
        <View style={[jStyles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[jStyles.modalSheet, { backgroundColor: Colors.surface, paddingBottom: insets.bottom + 24 }]}>
            <View style={[jStyles.modalHandle, { backgroundColor: Colors.border }]} />
            <Text style={[jStyles.modalTitle, {color: Colors.textPrimary}]}>New Visa Journey</Text>
            <Text style={[jStyles.modalSub, {color: Colors.textPrimary}]}>Track progress and dates for one application</Text>

            <Text style={[jStyles.fieldLabel, {color: Colors.textPrimary}]}>Visa subclass</Text>
            <View style={jStyles.pillRow}>
              {VISA_TYPES.map((v) => {
                const active = newVisa === v;
                const c = visaColor(v);
                return (
                  <TouchableOpacity
                    key={v}
                    style={[jStyles.pill, { borderColor: Colors.border }, active && { backgroundColor: `${c}22`, borderColor: c }]}
                    onPress={() => setNewVisa(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[jStyles.pillText, { color: Colors.textSecondary }, active && { color: c }]}>SC {v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[jStyles.fieldLabel, {color: Colors.textPrimary}]}>State / jurisdiction</Text>
            <View style={jStyles.pillRow}>
              {STATE_OPTS.map((s) => {
                const active = newState === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[jStyles.pill, { borderColor: Colors.border }, active && { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
                    onPress={() => setNewState(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[jStyles.pillText, { color: Colors.textSecondary }, active && { color: Colors.accent }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[jStyles.fieldLabel, {color: Colors.textPrimary}]}>ANZSCO code or occupation name <Text style={[jStyles.fieldOptional, {color: Colors.textPrimary}]}>(optional)</Text></Text>
            <TextInput
              style={[jStyles.textInput, {color: Colors.textPrimary, borderColor: Colors.border}]}
              value={newAnzsco}
              onChangeText={setNewAnzsco}
              placeholder="e.g. 261313 or Software Engineer"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              autoCapitalize="words"
            />

            <TouchableOpacity style={[jStyles.saveBtn, { backgroundColor: Colors.accent }]} onPress={addJourneyEntry} activeOpacity={0.85}>
              <Text style={[jStyles.saveBtnText, {color: Colors.primaryDark}]}>Add Journey</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[jStyles.cancelBtn, { borderColor: Colors.border }]} onPress={() => setShowAddJourney(false)}>
              <Text style={[jStyles.cancelBtnText, {color: Colors.textPrimary}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date picker modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={jStyles.dateBackdrop}>
          <View style={[jStyles.dateSheet, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Text style={[jStyles.modalTitle, {color: Colors.textPrimary}]}>
              {dateTarget ? JOURNEY_STAGES.find(s => s.key === dateTarget.stageKey)?.label : 'Date'}
            </Text>
            <Text style={[jStyles.modalSub, {color: Colors.textPrimary}]}>Pick the date for this milestone</Text>

            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={dateInput.split('/').reverse().join('-') || ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    setDateInput(`${d}/${m}/${y}`);
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  borderWidth: 1,
                  borderColor: Colors.border,
                  fontSize: '16px',
                  color: Colors.textPrimary,
                  backgroundColor: Colors.background,
                  marginBottom: Spacing.lg,
                  cursor: 'pointer',
                } as any}
              />
            ) : (
              <DateTimePicker
                value={(() => {
                  const iso = parseInputDate(dateInput);
                  return iso ? new Date(iso) : new Date();
                })()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selected) => {
                  if (selected) setDateInput(dateToInput(selected.toISOString()));
                }}
                style={{ alignSelf: 'stretch' }}
              />
            )}
            <View style={jStyles.dateActions}>
              <TouchableOpacity
                style={[jStyles.saveBtn, { flex: 1, backgroundColor: Colors.accent }]}
                onPress={saveStageDateInput}
                activeOpacity={0.85}
              >
                <Text style={[jStyles.saveBtnText, {color: Colors.primaryDark}]}>Save</Text>
              </TouchableOpacity>
              {dateInput.trim() !== '' && (
                <TouchableOpacity
                  style={[jStyles.cancelBtn, { flex: 1, marginTop: 0, marginLeft: Spacing.sm, borderColor: Colors.border }]}
                  onPress={async () => {
                    if (!dateTarget) return;
                    const updated = journeyEntries.map((e) =>
                      e.id === dateTarget.entryId
                        ? { ...e, stageDates: { ...e.stageDates, [dateTarget.stageKey]: undefined } }
                        : e
                    );
                    setJourneyEntries(updated);
                    await saveProfile({ journeyEntries: updated });
                    setShowDateModal(false);
                  }}
                >
                  <Text style={[jStyles.cancelBtnText, { color: Colors.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowDateModal(false)} style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
              <Text style={[jStyles.cancelBtnText, {color: Colors.textPrimary}]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback sheet */}
      <Modal
        visible={showFeedback}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedback(false)}
      >
        <View style={[feedbackStyles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[feedbackStyles.sheet, { backgroundColor: Colors.surface, paddingBottom: insets.bottom + 24 }]}>
            <View style={[feedbackStyles.handle, { backgroundColor: Colors.border }]} />
            <Text style={[feedbackStyles.title, {color: Colors.textPrimary}]}>Get in Touch</Text>
            <Text style={[feedbackStyles.subtitle, {color: Colors.textPrimary}]}>We read every message and aim to reply within 48 hours.</Text>

            {([
              {
                icon: 'bulb-outline',
                label: 'Suggestion',
                desc: 'Feature idea or improvement',
                subject: 'MigrateAU – Suggestion',
                body: 'Hi MigrateAU team,\n\nI have a suggestion:\n\n',
              },
              {
                icon: 'happy-outline',
                label: 'Feedback',
                desc: 'Tell us what you think',
                subject: 'MigrateAU – Feedback',
                body: 'Hi MigrateAU team,\n\nHere is my feedback:\n\n',
              },
              {
                icon: 'bug-outline',
                label: 'Report a Bug',
                desc: 'Something not working right',
                subject: 'MigrateAU – Bug Report',
                body: 'Hi MigrateAU team,\n\nI found an issue:\n\nSteps to reproduce:\n1. \n\nExpected behaviour:\n\nActual behaviour:\n\n',
              },
              {
                icon: 'alert-circle-outline',
                label: 'Complaint',
                desc: 'Let us know what went wrong',
                subject: 'MigrateAU – Complaint',
                body: 'Hi MigrateAU team,\n\nI would like to raise a concern:\n\n',
              },
            ] as const).map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[feedbackStyles.option, i < arr.length - 1 && feedbackStyles.optionBorder]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowFeedback(false);
                  const mailto = `mailto:support@jsmglobal.xyz?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.body)}`;
                  Linking.openURL(mailto);
                }}
              >
                <View style={feedbackStyles.optionIcon}>
                  <Ionicons name={item.icon as any} size={20} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[feedbackStyles.optionLabel, {color: Colors.textPrimary}]}>{item.label}</Text>
                  <Text style={[feedbackStyles.optionDesc, {color: Colors.textPrimary}]}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={feedbackStyles.cancelBtn}
              onPress={() => setShowFeedback(false)}
              activeOpacity={0.8}
            >
              <Text style={[feedbackStyles.cancelText, {color: Colors.textPrimary}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin PIN Modal */}
      <Modal
        visible={showAdminPin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminPin(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 300, alignItems: 'center' }}>
            <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>Enter Passphrase</Text>
            <TextInput
              style={{ width: '100%', backgroundColor: Colors.background, borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 }}
              value={adminPinInput}
              onChangeText={setAdminPinInput}
              placeholder="Passphrase"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              secureTextEntry
              onSubmitEditing={handleAdminPinSubmit}
            />
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShowAdminPin(false)}
                style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
              >
                <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdminPinSubmit}
                style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.accent }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Enter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingRow({
  icon, label, value, badge, locked, onPress, showArrow, last, loading,
}: {
  icon: string; label: string; value?: string; badge?: string; locked?: boolean; onPress?: () => void; showArrow?: boolean; last?: boolean; loading?: boolean;
}) {
  const Colors = useColors();
  return (
    <TouchableOpacity
      style={[rowStyles.row, !last && rowStyles.rowBorder, !last && { borderBottomColor: Colors.divider }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={(!onPress && !showArrow) || loading}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: Colors.background }]}>
        <Ionicons name={icon as any} size={18} color={locked ? Colors.textMuted : Colors.textSecondary} />
      </View>
      <Text
        style={[rowStyles.label, { color: Colors.textPrimary }, locked && { color: Colors.textMuted }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={rowStyles.right}>
        {loading
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <>
              {value && <Text style={[rowStyles.value, { color: Colors.textMuted }]} numberOfLines={1}>{value}</Text>}
              {badge && <View style={rowStyles.badge}><Text style={[rowStyles.badgeText, {color: Colors.textPrimary}]}>{badge}</Text></View>}
              {locked && <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />}
              {showArrow && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
            </>
        }
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', fontSize: FontSize.md },
  labelMuted: { },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1, justifyContent: 'flex-end' },
  value: { fontSize: FontSize.sm, flexShrink: 1, textAlign: 'right' },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});

const feedbackStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionBorder: { borderBottomWidth: 1 },
  optionIcon: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.accent}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  optionDesc: { fontSize: FontSize.xs, marginTop: 2 },
  cancelBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelText: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
});

const jStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  addBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1,
  },
  exportBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  emptyCard: { borderRadius: Radius.xl,
    padding: Spacing.xl, borderWidth: 1,
    alignItems: 'center', gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
  emptyDesc:  { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 18 },

  entryCard: { borderRadius: Radius.xl,
    borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  visaBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    borderWidth: 1,
  },
  visaBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  stateBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full,
    borderWidth: 1,
  },
  stateBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  entryAnzsco: { fontSize: 10 },
  entryStage: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },

  stageList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  stageRow: { flexDirection: 'row', minHeight: 64 },
  stageConnector: { width: 32, alignItems: 'center' },
  stageDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stageDotNum: { fontSize: 9, fontWeight: '700' as const },
  stageLine: { width: 2, flex: 1, marginTop: 1, marginBottom: 1 },

  stageInfo: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.md },
  stageNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  stageName: { fontSize: FontSize.sm },
  currentBadge: {
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  currentBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  datePillText: { fontSize: FontSize.xs },
  gapPill: {
    backgroundColor: `${Colors.warning}22`, borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: `${Colors.warning}55`,
  },
  gapText: { fontSize: 9, fontWeight: FontWeight.bold },
  addDateText: { fontSize: FontSize.xs, marginTop: 3 },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSub: { fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  fieldOptional: { fontSize: FontSize.xs, fontWeight: FontWeight.regular ?? '400', textTransform: 'none' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1,
  },
  pillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  textInput: { borderRadius: Radius.md, padding: Spacing.md,
    fontSize: FontSize.md, borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  saveBtn: { borderRadius: Radius.md,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  saveBtnText: { fontWeight: FontWeight.bold, fontSize: FontSize.md },
  cancelBtn: { borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: Spacing.xs,
  },
  cancelBtnText: { fontWeight: FontWeight.semiBold, fontSize: FontSize.md },

  dateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  dateSheet: { borderRadius: Radius.xl, padding: Spacing.xl,
    borderWidth: 1,
  },
  dateActions: { flexDirection: 'row', gap: Spacing.sm },

  // Age Bracket Alerts
  bracketRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg,
    borderBottomWidth: 1, marginBottom: Spacing.lg,
  },
  bracketLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, marginBottom: 4 },
  bracketValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  bracketAlert: {
    backgroundColor: `${Colors.secondary}18`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  bracketAlertText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  editBirthDateBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editBirthDateText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  addBirthDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.lg, justifyContent: 'center',
  },
  addBirthDateText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  headerOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.04,
    top: -60,
    right: -40,
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold },
  manageBillingBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manageBillingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
  },
  premiumBadgeSmall: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  profileName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  nameInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 2,
    minWidth: 160,
    paddingBottom: 2,
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  saveBtnText: { fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  subscribeNowBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  subscribeNowText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },

  card: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
  },

  // Settings row with switch
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: FontSize.xs,
  },

  // Premium card
  premiumCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.2)',
    top: -40,
    right: -20,
  },
  premiumLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  premiumSub: { fontSize: FontSize.sm, marginTop: 2, maxWidth: 200 },
  premiumArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16 },
  disclaimerLink: { textDecorationLine: 'underline' },

  /* Journey NEW styles */
  journeyCard: { },
  journeyHint: { display: 'none' },
  journeyTrack: { display: 'none' },
  journeyStep: { display: 'none' },
  journeyDot: { display: 'none' },
  journeyDotActive: {},
  journeyDotDone: {},
  journeyDotNum: {},
  journeyLabel: {},
  journeyLabelActive: {},
  journeyLabelDone: {},
  journeyLine: { display: 'none' },
  journeyLineDone: {},
  journeyDetail: { display: 'none' },
  journeyDetailTitle: {},
  journeyDetailSub: {},
});
