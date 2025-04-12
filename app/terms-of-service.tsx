import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TermsOfServiceScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>利用規約</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.updateDate, { color: colors.text }]}>
            最終更新日：第一版 [2025/03/21]
          </Text>

          <Text style={[styles.text, { color: colors.text }]}>
            本利用規約（以下「本規約」といいます。）は、株式会社レグニション（以下「当社」といいます。）が提供するアプリケーションおよび関連サービス（以下「本サービス」といいます。）の利用条件を定めるものです。ユーザー（本サービスを利用するすべての方）は、本規約に同意のうえ、本サービスをご利用ください。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第1条（適用）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 本規約は、ユーザーと当社との間の本サービス利用に関する一切の関係に適用されるものとします。
            {'\n\n'}2. 当社は本サービスに関して、本規約のほか、利用上のルールやガイドラインなどを定めることがあります。これらは本規約の一部を構成するものとし、ユーザーはあわせて遵守しなければなりません。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第2条（サービス概要）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 本サービスを利用することで、ユーザーは自身の録音した音声データを当社が指定する方法でアップロードし、当社または当社が契約する外部サービスのAI機能を利用して解析させることに同意するものとします。
            {'\n\n'}2. 音声データに第三者（講師や他の参加者など）が含まれる場合、ユーザーはかかる第三者から録音・解析・保存・利用に関する十分な同意を得たうえで本サービスを利用しなければなりません（詳細は第6条参照）。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第3条（同意取得と利用目的の明示）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. ユーザーは録音を行う前に、録音の対象となる講師や参加者（以下総称して「録音対象者」といいます）に対して、「本サービスを利用し、レッスン内容を録音・文字起こし・要約し、12ヶ月保存する旨を明確に告知し、同意を得るものとします。
            {'\n\n'}2. 当社は、音声データおよびその文字起こし結果を、以下の目的の範囲内でのみ利用します。
            {'\n\n'}  1) 当社は、ユーザーまたは録音対象者から取得した音声データならびにその文字起こし結果（以下、「録音データ等」といいます）を、以下の目的の範囲内で利用します。
            {'\n\n'}    a) レッスンマネージャー機能・AIレッスン機能の提供
            {'\n'}       ユーザーに対してレッスン内容の録音、文字起こし、要約、練習方針の提案などを行うため。
            {'\n\n'}    b) サービス品質の向上・解析・学習
            {'\n'}       録音データ等を分析し、アルゴリズムの改善やエラー修正、品質向上、新機能開発のために活用するため。
            {'\n'}       - 個人を特定できない形での統計分析・匿名加工等を行い、本サービスの改善や機能追加の参考とする場合を含みます。
            {'\n\n'}    c) 新機能の研究開発・サービス拡張
            {'\n'}       録音データ等をもとにしたAI技術や関連ソフトウェアの研究開発、本サービスと関連する他サービスへの展開、将来的な製品化に向けたデータ解析のため。
            {'\n'}       - 開発・研究結果を学会発表や技術資料として公表する場合は、個人を特定できない形で取り扱います。
            {'\n\n'}    d) 本サービスに関する情報提供・マーケティング活動
            {'\n'}       ユーザーに対し、本サービスや関連サービスの各種お知らせ、イベント情報、キャンペーン情報等を提供するため。
            {'\n\n'}    e) ユーザーサポート対応・問い合わせ対応
            {'\n'}       ユーザーからの問い合わせに回答し、問題解決やサポートを提供するため。
            {'\n\n'}    f) 不正利用や規約違反行為の検知・予防・対応
            {'\n'}       録音データ等を解析し、サービスの安全性や公平性を脅かす不正行為や規約違反行為を監視・検知し、これに対処するため。
            {'\n\n'}    g) 法令に基づく要請への対応
            {'\n'}       裁判所や行政機関等、法的権限を有する第三者から開示等を求められた場合に、関連法令を遵守して対応するため。
            {'\n\n'}    h) その他、上記に関連または付随する目的
            {'\n'}       上記各号の利用目的に合理的に関連する範囲において、録音データ等を利用する場合があります。
            {'\n\n'}  2) 当社は、上記目的の範囲を超えて録音データ等を利用する必要が生じた場合、あらかじめユーザーに対し、目的外利用の内容等を説明し、必要に応じて同意を取得します。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第4条（アカウント登録）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. ユーザーは、本サービスの利用にあたり当社の定める方法によりアカウントの登録を行う場合があります。
            {'\n\n'}2. 登録にあたり、ユーザーは真実かつ正確な情報を提供し、常に最新の状態に更新するよう努めるものとします。
            {'\n\n'}3. 当社は、ユーザーが本規約に違反する行為を行った場合、またはそのおそれがあると判断した場合、当該ユーザーのアカウントを一時停止または削除することができます。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第5条（外部サービスの利用・海外への提供）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 音声データの文字起こし・解析には、当社が契約する外部サービスを利用する場合があります。
            {'\n\n'}2. 当該外部サービスが海外に拠点を持つ場合、音声データが同国へ送信され、現地のセキュリティ基準に基づいて処理されることにユーザーは同意します。
            {'\n\n'}3. 当社は、外部サービスとの契約において、データ保護に関する条項（再利用・再配布禁止、処理後のデータ削除など）を定めるよう努めます。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第6条（講師・第三者の権利保護）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. ユーザーが録音する音声に講師やその他第三者の声が含まれる場合、ユーザーは事前に録音対象者から録音・解析・保存・利用に関する同意を取得する責任を負います。
            {'\n\n'}2. 録音対象者が同意しない旨を表明した場合には、録音を行ってはならず、本サービスへのアップロードも禁止します。
            {'\n\n'}3. 本条の義務違反により第三者から請求・苦情があった場合、ユーザーは自己の責任と費用負担において解決しなければならず、当社は一切の責任を負いません。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第7条（禁止事項）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            ユーザーは、本サービスの利用にあたり、以下に定める行為を行ってはなりません。
            {'\n\n'}1. 法令や公序良俗に反する行為
            {'\n'}2. 当社や第三者の権利（著作権、プライバシー、肖像権など）を侵害する行為
            {'\n'}3. 本サービスの運営を妨害する行為
            {'\n'}4. 録音対象者の同意を得ない録音や、目的外利用・無断公開などの行為
            {'\n'}5. その他、当社が不適切と判断する行為
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第8条（セキュリティ対策）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、音声データならびに解析結果（文字起こし等）を安全に取り扱うため、技術的・組織的に適切なセキュリティ対策（通信暗号化、保存時の暗号化、アクセス権限の制限など）を講じます。
            {'\n\n'}2. ユーザーは、自身のアカウント情報を第三者に開示せず、適切に管理する義務を負います。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第9条（免責事項）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、本サービスにおいて提供される情報の正確性・完全性・有用性などを保証しません。
            {'\n\n'}2. ユーザーが本サービスを利用したことにより生じた損害（録音対象者とのトラブルやデータ漏洩など）について、当社の故意または重大な過失による場合を除き、一切の責任を負わないものとします。
            {'\n\n'}3. 外部サービスの利用時に生じる不具合や障害等についても、当社は責任を負いません。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第10条（利用規約の変更）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、必要と判断した場合、本規約を変更することができます。
            {'\n\n'}2. 規約を変更する場合、当社は変更内容とその効力発生日を本サービス上または適切な方法で周知し、効力発生日以降の利用については、変更後の規約が適用されます。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第11条（準拠法および管轄）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 本規約の準拠法は、日本法とします。
            {'\n\n'}2. 本規約または本サービスに関して紛争が生じた場合、東京地方裁判所又は東京簡易裁判所を専属的合意管轄裁判所とします。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第12条（お問い合わせ）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            本規約に関するお問い合わせは、以下の窓口までお願いいたします。
            {'\n\n'}- 事業者名：株式会社レグニション
            {'\n'}- 連絡先： s.gobo@regnition.co.jp
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.backToTopButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  updateDate: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  backToTopButton: {
    flexDirection: 'row',
    backgroundColor: '#4A6572',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backToTopButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default TermsOfServiceScreen; 