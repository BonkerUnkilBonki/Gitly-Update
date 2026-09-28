#!/usr/bin/env bash
# Build OneGit.apk without Gradle: aapt2 + javac + d8 + zipalign + apksigner
set -e
. /scratch/work/android-sdk/env.sh
ulimit -v unlimited 2>/dev/null || true

P=/scratch/work/github-oneui
B=$P/build
BT=/scratch/work/android-sdk/build-tools/34.0.0
AJ=/scratch/work/android-sdk/platforms/android-34/android.jar

rm -rf "$B"
mkdir -p "$B/gen" "$B/classes" "$B/dex"

echo "[1/6] aapt2 compile resources"
"$BT/aapt2" compile --dir "$P/res" -o "$B/res.zip"

echo "[2/6] aapt2 link"
"$BT/aapt2" link -o "$B/app.unsigned.apk" \
  -I "$AJ" \
  --manifest "$P/AndroidManifest.xml" \
  -R "$B/res.zip" \
  -A "$P/assets" \
  --java "$B/gen" \
  --auto-add-overlay

echo "[3/6] javac"
javac -source 1.8 -target 1.8 -nowarn \
  -bootclasspath "$AJ" -classpath "$AJ" \
  -d "$B/classes" \
  "$B/gen/com/onegit/R.java" $(find "$P/src" -name '*.java') 2>&1 | grep -v -e '^warning' -e 'Picked up' || true

echo "[4/6] d8 dex"
"$BT/d8" -JXmx512m --release --lib "$AJ" --min-api 24 --output "$B/dex" $(find "$B/classes" -name '*.class')

echo "[5/6] add dex to apk + zipalign"
(cd "$B/dex" && zip -q "$B/app.unsigned.apk" classes.dex)
"$BT/zipalign" -f 4 "$B/app.unsigned.apk" "$B/app.aligned.apk"

echo "[6/6] sign"
if [ ! -f "$P/debug.keystore" ]; then
  keytool -genkeypair -keystore "$P/debug.keystore" -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
    -validity 10000 -dname "CN=OneGit Debug,O=OneGit,C=IN" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$P/debug.keystore" --ks-pass pass:android \
  --out "$P/OneGit.apk" "$B/app.aligned.apk"

"$BT/apksigner" verify --print-certs "$P/OneGit.apk" | head -3
echo "BUILD OK"
ls -la "$P/OneGit.apk"
