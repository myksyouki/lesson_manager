from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, storage, firestore
import subprocess
import os
import whisper

# Firebase 認証
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {"storageBucket": "lesson-manager-99ab9.firebasestorage.app"})
db = firestore.client()

app = Flask(__name__)

@app.route("/process-audio", methods=["POST"])
def process_audio():
    print("🔍 process-audio 関数が呼ばれました")  # デバッグログ
    data = request.json
    audio_url = data.get("audioUrl")
    file_name = data.get("fileName")

    if not audio_url:
        return jsonify({"error": "No audio URL provided"}), 400

    local_path = f"/tmp/{file_name}"
    output_dir = "/tmp/demucs_output"

    # 音声ファイルをダウンロード
    os.system(f"wget -O {local_path} {audio_url}")

    # Demucs で音声分離
    os.makedirs(output_dir, exist_ok=True)
    subprocess.run(["demucs", "-o", output_dir, local_path], check=True)

    # 分離した音声を Whisper で文字起こし
    model = whisper.load_model("base")
    transcription = model.transcribe(local_path)["text"]

    # Firestore に保存
    db.collection("lessons").add({
        "fileName": file_name,
        "audioUrl": audio_url,
        "transcription": transcription,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    return jsonify({"message": "Processing completed", "transcription": transcription})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))  # 環境変数から PORT を取得
    print(f"🚀 Starting server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)  # ✅ ポートを明示的に指定
