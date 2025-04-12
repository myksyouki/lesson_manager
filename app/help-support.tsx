import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const HelpSupportScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();

  const openEmailSupport = () => {
    Linking.openURL('mailto:s.gobo@regnition.co.jp?subject=レッスン管理アプリに関するお問い合わせ');
  };

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
          <Text style={styles.title}>ヘルプとサポート</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            よくある質問
          </Text>

          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Q: 音声データの最大アップロードサイズはどれくらいですか？
            </Text>
            <Text style={[styles.answerText, { color: colors.text }]}>
              A: 最大100MBまでのファイルをアップロードできます。90分までの音声を推奨しています。
            </Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Q: 音声の文字起こしにはどれくらい時間がかかりますか？
            </Text>
            <Text style={[styles.answerText, { color: colors.text }]}>
              A: 音声の長さや品質によって異なりますが、通常は音声の長さの1/4〜1/2程度の時間で処理が完了します。例えば30分の音声であれば、7〜15分程度で処理が完了します。
            </Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Q: 録音した音声データはどのくらいの期間保存されますか？
            </Text>
            <Text style={[styles.answerText, { color: colors.text }]}>
              A: 音声データは12ヶ月間保存されます。その後は自動的に削除または匿名化されます。保存期間内であれば、いつでもデータの削除をリクエストすることができます。
            </Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Q: 先生や他の参加者の同意なしにレッスンを録音しても大丈夫ですか？
            </Text>
            <Text style={[styles.answerText, { color: colors.text }]}>
              A: いいえ、録音する前に必ず全ての参加者から同意を得てください。同意なく録音することは法律違反や利用規約違反になる可能性があります。詳しくは利用規約の第6条をご確認ください。
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            基本的な使い方
          </Text>

          <View style={styles.guideSection}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              1. レッスンの録音
            </Text>
            <Text style={[styles.guideText, { color: colors.text }]}>
              ホーム画面の「+」ボタンをタップし、「レッスン」を選択して新規レッスンを作成します。レッスン名を入力し、「録音開始」をタップすると録音が始まります。
            </Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              2. 録音済み音声のアップロード
            </Text>
            <Text style={[styles.guideText, { color: colors.text }]}>
              ホーム画面の「+」ボタン、「レッスン」を選択後、「音声をアップロード」から端末内の音声ファイルを選択してアップロードできます。
            </Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              3. 文字起こしと要約の確認
            </Text>
            <Text style={[styles.guideText, { color: colors.text }]}>
              音声処理が完了すると、レッスン一覧に表示されます。レッスンをタップすると文字起こしと要約内容を確認できます。
            </Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              4. AIに練習方法を相談する
            </Text>
            <Text style={[styles.guideText, { color: colors.text }]}>
              AIレッスンタブから、チャットルームを選択してAIに練習方法を相談できます。レッスン詳細画面からも直接練習メニュー生成ができます。
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            お問い合わせ
          </Text>

          <Text style={[styles.contactText, { color: colors.text }]}>
            アプリに関するご質問、不具合の報告、機能改善のご提案などは以下の連絡先までお願いします。
          </Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={openEmailSupport}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>メールでお問い合わせ</Text>
          </TouchableOpacity>

          <Text style={[styles.contactDetails, { color: colors.text }]}>
            会社名：株式会社レグニション{'\n'}
            メール：s.gobo@regnition.co.jp{'\n'}
            対応時間：平日10:00〜18:00（土日祝日・年末年始を除く）
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
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A6572',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  guideSection: {
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#4A6572',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  contactDetails: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
    marginTop: 8,
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

export default HelpSupportScreen; 