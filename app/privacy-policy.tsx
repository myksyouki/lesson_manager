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

const PrivacyPolicyScreen = () => {
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
          <Text style={styles.title}>プライバシーポリシー</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.updateDate, { color: colors.text }]}>
            最終更新日：第二版 [2025/04/11]
          </Text>

          <Text style={[styles.text, { color: colors.text }]}>
            本プライバシーポリシー（以下「本ポリシー」といいます。）は、株式会社レグニション（以下「当社」といいます。）が提供するアプリケーションおよび関連サービス（以下「本サービス」といいます。）において収集・利用する個人情報等の取り扱いについて定めるものです。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第1条（個人情報の定義）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            本ポリシーにおいて「個人情報」とは、個人情報保護法その他関連法令に定める「個人情報」をいいます。音声データや録音対象者の氏名・メールアドレスなど、個人を識別し得る情報を含むものとします。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第2条（取得する情報および取得方法）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、本サービスの利用に際し、以下の情報を取得する場合があります。
            {'\n'}  - アカウント登録情報（氏名、メールアドレス、パスワード等）
            {'\n'}  - レッスン音声データ（録音データ）およびそれに付随するテキストデータ（文字起こし結果、要約結果など）
            {'\n'}  - マイク入力による音声データ（チューナー機能使用時のみ）
            {'\n'}  - 本サービスの利用履歴（アクセスログ、IPアドレス、クッキー情報など）
            {'\n\n'}2. 当社は、適法かつ公正な手段により個人情報を取得し、ユーザーに対して録音対象者からの同意取得を含む必要な手続を行うよう促します。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第3条（利用目的）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            当社は、取得した個人情報を以下の目的のために利用します。
            {'\n\n'}1. 当社は、ユーザーまたは録音対象者から取得した音声データならびにその文字起こし結果（以下、「録音データ等」といいます）を、以下の目的の範囲内で利用します。
            {'\n\n'}  1) レッスンマネージャー機能・AIレッスン機能の提供
            {'\n'}     ユーザーに対してレッスン内容の録音、文字起こし、要約、練習方針の提案などを行うため。
            {'\n\n'}  2) 音楽練習支援機能（チューナー・メトロノーム機能）の提供
            {'\n'}     チューナー機能使用時に、楽器や声の音程を解析するためにマイク録音を利用します。
            {'\n'}     この録音データは音程解析の目的でのみ一時的に使用され、解析後は保存されません。
            {'\n'}     また、これらの音声データは端末内でのみ処理され、サーバーに送信されることはありません。
            {'\n\n'}  3) サービス品質の向上・解析・学習
            {'\n'}     録音データ等を分析し、アルゴリズムの改善やエラー修正、品質向上、新機能開発のために活用するため。
            {'\n'}     - 個人を特定できない形での統計分析・匿名加工等を行い、本サービスの改善や機能追加の参考とする場合を含みます。
            {'\n\n'}  4) 新機能の研究開発・サービス拡張
            {'\n'}     録音データ等をもとにしたAI技術や関連ソフトウェアの研究開発、本サービスと関連する他サービスへの展開、将来的な製品化に向けたデータ解析のため。
            {'\n'}     - 開発・研究結果を学会発表や技術資料として公表する場合は、個人を特定できない形で取り扱います。
            {'\n\n'}  5) 本サービスに関する情報提供・マーケティング活動
            {'\n'}     ユーザーに対し、本サービスや関連サービスの各種お知らせ、イベント情報、キャンペーン情報等を提供するため。
            {'\n\n'}  6) ユーザーサポート対応・問い合わせ対応
            {'\n'}     ユーザーからの問い合わせに回答し、問題解決やサポートを提供するため。
            {'\n\n'}  7) 不正利用や規約違反行為の検知・予防・対応
            {'\n'}     録音データ等を解析し、サービスの安全性や公平性を脅かす不正行為や規約違反行為を監視・検知し、これに対処するため。
            {'\n\n'}  8) 法令に基づく要請への対応
            {'\n'}     裁判所や行政機関等、法的権限を有する第三者から開示等を求められた場合に、関連法令を遵守して対応するため。
            {'\n\n'}  9) その他、上記に関連または付随する目的
            {'\n'}     上記各号の利用目的に合理的に関連する範囲において、録音データ等を利用する場合があります。
            {'\n\n'}2. 当社は、上記目的の範囲を超えて録音データ等を利用する必要が生じた場合、あらかじめユーザーに対し、目的外利用の内容等を説明し、必要に応じて同意を取得します。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第4条（外部提供・委託の管理）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、音声データの文字起こし・解析などを外部サービスに委託する場合があります。
            {'\n\n'}2. 外部サービスが海外に所在する場合、音声データが海外に送信されることになります。ユーザーおよび録音対象者は、この点に同意したうえで本サービスを利用するものとします。
            {'\n\n'}3. 当社は、外部サービスとの間で、データの安全管理措置、守秘義務、再提供の禁止などを定めた契約（DPAやNDA等）を締結し、適切な監督を行います。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第5条（保存期間と削除）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、録音データおよび文字起こし結果を12ヶ月間保存した後、速やかに削除または匿名化するよう努めます。
            {'\n\n'}2. チューナー機能で使用されるマイク入力データは、音程解析のために一時的に使用されるのみで、保存されることはありません。
            {'\n\n'}3. ユーザーまたは録音対象者が削除を希望する場合、当社所定の方法で申請することで削除に応じます。ただし、本サービスの運営に必須の情報や法令等で定める保存義務がある情報については、この限りではありません。
            {'\n\n'}4. アカウント削除時のデータ取り扱いについて
            {'\n'}  a) ユーザーがアカウント削除を要求した場合、下記の対応を行います：
            {'\n'}     - ユーザー識別情報（名前、メールアドレス、プロフィール等）を完全に削除
            {'\n'}     - 認証情報および個人を特定できる情報を完全に削除
            {'\n\n'}  b) チャットデータやレッスン内容等のコンテンツデータについては以下のように処理します：
            {'\n'}     - データを匿名化し、個人を特定できる情報を削除または置換
            {'\n'}     - サービス品質向上のため、匿名化されたコンテンツデータは保持される場合があります
            {'\n'}     - 匿名化されたデータは元のユーザーと紐づけることはできません
            {'\n\n'}  c) 完全削除オプション：全データの完全削除を希望する場合は、アカウント削除時にその旨を明示してください。
            {'\n\n'}5. 削除後のデータ利用：匿名化された練習記録やチャットデータはサービス改善、AI学習、統計分析などの目的で使用される場合があります。これらの匿名データから個人を特定することはできません。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第6条（セキュリティ対策）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、個人情報の漏えい、滅失または毀損等を防止するため、通信暗号化（TLS/SSL）、保存時の暗号化（AES等）、アクセス制御などの適切なセキュリティ対策を講じます。
            {'\n\n'}2. 当社は、従業者および委託先に対して、個人情報保護に関する教育・監督を実施します。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第7条（第三者提供）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            当社は、以下の場合を除き、あらかじめ本人の同意を得ることなく個人情報を第三者に提供することはありません。
            {'\n\n'}1. 法令に基づく場合
            {'\n'}2. 人の生命、身体または財産の保護のために必要で、本人の同意を得ることが困難な場合
            {'\n'}3. 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合で、本人の同意を得ることが困難な場合
            {'\n'}4. 国の機関または地方公共団体が法令の定める事務を遂行するため協力が必要な場合
            {'\n'}5. 事業譲渡や合併などに伴う事業継承により個人情報が提供される場合（継承先が本ポリシーと同様の取扱いを行う場合に限る）
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第8条（利用者の権利）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. ユーザーは、当社に対し、自己の個人情報について開示、訂正、追加または削除、利用停止、第三者提供停止の請求を行うことができます。
            {'\n\n'}2. 前項の請求を行う場合、ユーザーは当社の定める方法により申請してください。当社は、ユーザー本人であることを確認したうえで、法令に従い対応します。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第9条（海外提供）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 本サービスの利用において、音声データや個人情報が海外のサーバーに保存され、または処理されることがあります。
            {'\n\n'}2. 当社は、海外への個人情報移転について、適用される法令に従い、必要な措置を講じます。ユーザーおよび録音対象者は、国外のデータ保護規制が日本国内とは異なる場合があることを理解し、これに同意するものとします。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第10条（プライバシーポリシーの変更）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            1. 当社は、本ポリシーを適宜変更することができます。
            {'\n\n'}2. 変更があった場合、当社は本サービス上または適切な方法で周知し、変更後のポリシーの効力発生日以降は、変更後の内容が適用されます。
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            第11条（お問い合わせ窓口）
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            本ポリシーに関するご質問や個人情報に関するお問い合わせは、下記窓口までお願いいたします。
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

export default PrivacyPolicyScreen;
