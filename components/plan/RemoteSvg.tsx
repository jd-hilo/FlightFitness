import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { theme } from '@/constants/theme';

const xmlCache = new Map<string, string>();

type Props = {
  uri: string;
  width: number;
  height: number;
};

export function RemoteSvg({ uri, width, height }: Props) {
  const [xml, setXml] = useState<string | null>(() => xmlCache.get(uri) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (xmlCache.has(uri)) {
      setXml(xmlCache.get(uri)!);
      return;
    }

    let cancelled = false;
    setFailed(false);

    void fetch(uri)
      .then((res) => {
        if (!res.ok) throw new Error(`SVG fetch ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        xmlCache.set(uri, text);
        setXml(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (failed) {
    return <View style={[styles.placeholder, { width, height }]} />;
  }

  if (!xml) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <ActivityIndicator size="small" color={theme.colors.gold} />
      </View>
    );
  }

  return <SvgXml xml={xml} width={width} height={height} />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainer,
  },
});
