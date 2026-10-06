const $ = (id) => document.getElementById(id);

const state = {
  stream: null,
  recorder: null,
  running: false,
  sending: false
};

const settings = {
  fontFamily: $("fontFamily"),
  fontSize: $("fontSize"),
  position: $("position"),
  maxLines: $("maxLines"),
  textColor: $("textColor"),
  strokeColor: $("strokeColor"),
  strokeWidth: $("strokeWidth"),
  shadow: $("shadow")
};

function saveSettings() {
  const data = {};
  for (const [key, el] of Object.entries(settings)) data[key] = el.value;
  localStorage.setItem("liveSubtitleSettings", JSON.stringify(data));
  localStorage.setItem("liveSubtitleInputLanguage", $("inputLanguage").value);
  localStorage.setItem("liveSubtitleTargetLanguage", $("targetLanguage").value);
  localStorage.setItem("liveSubtitleChunkSeconds", $("chunkSeconds").value);
}

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem("liveSubtitleSettings") || "{}");
    for (const [key, value] of Object.entries(data)) if (settings[key]) settings[key].value = value;
    if (localStorage.getItem("liveSubtitleInputLanguage")) $("inputLanguage").value = localStorage.getItem("liveSubtitleInputLanguage");
    if (localStorage.getItem("liveSubtitleTargetLanguage")) $("targetLanguage").value = localStorage.getItem("liveSubtitleTargetLanguage");
    if (localStorage.getItem("liveSubtitleChunkSeconds")) $("chunkSeconds").value = localStorage.getItem("liveSubtitleChunkSeconds");
  } catch {}
  updatePreview();
}

function updatePreview() {
  $("fontSizeValue").textContent = `${settings.fontSize.value}px`;
  $("strokeWidthValue").textContent = `${settings.strokeWidth.value}px`;
  $("shadowValue").textContent = `${settings.shadow.value}px`;

  const p = $("previewText");
  p.style.fontFamily = settings.fontFamily.value;
  p.style.fontSize = `${settings.fontSize.value}px`;
  p.style.color = settings.textColor.value;
  p.style.webkitTextStroke = `${settings.strokeWidth.value}px ${settings.strokeColor.value}`;
  p.style.textShadow = `0 0 ${settings.shadow.value}px rgba(0,0,0,.95)`;
}

function subtitleSettings() {
  return {
    fontFamily: settings.fontFamily.value,
    fontSize: Number(settings.fontSize.value),
    position: settings.position.value,
    maxLines: Number(settings.maxLines.value),
    textColor: settings.textColor.value,
    strokeColor: settings.strokeColor.value,
    strokeWidth: Number(settings.strokeWidth.value),
    shadow: Number(settings.shadow.value)
  };
}

function broadcastSettings() {
  localStorage.setItem("liveSubtitleLiveSettings", JSON.stringify(subtitleSettings()));
  window.dispatchEvent(new Event("storage"));
}

for (const el of Object.values(settings)) {
  el.addEventListener("input", () => {
    updatePreview();
    saveSettings();
    broadcastSettings();
  });
}
$("inputLanguage").addEventListener("change", saveSettings);
$("targetLanguage").addEventListener("change", saveSettings);
$("chunkSeconds").addEventListener("change", saveSettings);

async function loadMicrophones() {
  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach(t => t.stop());
  } catch (e) {
    $("error").textContent = "Microphone permission is required.";
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(d => d.kind === "audioinput");
  $("mic").innerHTML = "";
  inputs.forEach((device, i) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Microphone ${i + 1}`;
    $("mic").appendChild(option);
  });
}

function setStatus(text, live = false) {
  $("statusText").textContent = text;
  $("statusDot").classList.toggle("live", live);
}

async function sendChunk(blob) {
  if (!blob.size || state.sending || !state.running) return;
  state.sending = true;

  const started = performance.now();
  const form = new FormData();
  form.append("audio", blob, "audio.webm");
  form.append("inputLanguage", $("inputLanguage").value);
  form.append("targetLanguage", $("targetLanguage").value);

  try {
    const response = await fetch("/api/transcribe-translate", {
      method: "POST",
      body: form
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Server error");

    $("latencyText").textContent = `${Math.round(performance.now() - started)} ms`;

    if (data.translated) {
      localStorage.setItem("liveSubtitleText", data.translated);
      localStorage.setItem("liveSubtitleOriginal", data.original || "");
      localStorage.setItem("liveSubtitleUpdated", String(Date.now()));
      setStatus("Listening", true);
    }
  } catch (error) {
    $("error").textContent = error.message;
    setStatus("Error");
  } finally {
    state.sending = false;
  }
}

async function start() {
  $("error").textContent = "";
  saveSettings();
  broadcastSettings();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: $("mic").value ? { exact: $("mic").value } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    state.stream = stream;
    state.running = true;

    const seconds = Number($("chunkSeconds").value);
    state.recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

    state.recorder.ondataavailable = (event) => {
      if (event.data.size) sendChunk(event.data);
    };

    state.recorder.start(seconds * 1000);

    $("startBtn").disabled = true;
    $("stopBtn").disabled = false;
    setStatus("Listening", true);
  } catch (error) {
    $("error").textContent = error.message || "Could not start microphone.";
  }
}

function stop() {
  state.running = false;
  if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  state.stream?.getTracks().forEach(t => t.stop());
  state.stream = null;
  state.recorder = null;
  $("startBtn").disabled = false;
  $("stopBtn").disabled = true;
  setStatus("Stopped");
}

$("startBtn").addEventListener("click", start);
$("stopBtn").addEventListener("click", stop);

loadSettings();
loadMicrophones();
