// js/queue.js

const queue = document.getElementById("queue");

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function fileIcon(file) {
  if (file.type === "application/pdf") return "📕";
  if (file.type.startsWith("video/")) return "🎞️";
  if (file.type.startsWith("audio/")) return "🎵";
  if (file.type.startsWith("image/jpeg")) return "📷";
  return "📄";
}


export function addQueueItem(file) {
  const row = document.createElement("div");
  row.className = "queue-item sending";

  row.innerHTML = `
    <div class="thumb"></div>
    <div class="meta">
      <div class="name"></div>
      <div class="sub"></div>
      <div class="progress"><div class="progress-bar"></div></div>
    </div>
    <button class="state" type="button" disabled></button>
  `;

  const thumb = row.querySelector(".thumb");
  const name = row.querySelector(".name");
  const sub = row.querySelector(".sub");
  const bar = row.querySelector(".progress-bar");
  const state = row.querySelector(".state");
  const size = formatSize(file.size);

  name.textContent = file.name;
  sub.textContent = size;

  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    thumb.appendChild(img);
  } else {
    thumb.textContent = fileIcon(file);
  }

  queue.prepend(row);

  return {
    // back to the "sending" look (used on first start and on retry)
    reset() {
      row.classList.remove("done", "failed");
      row.classList.add("sending");
      state.textContent = "";
      state.disabled = true;
      state.onclick = null;
      state.setAttribute("aria-label", "Sending");
      sub.textContent = size;
      bar.style.width = "0%";
    },

    setProgress(percent) {
      bar.style.width = percent + "%";
      sub.textContent = `${size} · ${percent}%`;
    },

    done() {
      row.classList.remove("sending", "failed");
      row.classList.add("done");
      state.textContent = "✓";
      state.disabled = true;
      state.setAttribute("aria-label", "Sent");
      sub.textContent = "Sent to Chrome";
      navigator.vibrate?.(15);
    },

    fail(retry) {
      row.classList.remove("sending", "done");
      row.classList.add("failed");
      state.textContent = "↻";
      state.disabled = false;
      state.setAttribute("aria-label", "Retry");
      state.onclick = retry;
      sub.textContent = "Failed · tap to retry";
      navigator.vibrate?.([30, 40, 30]);
    }
  };
}