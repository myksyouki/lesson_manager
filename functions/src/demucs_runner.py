import sys
import os
import torch
from demucs import separate
from google.cloud import storage

# Firebase Storage クライアント設定
storage_client = storage.Client()
bucket_name = "lesson-manager-99ab9.appspot.com"
bucket = storage_client.bucket(bucket_name)

# 入力ファイルパスを取得
file_path = sys.argv[1]
local_input_path = f"/tmp/{os.path.basename(file_path)}"
local_output_dir = "/tmp/demucs_output"

# ファイルを Firebase Storage からダウンロード
blob = bucket.blob(file_path)
blob.download_to_filename(local_input_path)
print(f"✅ 音声ファイルをダウンロードしました: {local_input_path}")

# Demucs の設定
model_name = "htdemucs"
output_dir = local_output_dir
os.makedirs(output_dir, exist_ok=True)

# Demucs で音声を分離
print(f"🎵 Demucs を実行中...")
separate.main(["--model", model_name, "--out", output_dir, local_input_path])

# 分離された音声を Firebase Storage にアップロード
for filename in os.listdir(output_dir):
    if filename.endswith(".wav"):
        local_file_path = os.path.join(output_dir, filename)
        output_blob = bucket.blob(f"demucs_output/{filename}")
        output_blob.upload_from_filename(local_file_path)
        print(f"✅ 分離された音声をアップロードしました: {filename}")

print("🎉 Demucs 処理完了！")