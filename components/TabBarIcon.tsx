import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type TabBarIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

export default function TabBarIcon(props: TabBarIconProps) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
} 