import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Instrument, InstrumentCategory, InstrumentModel } from '../../services/userProfileService';

export type SetupStep = 'category' | 'instrument' | 'plan';

interface Props {
  categories: InstrumentCategory[];
  initialCategory?: string;
  initialInstrument?: string;
  initialPlan?: string;
  isPremium: boolean;
  loading: boolean;
  onSelectCategory: (categoryId: string) => Promise<boolean>;
  onSelectInstrument: (instrumentId: string) => Promise<boolean>;
  onSelectPlan: (planId: string) => Promise<boolean>;
}

export default function InstrumentSetup({
  categories,
  initialCategory,
  initialInstrument,
  initialPlan,
  isPremium,
  loading,
  onSelectCategory,
  onSelectInstrument,
  onSelectPlan
}: Props) {
  const [step, setStep] = useState<SetupStep>('category');
  const [selectedCat, setSelectedCat] = useState(initialCategory || '');
  const [selectedInst, setSelectedInst] = useState(initialInstrument || '');
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || 'standard');
  const [currentCategory, setCurrentCategory] = useState<InstrumentCategory | null>(null);

  useEffect(() => {
    if (step === 'instrument' && selectedCat) {
      const cat = categories.find(c => c.id === selectedCat) || null;
      setCurrentCategory(cat);
    }
  }, [step, selectedCat]);

  const renderCategory = () => (
    <View style={styles.container}>
      <Text style={styles.title}>楽器カテゴリの選択</Text>
      {categories.map((c: InstrumentCategory) => {
        const disabled = false;
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.item, selectedCat === c.id && styles.selectedItem]}
            disabled={loading}
            onPress={async () => {
              const ok = await onSelectCategory(c.id);
              if (ok) {
                setSelectedCat(c.id);
                setStep('instrument');
              }
            }}
          >
            <View style={styles.row}>
              {getIcon(c.id)}
              <Text style={styles.label}>{c.name}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderInstrument = () => (
    <View style={styles.container}>
      <Text style={styles.title}>楽器を選択</Text>
      {currentCategory?.instruments.map((i: Instrument) => (
        <TouchableOpacity
          key={i.id}
          style={[styles.item, selectedInst === i.id && styles.selectedItem]}
          disabled={loading}
          onPress={async () => {
            const ok = await onSelectInstrument(i.id);
            if (ok) {
              setSelectedInst(i.id);
              setStep('plan');
            }
          }}
        >
          <View style={styles.row}>
            {getInstrumentIcon(i.id)}
            <Text style={styles.label}>{i.name}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlan = () => (
    <View style={styles.container}>
      <Text style={styles.title}>プランを選択</Text>
      <Text style={styles.desc}>使用するAIプランを選択してください。</Text>
      {currentCategory?.instruments.find(i=>i.id===selectedInst)?.models.map((m: InstrumentModel) => (
        <TouchableOpacity
          key={m.id}
          style={[styles.item, selectedPlan === m.id && styles.selectedItem]}
          disabled={loading || (m.isArtist && !isPremium)}
          onPress={async () => {
            const ok = await onSelectPlan(m.id);
            if (ok) setSelectedPlan(m.id);
          }}
        >
          <View style={styles.rowSpace}>
            <Text style={styles.label}>{m.name.replace('モデル','プラン')}</Text>
            {m.isArtist && <Text style={styles.beta}>BETA</Text>}
            {selectedPlan===m.id && <MaterialIcons name="check" size={22} color="#007AFF" />}
          </View>
          <Text style={styles.planDesc}>
            {m.id==='standard'
              ? `${currentCategory?.instruments.find(i=>i.id===selectedInst)?.name}に特化した汎用AIを使用できます。`
              : '実際のアーティストのノウハウを学習したAIモデルを切り替えながらご利用いただけます。'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const getIcon = (catId: string) => {
    switch(catId) {
      case 'vocal': return <MaterialIcons name="mic" size={32} color="#1C1C1E" />;
      case 'piano': return <MaterialIcons name="piano" size={32} color="#1C1C1E" />;
      case 'woodwind': return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'strings': return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      default: return <MaterialIcons name="music-note" size={32} color="#1C1C1E" />;
    }
  };

  const getInstrumentIcon = (instId: string) => getIcon(instId);

  if (loading && step!=='category') {
    return <ActivityIndicator style={{marginTop:50}} size="large" color="#007AFF" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.wrapper}>
      {step==='category' && renderCategory()}
      {step==='instrument' && renderInstrument()}
      {step==='plan' && renderPlan()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 20 },
  container: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 16 },
  item: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.1, shadowRadius:2,
    elevation:2,
  },
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowSpace: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between' },
  label: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginLeft: 8, flex:1 },
  beta: { paddingHorizontal:8,paddingVertical:2,backgroundColor:'#FFCC00',borderRadius:8,fontSize:12,fontWeight:'600' },
  planDesc: { fontSize: 13, color: '#888', lineHeight:20, marginTop:6 },
}); 