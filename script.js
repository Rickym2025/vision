// ==========================================
// FUNZIONI GLOBALI SU WINDOW
// ==========================================

// ── FULLSCREEN MODAL VIDEO PLAYER (FLUIDISSIMO) ──
window.openFullscreenModal = function(videoSrc, handle, caption) {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');
  const fsHandle = document.getElementById('fs-handle');
  const fsCaption = document.getElementById('fs-caption');

  if (!overlay || !fsVideo) return;

  // 1. Mette in PAUSA tutti gli altri video di sfondo per dedicare il 100% della GPU al video aperto
  document.querySelectorAll('.phone-container video').forEach(v => {
    try { v.pause(); } catch(e) {}
  });

  if (fsHandle) fsHandle.textContent = handle;
  if (fsCaption) fsCaption.textContent = caption;

  // 2. Mostra la modale visivamente
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  // 3. Riproduzione pulita con audio
  fsVideo.src = videoSrc;
  fsVideo.currentTime = 0;
  fsVideo.muted = false;
  fsVideo.volume = 1;

  const playPromise = fsVideo.play();
  if (playPromise !== undefined) {
    playPromise.catch(e => {
      console.warn("Autoplay con audio bloccato dal browser, riprovo in muted:", e);
      fsVideo.muted = true;
      fsVideo.play().catch(() => {});
    });
  }
};

window.closeFullscreenModal = function() {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');

  if (overlay) overlay.style.display = 'none';
  if (fsVideo) {
    fsVideo.pause();
    fsVideo.removeAttribute('src');
    fsVideo.load(); // Libera la memoria della GPU
  }

  // Riprende la riproduzione dei soli video attualmente visibili nello schermo
  document.querySelectorAll('.phone-container video').forEach(v => {
    try {
      const rect = v.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        v.play().catch(() => {});
      }
    } catch(e) {}
  });
};

// ── CHATBOT FUNCTIONS ──
window.toggleChatWindow = function() {
  const win = document.getElementById('chatbot-window-wrapper');
  const icon = document.getElementById('chat-toggle-icon');
  if (win) {
    win.classList.toggle('collapsed');
    if (icon) {
      icon.innerHTML = win.classList.contains('collapsed') ? '&#43;' : '&minus;';
    }
  }
};

window.sendQuickMsg = function(text) {
  const input = document.getElementById('vision-chat-input');
  if (input) {
    input.value = text;
    window.sendChatMsg();
  }
};

let chatSessionId = localStorage.getItem('vision_chat_session') || ('sess_' + Date.now());
localStorage.setItem('vision_chat_session', chatSessionId);

window.sendChatMsg = async function() {
  const input = document.getElementById('vision-chat-input');
  const messagesDiv = document.getElementById('chatbot-messages');
  if (!input || !messagesDiv) return;

  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendMsg(text, 'user');

  try {
    const res = await fetch('https://n8n.rmstudio.app/webhook/vision-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: chatSessionId })
    });
    const raw = await res.text();
    let reply = 'Risposta ricevuta.';
    if (raw) {
      try { reply = JSON.parse(raw).response || raw; } catch(err) { reply = raw; }
    }
    appendMsg(reply, 'bot');
  } catch(e) {
    appendMsg('Connessione temporaneamente non disponibile.', 'bot');
  }
};

function appendMsg(text, sender) {
  const messagesDiv = document.getElementById('chatbot-messages');
  if (!messagesDiv) return;
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.innerHTML = String(text).replace(/\n/g, '<br>');
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeFullscreenModal(); });

// ==========================================
// INIZIALIZZAZIONE AL CARICAMENTO DELLA PAGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // Anno Footer
  const yrEl = document.getElementById('yr');
  if (yrEl) yrEl.textContent = new Date().getFullYear();

  // ── CARICAMENTO ECOSISTEMA ORBITALE DA GITHUB ──
  const orbitContainer = document.getElementById('orbit-container');
  if (orbitContainer) {
    fetch("https://raw.githubusercontent.com/Rickym2025/mrstudio/main/public/orbit-template.html")
      .then(res => {
        if (!res.ok) throw new Error("Errore caricamento Orbit");
        return res.text();
      })
      .then(html => {
        orbitContainer.innerHTML = html;
      })
      .catch(err => {
        console.error("Impossibile caricare l'ecosistema orbitale:", err);
        orbitContainer.innerHTML = '<p class="text-xs text-purple-400">RM Studio Ecosystem Active</p>';
      });
  }

  // ── RIPRODUZIONE INTELLIGENTE ED INDIPENDENTE DEI VIDEO (ZERO SCATTI / STUTTERING) ──
  const phoneVideos = document.querySelectorAll('.phone-container video');
  if ('IntersectionObserver' in window && phoneVideos.length > 0) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          // Riproduci il video in sicurezza solo se in pausa
          if (video.paused) {
            const promise = video.play();
            if (promise !== undefined) {
              promise.catch(() => {});
            }
          }
        } else {
          // Metti in pausa se esce dallo schermo
          if (!video.paused) {
            video.pause();
          }
        }
      });
    }, { 
      threshold: 0.25 
    });

    phoneVideos.forEach(v => videoObserver.observe(v));
  }

  // ── FORM CONTATTI (DOPPIO INVIO PARALLELO WEB3FORMS + N8N) ──
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const msg = document.getElementById('form-msg');
      if (btn) { btn.textContent = 'Invio in corso...'; btn.disabled = true; }

      const formData = new FormData(contactForm);
      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        website: formData.get('website')
      };

      const web3Promise = fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      const n8nPromise = fetch('https://n8n.rmstudio.app/webhook/vision-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      try {
        const [res1, res2] = await Promise.all([web3Promise, n8nPromise]);
        if (res1.ok || res2.ok) {
          if (msg) {
            msg.textContent = '✓ Richiesta inviata! Ti risponderemo entro 24 ore.';
            msg.style.color = '#4ade80';
          }
          contactForm.reset();
        } else {
          throw new Error('Server error');
        }
      } catch(err) {
        if (msg) {
          msg.textContent = '✗ Errore durante l\'invio. Riprova a breve.';
          msg.style.color = '#f87171';
        }
      } finally {
        if (msg) msg.classList.remove('hidden');
        if (btn) { btn.textContent = 'Invia Richiesta'; btn.disabled = false; }
      }
    });
  }

});
