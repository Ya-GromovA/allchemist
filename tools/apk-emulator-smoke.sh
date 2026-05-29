#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-/root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk}"
PACKAGE_NAME="${PACKAGE_NAME:-com.usgromov.allchemist}"
ADB="${ADB:-/opt/android-sdk/platform-tools/adb}"
APK_SIGNER="${APK_SIGNER:-/opt/android-sdk/build-tools/35.0.0/apksigner}"
SCREENSHOT_PATH="${SCREENSHOT_PATH:-/tmp/allchemist-apk-smoke.png}"
SCREENSHOT_PREFIX="${SCREENSHOT_PREFIX:-/tmp/allchemist-apk-smoke}"
UI_DUMP_PATH="${UI_DUMP_PATH:-/tmp/allchemist-apk-smoke-uiautomator.xml}"
LOG_LINES="${LOG_LINES:-500}"
EXPECTED_AVD="${EXPECTED_AVD:-allchemist_api35_aosp}"
UI_WAIT_SECONDS="${UI_WAIT_SECONDS:-18}"
LATE_WAIT_SECONDS="${LATE_WAIT_SECONDS:-8}"

BAD_SIGNAL_PATTERN="FATAL EXCEPTION| E AndroidRuntime:|SoLoaderDSONotFoundError|ReactNativeJS TypeError|Process system isn't responding|System UI isn't responding|isn't responding"

fail_with_logs() {
  local message="$1"
  printf '%s\n' "$message" >&2
  "$ADB" logcat -d -t "$LOG_LINES" >&2 || true
  exit 1
}

check_for_bad_signals() {
  local context="$1"
  local logcat
  logcat="$({ "$ADB" logcat -d -t "$LOG_LINES"; } 2>/dev/null || true)"

  if printf '%s\n' "$logcat" | grep -E "$BAD_SIGNAL_PATTERN" >/dev/null; then
    printf 'Bad Android/React Native signal found during %s.\n' "$context" >&2
    printf '%s\n' "$logcat" | grep -E "$BAD_SIGNAL_PATTERN" >&2
    exit 1
  fi
}

if [[ ! -f "$APK_PATH" ]]; then
  printf 'APK not found: %s\n' "$APK_PATH" >&2
  exit 2
fi

if [[ ! -x "$ADB" ]]; then
  printf 'adb not found or not executable: %s\n' "$ADB" >&2
  exit 2
fi

if [[ -x "$APK_SIGNER" ]]; then
  "$APK_SIGNER" verify --verbose "$APK_PATH" >/dev/null
fi

printf 'APK: %s\n' "$APK_PATH"
sha256sum "$APK_PATH"

"$ADB" wait-for-device
BOOT_COMPLETED="$({ "$ADB" shell getprop sys.boot_completed; } 2>/dev/null | tr -d '\r' || true)"
if [[ "$BOOT_COMPLETED" != "1" ]]; then
  printf 'Waiting for Android boot completion.\n'
  for _ in {1..60}; do
    sleep 2
    BOOT_COMPLETED="$({ "$ADB" shell getprop sys.boot_completed; } 2>/dev/null | tr -d '\r' || true)"
    [[ "$BOOT_COMPLETED" == "1" ]] && break
  done
fi

if [[ "$BOOT_COMPLETED" != "1" ]]; then
  fail_with_logs 'Android device did not finish booting.'
fi

AVD_NAME="$({ "$ADB" emu avd name; } 2>/dev/null | tr -d '\r' || true)"
AVD_NAME="${AVD_NAME%%$'\n'*}"
if [[ -n "$EXPECTED_AVD" && -n "$AVD_NAME" && "$AVD_NAME" != "$EXPECTED_AVD" ]]; then
  printf 'Warning: expected AVD %s, connected AVD is %s.\n' "$EXPECTED_AVD" "$AVD_NAME" >&2
fi

"$ADB" logcat -c || true

if ! "$ADB" install -r "$APK_PATH"; then
  printf 'Install with update failed. Trying clean emulator reinstall for signature-change cases.\n' >&2
  "$ADB" uninstall "$PACKAGE_NAME" >/dev/null 2>&1 || true
  "$ADB" install "$APK_PATH"
fi

"$ADB" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep "$UI_WAIT_SECONDS"
check_for_bad_signals 'initial launch wait'

PID="$("$ADB" shell pidof "$PACKAGE_NAME" | tr -d '\r' || true)"
if [[ -z "$PID" ]]; then
  fail_with_logs 'App process is not running after launch.'
fi

WINDOW_DUMP="$("$ADB" shell dumpsys window || true)"
if ! grep -q "$PACKAGE_NAME" <<<"$WINDOW_DUMP"; then
  printf 'App window is not visible/focused after launch.\n' >&2
  printf '%s\n' "$WINDOW_DUMP" >&2
  exit 1
fi

"$ADB" exec-out screencap -p > "$SCREENSHOT_PATH" || true
FIRST_LATE_SCREENSHOT="${SCREENSHOT_PREFIX}-late-1.png"
SECOND_LATE_SCREENSHOT="${SCREENSHOT_PREFIX}-late-2.png"

sleep "$LATE_WAIT_SECONDS"
check_for_bad_signals 'first late wait'
"$ADB" exec-out screencap -p > "$FIRST_LATE_SCREENSHOT" || true

sleep "$LATE_WAIT_SECONDS"
check_for_bad_signals 'second late wait'
"$ADB" exec-out screencap -p > "$SECOND_LATE_SCREENSHOT" || true

if "$ADB" exec-out uiautomator dump /dev/tty > "$UI_DUMP_PATH" 2>/dev/null; then
  if grep -E "Process system isn't responding|System UI isn't responding|isn't responding" "$UI_DUMP_PATH" >/dev/null; then
    printf 'ANR dialog text found in UI dump.\n' >&2
    grep -E "Process system isn't responding|System UI isn't responding|isn't responding" "$UI_DUMP_PATH" >&2
    exit 1
  fi
  if ! grep -q "$PACKAGE_NAME" "$UI_DUMP_PATH"; then
    printf 'App package not found in UI dump.\n' >&2
    exit 1
  fi
else
  printf 'Warning: uiautomator dump failed; continuing with screenshot/logcat checks.\n' >&2
fi

check_for_bad_signals 'final check'

printf 'APK emulator smoke passed. pid=%s screenshots=%s,%s,%s ui_dump=%s\n' "$PID" "$SCREENSHOT_PATH" "$FIRST_LATE_SCREENSHOT" "$SECOND_LATE_SCREENSHOT" "$UI_DUMP_PATH"
