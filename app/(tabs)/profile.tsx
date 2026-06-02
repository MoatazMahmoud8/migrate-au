import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfile, saveProfile } from '../../utils/storage';
import { UserProfile, JourneyEntry, JourneyStageKey, JourneyVisaType } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { checkRenewalStatus } from '../../utils/billing';
import { restorePurchases, getRevenueCatUserId, syncSubscriptionStatus } from '../../utils/iap';
import PaywallModal from '../../components/PaywallModal';
import { tap as hapticTap, success as hapticSuccess } from '../../utils/haptics';
import { SKILLED_OCCUPATIONS } from '../../constants/skilledOccupations';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { canAddJourneyEntry, canAddStateSubscription } from '../../utils/paywall';
import { askToRate } from '../../utils/rateApp';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  // Refresh profile after paywall closes (purchase may have set isPremium)
  const handlePaywallClose = () => {
    setShowPaywall(false);
    getProfile().then(setProfile);
  };

  const saveName = async () => {
    const updated = { ...profile, name: nameInput };
    await saveProfile({ name: nameInput });
    setProfile(updated);
    setEditingName(false);
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

        <View style={styles.avatarWrap}>
          <LinearGradient colors={[Colors.secondary, '#FFB800']} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          {profile.isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="star" size={10} color={Colors.primaryDark} />
            </View>
          )}
        </View>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setNameInput(profile.name); setEditingName(true); }}
            style={styles.nameRow}
          >
            <Text style={styles.profileName}>{profile.name || 'Tap to set your name'}</Text>
            <Ionicons name="pencil" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.planBadge}>
          {profile.isPremium
            ? <><Ionicons name="star" size={12} color={Colors.secondary} /><Text style={styles.planText}>Premium Member</Text></>
            : <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                  <Text style={[styles.planText, { color: Colors.textMuted }]}>Free Plan</Text>
                </View>
                <TouchableOpacity
                  onPress={handleUpgrade}
                  style={styles.subscribeNowBtn}
                >
                  <Text style={styles.subscribeNowText}>Upgrade Now</Text>
                </TouchableOpacity>
              </>
          }
        </View>
      </LinearGradient>

      {/* My Journey */}
      <View style={styles.section}>
        <View style={jStyles.sectionHeader}>
          <Text style={styles.sectionLabel}>My Journey</Text>
          <TouchableOpacity style={jStyles.addBtn} onPress={() => setShowAddJourney(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color={Colors.primaryDark} />
            <Text style={jStyles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {journeyEntries.length === 0 && (
          <TouchableOpacity style={jStyles.emptyCard} onPress={() => setShowAddJourney(true)} activeOpacity={0.8}>
            <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
            <Text style={jStyles.emptyTitle}>Track your visa journey</Text>
            <Text style={jStyles.emptyDesc}>Add a visa application to track your progress and key milestone dates</Text>
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
                    <Text style={jStyles.stateBadgeText}>{entry.state}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {(entry.anzscoCode || entry.occupationName) && (
                    <Text style={jStyles.entryAnzsco} numberOfLines={1}>
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
                                <Text style={jStyles.datePillText}>{formatJourneyDate(date)}</Text>
                                {gap !== null && (
                                  <View style={jStyles.gapPill}>
                                    <Text style={jStyles.gapText}>+{daysLabel(gap)}</Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <Text style={jStyles.addDateText}>+ Add date</Text>
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
          <Text style={styles.sectionLabel}>Age Bracket Alerts</Text>
          <View style={styles.card}>
            {profile.birthDate ? (() => {
              const bracketAlert = calculateAgeBracketAlert(profile.birthDate);
              if (!bracketAlert) return <Text style={styles.sectionLabel}>Invalid birth date</Text>;

              return (
                <>
                  <View style={jStyles.bracketRow}>
                    <View>
                      <Text style={jStyles.bracketLabel}>Current Age</Text>
                      <Text style={jStyles.bracketValue}>{bracketAlert.currentAge}</Text>
                    </View>
                    <View>
                      <Text style={jStyles.bracketLabel}>Next Milestone</Text>
                      <Text style={jStyles.bracketValue}>{bracketAlert.nextMilestone}</Text>
                    </View>
                    <View>
                      <Text style={jStyles.bracketLabel}>Days Until</Text>
                      <Text style={jStyles.bracketValue}>{daysLabel(bracketAlert.daysUntilMilestone)}</Text>
                    </View>
                  </View>
                  {bracketAlert.alert && (
                    <View style={jStyles.bracketAlert}>
                      <Text style={jStyles.bracketAlertText}>{bracketAlert.alert}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setBirthDateInput(dateToInput(profile.birthDate!));
                      setShowBirthDatePicker(true);
                    }}
                    style={jStyles.editBirthDateBtn}
                  >
                    <Text style={jStyles.editBirthDateText}>Edit Birth Date</Text>
                  </TouchableOpacity>
                </>
              );
            })() : (
              <TouchableOpacity
                onPress={() => setShowBirthDatePicker(true)}
                style={jStyles.addBirthDateBtn}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.secondary} />
                <Text style={jStyles.addBirthDateText}>Add your birth date to track age milestones</Text>
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
                <Text style={styles.premiumTitle}>Premium Plan</Text>
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
                  <Text style={styles.premiumSub}>Active subscription</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageBillingBtn}
              onPress={() => Alert.alert('Manage Billing', 'To cancel or change your plan, go to:\n\niOS → Settings → Apple ID → Subscriptions\n\nAndroid → Play Store → Subscriptions')}
            >
              <Text style={styles.manageBillingText}>Manage</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : null}

      {/* Settings rows */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Alerts</Text>
        <View style={styles.card}>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <SettingRow
            icon={profile.isPremium ? 'star' : 'star-outline'}
            label="Current Plan"
            value={profile.isPremium ? 'Premium' : 'Free'}
          />
          {profile.isPremium && (
            <SettingRow
              icon="card-outline"
              label="Manage Billing"
              onPress={() => Alert.alert('Manage Billing', 'To cancel or change your plan, go to:\n\niOS → Settings → Apple ID → Subscriptions\n\nAndroid → Play Store → Subscriptions')}
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
        <Text style={styles.sectionLabel}>Resources</Text>
        <View style={styles.card}>
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
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
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
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <SettingRow icon="information-circle-outline" label="MigrateAU" value="v1.0.0" />
          <SettingRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://jsmglobal.xyz/migration-privacy.html')}
            showArrow
          />
          <SettingRow icon="key-outline" label="Account ID" value={rcUserId ? rcUserId.slice(0, 18) + '…' : '—'} last />
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
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
          <View style={jStyles.dateSheet}>
            <Text style={jStyles.modalTitle}>Birth Date</Text>
            <Text style={jStyles.modalSub}>For age bracket milestone alerts</Text>

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
                style={[jStyles.saveBtn, { flex: 1 }]}
                onPress={() => saveBirthDate(birthDateInput)}
                activeOpacity={0.85}
              >
                <Text style={jStyles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              {profile.birthDate && (
                <TouchableOpacity
                  style={[jStyles.cancelBtn, { flex: 1, marginTop: 0, marginLeft: Spacing.sm }]}
                  onPress={() => saveBirthDate('')}
                >
                  <Text style={[jStyles.cancelBtnText, { color: Colors.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowBirthDatePicker(false)} style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
              <Text style={jStyles.cancelBtnText}>Dismiss</Text>
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
        <View style={jStyles.modalBackdrop}>
          <View style={[jStyles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={jStyles.modalHandle} />
            <Text style={jStyles.modalTitle}>New Visa Journey</Text>
            <Text style={jStyles.modalSub}>Track progress and dates for one application</Text>

            <Text style={jStyles.fieldLabel}>Visa subclass</Text>
            <View style={jStyles.pillRow}>
              {VISA_TYPES.map((v) => {
                const active = newVisa === v;
                const c = visaColor(v);
                return (
                  <TouchableOpacity
                    key={v}
                    style={[jStyles.pill, active && { backgroundColor: `${c}22`, borderColor: c }]}
                    onPress={() => setNewVisa(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[jStyles.pillText, active && { color: c }]}>SC {v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={jStyles.fieldLabel}>State / jurisdiction</Text>
            <View style={jStyles.pillRow}>
              {STATE_OPTS.map((s) => {
                const active = newState === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[jStyles.pill, active && { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
                    onPress={() => setNewState(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[jStyles.pillText, active && { color: Colors.accent }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={jStyles.fieldLabel}>ANZSCO code or occupation name <Text style={jStyles.fieldOptional}>(optional)</Text></Text>
            <TextInput
              style={jStyles.textInput}
              value={newAnzsco}
              onChangeText={setNewAnzsco}
              placeholder="e.g. 261313 or Software Engineer"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              autoCapitalize="words"
            />

            <TouchableOpacity style={jStyles.saveBtn} onPress={addJourneyEntry} activeOpacity={0.85}>
              <Text style={jStyles.saveBtnText}>Add Journey</Text>
            </TouchableOpacity>
            <TouchableOpacity style={jStyles.cancelBtn} onPress={() => setShowAddJourney(false)}>
              <Text style={jStyles.cancelBtnText}>Cancel</Text>
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
          <View style={jStyles.dateSheet}>
            <Text style={jStyles.modalTitle}>
              {dateTarget ? JOURNEY_STAGES.find(s => s.key === dateTarget.stageKey)?.label : 'Date'}
            </Text>
            <Text style={jStyles.modalSub}>Pick the date for this milestone</Text>
            
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
                style={[jStyles.saveBtn, { flex: 1 }]}
                onPress={saveStageDateInput}
                activeOpacity={0.85}
              >
                <Text style={jStyles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              {dateInput.trim() !== '' && (
                <TouchableOpacity
                  style={[jStyles.cancelBtn, { flex: 1, marginTop: 0, marginLeft: Spacing.sm }]}
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
              <Text style={jStyles.cancelBtnText}>Dismiss</Text>
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
        <View style={feedbackStyles.backdrop}>
          <View style={[feedbackStyles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={feedbackStyles.handle} />
            <Text style={feedbackStyles.title}>Get in Touch</Text>
            <Text style={feedbackStyles.subtitle}>We read every message and aim to reply within 48 hours.</Text>

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
                  <Text style={feedbackStyles.optionLabel}>{item.label}</Text>
                  <Text style={feedbackStyles.optionDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={feedbackStyles.cancelBtn}
              onPress={() => setShowFeedback(false)}
              activeOpacity={0.8}
            >
              <Text style={feedbackStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
  return (
    <TouchableOpacity
      style={[rowStyles.row, !last && rowStyles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={(!onPress && !showArrow) || loading}
    >
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color={locked ? Colors.textMuted : Colors.textSecondary} />
      </View>
      <Text style={[rowStyles.label, locked && rowStyles.labelMuted]}>{label}</Text>
      <View style={rowStyles.right}>
        {loading
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <>
              {value && <Text style={rowStyles.value}>{value}</Text>}
              {badge && <View style={rowStyles.badge}><Text style={rowStyles.badgeText}>{badge}</Text></View>}
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
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  labelMuted: { color: Colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  value: { fontSize: FontSize.sm, color: Colors.textMuted },
  badge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: FontWeight.bold },
});

const feedbackStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
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
    color: Colors.textPrimary,
  },
  optionDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cancelBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
});

const jStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.secondary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  addBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primaryDark },

  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  emptyDesc:  { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  entryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden',
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
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: Colors.glassStrong, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  stateBadgeText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
  entryAnzsco: { fontSize: 10, color: Colors.textMuted },
  entryStage: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },

  stageList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  stageRow: { flexDirection: 'row', minHeight: 64 },
  stageConnector: { width: 32, alignItems: 'center' },
  stageDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stageDotNum: { fontSize: 9, fontWeight: '700' as const, color: Colors.textMuted },
  stageLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 1, marginBottom: 1 },

  stageInfo: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.md },
  stageNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  stageName: { fontSize: FontSize.sm, color: Colors.textSecondary },
  currentBadge: {
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  currentBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  datePillText: { fontSize: FontSize.xs, color: Colors.accent },
  gapPill: {
    backgroundColor: `${Colors.warning}22`, borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: `${Colors.warning}55`,
  },
  gapText: { fontSize: 9, color: Colors.warning, fontWeight: FontWeight.bold },
  addDateText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  fieldOptional: { fontSize: FontSize.xs, fontWeight: FontWeight.regular ?? '400', color: Colors.textMuted, textTransform: 'none' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border,
  },
  pillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
  textInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  saveBtn: {
    backgroundColor: Colors.secondary, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  saveBtnText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  cancelBtn: {
    backgroundColor: Colors.glass, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.xs,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: FontWeight.semiBold, fontSize: FontSize.md },

  dateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  dateSheet: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  dateActions: { flexDirection: 'row', gap: Spacing.sm },

  // Age Bracket Alerts
  bracketRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.divider, marginBottom: Spacing.lg,
  },
  bracketLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, marginBottom: 4 },
  bracketValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.secondary },
  bracketAlert: {
    backgroundColor: `${Colors.secondary}18`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  bracketAlertText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semiBold },
  editBirthDateBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editBirthDateText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold },
  addBirthDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.lg, justifyContent: 'center',
  },
  addBirthDateText: { fontSize: FontSize.sm, color: Colors.secondary, fontWeight: FontWeight.semiBold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

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
    backgroundColor: Colors.secondary,
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
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.primaryDark },
  manageBillingBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manageBillingText: {
    color: Colors.textPrimary,
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
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  profileName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  nameInput: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    minWidth: 160,
    paddingBottom: 2,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  saveBtnText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

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
  planText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.secondary },
  subscribeNowBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  subscribeNowText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primaryDark },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
  premiumTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  premiumSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2, maxWidth: 200 },
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },

  /* Journey NEW styles */
  journeyCard: { backgroundColor: Colors.surface },
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
