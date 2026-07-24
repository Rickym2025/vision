document.addEventListener('DOMContentLoaded', () => {

  // ── Anno Footer ──
  const yrEl = document.getElementById('yr');
  if (yrEl) yrEl.textContent = new Date().getFullYear();

  // ── FORM CONTATTO (Web3Forms + n8n) ──
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const msg = document.getElementById('form-msg');
      btn.textContent = 'Invio in corso...';
      btn.disabled = true;

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
        if (res1.ok && res2.ok) {
          msg.textContent = '✓ Richiesta inviata! Ti risponderemo entro 24 ore.';
          msg.style.color = '#4ade80';
          contactForm.reset();
        } else { throw new Error(); }
      } catch {
        msg.textContent = '✗ Errore durante l\'invio. Riprova a breve.';
        msg.style.color = '#f87171';
      } finally {
        msg.classList.remove('hidden');
        btn.textContent = 'Invia Richiesta';
        btn.disabled = false;
      }
    });
  }

  // ── CHATBOT WIDGET LOGIC ──
  const win = document.getElementById('chatbot-window-wrapper');
  const icon = document.getElementById('chat-toggle-icon');

  window.toggleChatWindow = function() {
    if (win) {
      win.classList.toggle('collapsed');
      if (icon) icon.innerHTML = win.classList.contains('collapsed') ? '&#43;' : '&minus;';
    }
  };

  window.sendQuickMsg = function(text) {
    const input = document.getElementById('vision-chat-input');
    if (input) {
      input.value = text;
      sendChatMsg();
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
        try { reply = JSON.parse(raw).response || raw; } catch(_) { reply = raw; }
      }
      appendMsg(reply, 'bot');
    } catch {
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
});

// ── FULLSCREEN MODAL VIDEO PLAYER (SOLUZIONE DEFINITIVA ANTI-SCATTI) ──
function openFullscreenModal(videoSrc, handle, caption) {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');
  const fsHandle = document.getElementById('fs-handle');
  const fsCaption = document.getElementById('fs-caption');

  if (!overlay || !fsVideo) return;

  // 1. Mette in PAUSA tutti i video della pagina per dedicare la GPU al 100% al video aperto
  document.querySelectorAll('.phone-container video').forEach(v => v.pause());

  if (fsHandle) fsHandle.textContent = handle;
  if (fsCaption) fsCaption.textContent = caption;

  // 2. Apri modale
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');

  // 3. Riproduzione del video selezionato con audio al 100%
  fsVideo.src = videoSrc;
  fsVideo.currentTime = 0;
  fsVideo.muted = false;
  fsVideo.volume = 1;

  fsVideo.play().catch(e => {
    console.warn("Autoplay audio bloccato, riprovo in muted:", e);
    fsVideo.muted = true;
    fsVideo.play();
  });
}

function closeFullscreenModal() {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');

  if (overlay) overlay.style.display = 'none';
  if (fsVideo) {
    fsVideo.pause();
    fsVideo.src = '';
  }

  // Riprende la riproduzione nei telefoni
  document.querySelectorAll('.phone-container video').forEach(v => {
    v.play().catch(()=>{});
  });
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFullscreenModal(); });
