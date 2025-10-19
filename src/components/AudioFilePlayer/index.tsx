import Slider from '@react-native-community/slider';
import Icon from '@react-native-vector-icons/material-design-icons';
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import RNFS from 'react-native-fs';
import { Text, useTheme } from 'react-native-paper';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

type Props = {
  filePath: string;
  _onDeleted?: (filePath: string) => void;
  _autoPlay?: boolean;
};

const fmt = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

export default function AudioFilePlayer({
  filePath,
  _onDeleted,
  _autoPlay,
}: Props) {
  const theme = useTheme();

  // ensure a proper file:// url for decode
  const sourceUrl = useMemo(() => {
    if (!filePath) return '';
    if (filePath.startsWith('https')) return filePath;
    if (filePath.startsWith('content://')) return filePath; // leave content:// as-is
    return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
  }, [filePath]);
  const {
    isPlaying,
    isLoading,
    duration,
    progress,
    togglePlayPause,
    seekTo,
    // stop,
    loadError,
  } = useAudioPlayer({ audioUrl: sourceUrl });

  const [exists, setExists] = useState<boolean | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  // show hook-level load errors too
  React.useEffect(() => {
    if (loadError && typeof loadError === 'string') setDiagnostic(loadError);
  }, [loadError]);

  // check file existence for local paths
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!sourceUrl) {
          if (mounted) setExists(null);
          return;
        }
        // strip file:// for RNFS.exists on Android/iOS which accepts both
        const path = sourceUrl.startsWith('file://')
          ? sourceUrl.replace('file://', '')
          : sourceUrl;
        // Checking if audio file exists
        const ok = await RNFS.exists(path);
        if (mounted) setExists(ok);
        if (!ok) setDiagnostic('File not found on device');
        else setDiagnostic(null);
      } catch (e: any) {
        if (mounted) setExists(false);
        setDiagnostic(e?.message ?? String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sourceUrl]);

  React.useEffect(() => {
    // Audio file diagnostic info available
  }, [sourceUrl, exists, diagnostic, duration]);

  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? progress;

  // const _deleteFile = async () => {
  //   try {
  //     await stop();
  //   } catch {}
  //   try {
  //     const exists = await RNFS.exists(filePath);
  //     if (exists) await RNFS.unlink(filePath);
  //     onDeleted?.(filePath);
  //   } catch (e: any) {
  //     Alert.alert('Delete failed', e?.message ?? 'Could not delete the file.');
  //   }
  // };

  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.outline,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={togglePlayPause}
          style={[
            styles.btn,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
              borderWidth: 1,
            },
            isPlaying && { backgroundColor: theme.colors.primary },
          ]}
          disabled={isLoading || !duration}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={isPlaying ? theme.colors.onPrimary : theme.colors.onSurface}
          />
        </TouchableOpacity>

        <View style={styles.sliderWrap}>
          {diagnostic ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 6 }}
            >
              {diagnostic}
            </Text>
          ) : null}
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(1, duration)}
            value={value}
            step={50}
            onValueChange={v => setDrag(v)}
            onSlidingComplete={v => {
              setDrag(null);
              seekTo(v);
            }}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.outline}
            thumbTintColor={theme.colors.primary}
          />
          <View style={styles.timeRow}>
            <Text
              variant="labelSmall"
              style={[styles.timeText, { color: theme.colors.onSurface }]}
            >
              {fmt(value)}
            </Text>
            <Text
              variant="labelSmall"
              style={[styles.timeText, { color: theme.colors.onSurface }]}
            >
              {fmt(duration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    minWidth: 240,
    minHeight: 64, // prevent compression
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  btnDel: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.95)',
  },
  sliderWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    // color will be set dynamically
  },
});
