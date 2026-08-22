// Salle de review partagée en temps réel (Supabase Realtime — Broadcast + Presence).
// Chargé et connecté uniquement quand une salle est créée ou rejointe (lien ?room=CODE) :
// le mode solo reste 100% local/hors-ligne, aucune dépendance réseau n'est chargée sinon.

const SUPABASE_URL = "https://yumpxlwlcciqbotljrmd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bXB4bHdsY2NpcWJvdGxqcm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDY3NjMsImV4cCI6MjEwMjk4Mjc2M30.rQvFHGzHrOcVbmVmgU2AisIgXZ_5zQp-kHfBmk4fDNk";

const Room = (() => {
  let client = null;
  let channel = null;
  let participantId = null;
  let participantName = null;
  let controllerId = null;
  let owner = false;
  let roomCode = null;
  const handlers = {};

  function randomId(len) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function loadSupabaseLib() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Impossible de charger la bibliothèque de synchronisation (connexion internet requise)"));
      document.head.appendChild(script);
    });
  }

  function on(event, handler) {
    (handlers[event] = handlers[event] || []).push(handler);
  }

  function emit(event, payload) {
    (handlers[event] || []).forEach((h) => h(payload));
  }

  async function connect(code, name) {
    await loadSupabaseLib();
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    roomCode = code;
    participantId = randomId(10);
    participantName = name;

    channel = client.channel(`kifu-room-${code}`, {
      config: { broadcast: { self: false }, presence: { key: participantId } },
    });

    channel.on("broadcast", { event: "msg" }, ({ payload }) => {
      emit(payload.type, payload.data);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const participants = Object.entries(state).map(([id, metas]) => ({ id, name: metas[0].name }));
      emit("participants", participants);
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Délai de connexion dépassé")), 15000);
      channel.subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          await channel.track({ name: participantName });
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(err || new Error("Connexion à la salle impossible"));
        }
      });
    });
  }

  function send(type, data) {
    if (!channel) return;
    channel.send({ type: "broadcast", event: "msg", payload: { type, data, from: participantId } });
  }

  function leave() {
    if (channel && client) client.removeChannel(channel);
    channel = null;
    client = null;
    controllerId = null;
    roomCode = null;
  }

  return {
    on,
    connect,
    send,
    leave,
    randomCode,
    get active() {
      return !!channel;
    },
    get participantId() {
      return participantId;
    },
    get controllerId() {
      return controllerId;
    },
    setController(id) {
      controllerId = id;
    },
    isController() {
      return this.active && controllerId === participantId;
    },
    get roomCode() {
      return roomCode;
    },
    get isOwner() {
      return owner;
    },
    set isOwner(v) {
      owner = v;
    },
  };
})();
