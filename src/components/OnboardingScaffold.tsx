import React from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MONO, useTheme } from '../theme';

const { width } = Dimensions.get('window');

type Props = {
  title: string;
  lines: string[];
  image: string;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  onGoTo?: (i: number) => void;
};

export default function OnboardingScaffold({
  title,
  lines,
  image,
  index,
  total,
  onNext,
  onSkip,
  onClose,
  onGoTo,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [barWidth, setBarWidth] = React.useState<number>(0);

  // PanResponder for swipe left/right navigation
  const panRef = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Start responding when horizontal movement is more pronounced than vertical
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { dx, dy, vx } = gestureState;
        // threshold for swipe
        const SWIPE_DISTANCE = 60;
        const SWIPE_VELOCITY = 0.2;

        if (dx < -SWIPE_DISTANCE && Math.abs(vx) > SWIPE_VELOCITY) {
          // swipe left -> next
          onNext && onNext();
        } else if (dx > SWIPE_DISTANCE && Math.abs(vx) > SWIPE_VELOCITY) {
          // swipe right -> previous
          if (onGoTo && index > 0) {
            onGoTo(index - 1);
          }
        }
      },
    })
  ).current;

  return (
  <View
      {...panRef.panHandlers}
      style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: theme.colors?.background ?? MONO.white }]}
    >
      {/* Top nav */}
      <View style={styles.topNav} pointerEvents="box-none">
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.colors?.primary ?? MONO.black }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: (theme.colors as any)?.secondary ?? MONO.gray500 }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.colors?.onSurface ?? MONO.black }]}>{title}</Text>
          {lines.map((l, i) => (
            <Text key={i} style={[styles.subtitle, { color: (theme.colors as any)?.secondary ?? MONO.gray500 }]}>
              {l}
            </Text>
          ))}
        </View>
      </View>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Progress bar (react-native-paper) replaces dots */}
        <Pressable
          onPressIn={(e: any) => {
            const x = e.nativeEvent.locationX as number;
            if (!onGoTo || barWidth === 0) return;
            const target = Math.floor((x / barWidth) * total);
            const clamped = Math.max(0, Math.min(total - 1, target));
            onGoTo(clamped);
          }}
          onLayout={(e: any) => setBarWidth(e.nativeEvent.layout.width)}
          style={styles.progressWrap}
          accessibilityRole="adjustable"
          accessibilityLabel={`Onboarding progress ${index + 1} of ${total}`}
        >
          <ProgressBar
            progress={((index + 1) / total)}
            color={theme.colors?.primary ?? MONO.black}
            style={[styles.progressBackground, { backgroundColor: (theme.colors as any)?.surfaceVariant ?? MONO.gray100 }]}
          />
        </Pressable>

        <TouchableOpacity onPress={onNext} style={[styles.nextButton, { backgroundColor: theme.colors?.primary ?? MONO.black }]} activeOpacity={0.85}>
          <Text style={[styles.nextText, { color: (theme.colors as any)?.onPrimary ?? MONO.white }]}>{index === total - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically in component
  },
  topNav: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipButton: {},
  skipText: { fontSize: 16, fontWeight: '600' }, // color will be set dynamically
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 20 }, // color will be set dynamically
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  image: { width: Math.min(320, width - 80), height: Math.min(320, width - 80), marginBottom: 20 },
  textWrap: { alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' }, // color will be set dynamically
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 }, // color will be set dynamically
  bottomNav: { height: 96, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 8, marginHorizontal: 6 },
  dotActive: { transform: [{ scale: 1.2 }] }, // backgroundColor will be set dynamically
  dotInactive: { backgroundColor: MONO.gray300 },
  progressWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  progressBackground: { height: 8, borderRadius: 8, overflow: 'hidden' }, // backgroundColor will be set dynamically
  progressFill: { height: '100%' },
  nextButton: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set dynamically
  },
  nextText: { fontWeight: '700', fontSize: 16 }, // color will be set dynamically
});
