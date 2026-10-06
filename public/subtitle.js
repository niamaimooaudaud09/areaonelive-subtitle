const subtitle = document.getElementById("subtitle");

function applySettings() {
  try {
    const s = JSON.parse(localStorage.getItem("liveSubtitleLiveSettings") || "{}");
    if (s.fontFamily) subtitle.style.fontFamily = s.fontFamily;
    if (s.fontSize) subtitle.style.fontSize = `${s.fontSize}px`;
    if (s.textColor) subtitle.style.color = s.textColor;
    if (s.strokeColor && s.strokeWidth !== undefined) {
      subtitle.style.webkitTextStroke = `${s.strokeWidth}px ${s.strokeColor}`;
    }
    if (s.shadow !== undefined) {
      subtitle.style.textShadow = `0 0 ${s.shadow}px rgba(0,0,0,.95)`;
    }
    subtitle.classList.remove("top", "center", "bottom");
    subtitle.classList.add(s.position || "bottom");
  } catch {}
}

function getText() {
  return localStorage.getItem("liveSubtitleText") || "";
}

let lastUpdate = "";
function updateText() {
  const updated = localStorage.getItem("liveSubtitleUpdated") || "";
  const text = getText();
  if (updated !== lastUpdate) {
    lastUpdate = updated;
    subtitle.classList.add("hidden");
    setTimeout(() => {
      subtitle.textContent = text;
      subtitle.classList.remove("hidden");
    }, 120);
  }
}

applySettings();
updateText();
setInterval(() => {
  applySettings();
  updateText();
}, 150);

window.addEventListener("storage", () => {
  applySettings();
  updateText();
});
