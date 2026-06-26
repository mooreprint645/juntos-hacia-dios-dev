/* =========================================================
   JUNTOS HACIA DIOS
   App principal
   Canciones + artistas + categorías + álbumes + admin
========================================================= */

const ADMIN_EMAIL = "mooreprint645@gmail.com";

let currentEditingArtistId = null;
let currentEditingCategoryId = null;
let currentEditingAlbumId = null;
let currentEditingSongId = null;

let currentSongForPage = null;
let currentTransposeSteps = 0;
let currentCapoMode = "original";

/* =========================================================
   HELPERS GENERALES
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function getSupabase() {
  return window.supabaseClient || null;
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getInitials(name) {
  const clean = String(name || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!clean) return "JHD";

  const words = clean.split(" ");

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map(function (word) {
      return word.charAt(0).toUpperCase();
    })
    .join("") || "JHD";
}

function getInputValue(id) {
  const input = $(id);
  return input ? input.value.trim() : "";
}

function setInputValue(id, value) {
  const input = $(id);

  if (input) {
    input.value = value || "";
  }
}

function showMessage(id, text) {
  const element = $(id);

  if (element) {
    element.innerText = text || "";
  }
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function getSelectedValues(selectId) {
  const select = $(selectId);

  if (!select) return [];

  return Array.from(select.selectedOptions || [])
    .map(function (option) {
      return option.value;
    })
    .filter(Boolean);
}

function setSelectedValues(selectId, values) {
  const select = $(selectId);

  if (!select) return;

  const selectedValues = new Set((values || []).map(String));

  Array.from(select.options || []).forEach(function (option) {
    option.selected = selectedValues.has(String(option.value));
  });
}

function setOptions(selectId, items, placeholder, valueKey, labelKey) {
  const select = $(selectId);

  if (!select) return;

  const valueField = valueKey || "id";
  const labelField = labelKey || "name";

  select.innerHTML = `<option value="">${escapeHTML(placeholder || "Selecciona")}</option>`;

  (items || []).forEach(function (item) {
    const value = item[valueField] || "";
    const label = item[labelField] || "Sin nombre";

    select.innerHTML += `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`;
  });
}

function setMultiOptions(selectId, items, labelKey) {
  const select = $(selectId);

  if (!select) return;

  const labelField = labelKey || "name";

  select.innerHTML = "";

  (items || []).forEach(function (item) {
    const value = item.id || "";
    const label = item[labelField] || "Sin nombre";

    select.innerHTML += `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`;
  });
}

function safeUrlParam(value) {
  return encodeURIComponent(String(value || ""));
}

function artistLinksHTML(artists) {
  const safeArtists = artists || [];

  if (!safeArtists.length) {
    return `<span>Sin artista</span>`;
  }

  return safeArtists.map(function (artist) {
    const slug = artist.slug || slugify(artist.name || "");

    return `<a href="artista.html?slug=${safeUrlParam(slug)}">${escapeHTML(artist.name || "Sin artista")}</a>`;
  }).join(`<span class="artist-dot"> · </span>`);
}

function artistsText(song) {
  if (song && song._artists && song._artists.length) {
    return song._artists.map(function (artist) {
      return artist.name;
    }).join(" · ");
  }

  return "Sin artista";
}

function songMetaText(song) {
  return [
    song && song.tone ? song.tone : "",
    song && song.difficulty ? song.difficulty : ""
  ].filter(Boolean).join(" · ");
}

function songTypeLabel(type) {
  return String(type || "").toLowerCase() === "catolico"
    ? "Católico"
    : "Cristiano";
}

/* =========================================================
   TEMA / MENÚ
========================================================= */

function initTheme() {
  const savedTheme = localStorage.getItem("jhd-theme");

  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }

  updateThemeButton();
}

function updateThemeButton() {
  const button = $("themeToggle");

  if (!button) return;

  button.innerText = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");

  localStorage.setItem(
    "jhd-theme",
    document.body.classList.contains("light-mode") ? "light" : "dark"
  );

  updateThemeButton();
}

function initMenu() {
  const button = $("menuToggle");
  const menu = $("navMenu");

  if (!button || !menu) return;

  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "navMenu");

  button.addEventListener("click", function () {
    const isOpen = menu.classList.toggle("show-menu");

    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.remove("show-menu");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

/* =========================================================
   LINKS DE CANCIONES
   Formato:
   Título | Tipo | Plataforma | URL
========================================================= */

function parseSongLinksText(text) {
  const lines = String(text || "")
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  return lines.map(function (line, index) {
    const parts = line.split("|").map(function (part) {
      return part.trim();
    });

    if (parts.length >= 4) {
      return {
        title: parts[0],
        link_type: parts[1] || "Tutorial",
        platform: parts[2] || "",
        url: parts.slice(3).join("|").trim(),
        sort_order: index
      };
    }

    if (parts.length === 3) {
      return {
        title: parts[0],
        link_type: parts[1] || "Tutorial",
        platform: "",
        url: parts[2],
        sort_order: index
      };
    }

    if (parts.length === 2) {
      return {
        title: parts[0],
        link_type: "Tutorial",
        platform: "",
        url: parts[1],
        sort_order: index
      };
    }

    return {
      title: "Link " + (index + 1),
      link_type: "Tutorial",
      platform: "",
      url: parts[0],
      sort_order: index
    };
  }).filter(function (link) {
    return link.title && link.url;
  });
}

function linksToText(links) {
  return (links || []).map(function (link) {
    return [
      link.title || "Link",
      link.link_type || "Tutorial",
      link.platform || "",
      link.url || ""
    ].join(" | ");
  }).join("\n");
}

function linkIcon(link) {
  const text = `${link.platform || ""} ${link.link_type || ""} ${link.title || ""}`.toLowerCase();

  if (text.includes("guitarra")) return "🎸";
  if (text.includes("piano")) return "🎹";
  if (text.includes("youtube")) return "▶️";
  if (text.includes("tiktok")) return "🎵";
  if (text.includes("instagram")) return "📷";
  if (text.includes("facebook")) return "f";
  if (text.includes("spotify")) return "🎧";
  if (text.includes("canal")) return "📺";

  return "🔗";
}

function renderSongLinksHTML(links) {
  const safeLinks = links || [];

  if (!safeLinks.length) return "";

  return `
    <section class="song-links-box">
      <h2>Tutoriales y enlaces</h2>

      <div class="song-links-list">
        ${safeLinks.map(function (link) {
          return `
            <a class="song-link-item" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">
              <span>${linkIcon(link)}</span>

              <div>
                <strong>${escapeHTML(link.title || "Link")}</strong>
                <small>${escapeHTML([link.platform, link.link_type].filter(Boolean).join(" · "))}</small>
              </div>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
/* =========================================================
   TRANSPOSICIÓN / CAPO
========================================================= */

const CHORD_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const FLAT_TO_SHARP = {
  "Db": "C#",
  "Eb": "D#",
  "Gb": "F#",
  "Ab": "G#",
  "Bb": "A#"
};

function normalizeNote(note) {
  return FLAT_TO_SHARP[note] || note;
}

function transposeNote(note, steps) {
  const normalized = normalizeNote(note);
  const index = CHORD_NOTES.indexOf(normalized);

  if (index === -1) return note;

  const nextIndex = (index + steps + CHORD_NOTES.length * 10) % CHORD_NOTES.length;

  return CHORD_NOTES[nextIndex];
}

function transposeSingleChord(chord, steps) {
  const match = String(chord || "").match(/^([A-G](?:#|b)?)(.*)$/);

  if (!match) return chord;

  const root = match[1];
  let rest = match[2] || "";

  const transposedRoot = transposeNote(root, steps);

  rest = rest.replace(/\/([A-G](?:#|b)?)/g, function (_, bassNote) {
    return "/" + transposeNote(bassNote, steps);
  });

  return transposedRoot + rest;
}

function transposeChordGroup(chordGroup, steps) {
  return String(chordGroup || "").replace(/[A-G](?:#|b)?[a-zA-Z0-9#b°+\-susmajdimaug/()]*/g, function (chord) {
    return transposeSingleChord(chord, steps);
  });
}

function renderChordedLyrics(lyrics, transposeSteps) {
  const escaped = escapeHTML(lyrics || "");
  const steps = Number(transposeSteps || 0);

  return escaped.replace(/\(([^)]+)\)/g, function (_, chordGroup) {
    const transposed = transposeChordGroup(chordGroup, steps);

    return `<span class="chord-token">${escapeHTML(transposed)}</span>`;
  });
}

function getCapoPosition(song) {
  const value = Number(song && song.capo_position ? song.capo_position : 0);

  if (Number.isNaN(value)) return 0;

  return value;
}

function getTotalTransposeSteps() {
  if (!currentSongForPage) return currentTransposeSteps;

  const capoPosition = getCapoPosition(currentSongForPage);

  if (currentCapoMode === "capo" && capoPosition > 0) {
    return currentTransposeSteps - capoPosition;
  }

  return currentTransposeSteps;
}

function changeTranspose(amount) {
  currentTransposeSteps += amount;
  updateSongLyricsDisplay();
}

function resetTranspose() {
  currentTransposeSteps = 0;
  updateSongLyricsDisplay();
}

function setCapoMode(mode) {
  currentCapoMode = mode === "capo" ? "capo" : "original";
  currentTransposeSteps = 0;

  updateSongLyricsDisplay();
}

function updateSongLyricsDisplay() {
  const lyricsBox = $("lyricsContent");
  const label = $("transposeLabel");
  const modeLabel = $("capoModeLabel");

  if (!lyricsBox || !currentSongForPage) return;

  const totalSteps = getTotalTransposeSteps();

  lyricsBox.innerHTML = renderChordedLyrics(currentSongForPage.lyrics || "", totalSteps);

  if (label) {
    if (currentTransposeSteps === 0) {
      label.innerText = "Tono original";
    } else if (currentTransposeSteps > 0) {
      label.innerText = "+" + currentTransposeSteps;
    } else {
      label.innerText = String(currentTransposeSteps);
    }
  }

  if (modeLabel) {
    if (currentCapoMode === "capo") {
      const capo = getCapoPosition(currentSongForPage);
      const capoKey = currentSongForPage.capo_key || "";
      modeLabel.innerText = "Con capo " + capo + (capoKey ? " · Figuras en " + capoKey : "");
    } else {
      modeLabel.innerText = "Sin capo";
    }
  }
}

/* =========================================================
   DATA HELPERS
========================================================= */

async function fetchArtists() {
  const client = getSupabase();

  if (!client) {
    return {
      data: [],
      error: { message: "Sin conexión a Supabase" }
    };
  }

  return await client
    .from("artists")
    .select("*")
    .order("name", { ascending: true });
}

async function fetchCategories() {
  const client = getSupabase();

  if (!client) {
    return {
      data: [],
      error: { message: "Sin conexión a Supabase" }
    };
  }

  return await client
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
}

async function fetchAlbums() {
  const client = getSupabase();

  if (!client) {
    return {
      data: [],
      error: { message: "Sin conexión a Supabase" }
    };
  }

  const { data: albums, error } = await client
    .from("albums")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return {
      data: [],
      error: error
    };
  }

  const { data: artists } = await fetchArtists();

  const artistMap = new Map(
    (artists || []).map(function (artist) {
      return [artist.id, artist];
    })
  );

  const merged = (albums || []).map(function (album) {
    return Object.assign({}, album, {
      artist: artistMap.get(album.artist_id) || null
    });
  });

  return {
    data: merged,
    error: null
  };
}

async function fetchSongsBase(ids) {
  const client = getSupabase();

  if (!client) {
    return {
      data: [],
      error: { message: "Sin conexión a Supabase" }
    };
  }

  let query = client
    .from("songs")
    .select("*")
    .order("title", { ascending: true });

  if (ids && ids.length) {
    query = query.in("id", ids);
  }

  return await query;
}

async function fetchSongLinksBySongIds(songIds) {
  const client = getSupabase();

  if (!client || !songIds || !songIds.length) {
    return {
      data: [],
      error: null
    };
  }

  return await client
    .from("song_links")
    .select("*")
    .in("song_id", songIds)
    .order("sort_order", { ascending: true });
}

async function fetchSongsWithRelations(ids) {
  const client = getSupabase();

  if (!client) {
    return {
      data: [],
      error: { message: "Sin conexión a Supabase" }
    };
  }

  const { data: songs, error } = await fetchSongsBase(ids);

  if (error) {
    return {
      data: [],
      error: error
    };
  }

  const safeSongs = songs || [];

  const songIds = safeSongs
    .map(function (song) {
      return song.id;
    })
    .filter(Boolean);

  if (!songIds.length) {
    return {
      data: [],
      error: null
    };
  }

  const [artistRes, categoryRes, albumRes, linksRes] = await Promise.all([
    client
      .from("song_artists")
      .select("song_id, role, sort_order, artists(id, name, slug, description)")
      .in("song_id", songIds)
      .order("sort_order", { ascending: true }),

    client
      .from("song_categories")
      .select("song_id, categories(id, name, slug, description)")
      .in("song_id", songIds),

    client
      .from("album_songs")
      .select("song_id, albums(id, title, slug, description, artist_id)")
      .in("song_id", songIds),

    fetchSongLinksBySongIds(songIds)
  ]);

  if (artistRes.error) {
    return { data: [], error: artistRes.error };
  }

  if (categoryRes.error) {
    return { data: [], error: categoryRes.error };
  }

  if (albumRes.error) {
    return { data: [], error: albumRes.error };
  }

  if (linksRes.error) {
    return { data: [], error: linksRes.error };
  }

  const artistsBySong = new Map();
  const categoriesBySong = new Map();
  const albumsBySong = new Map();
  const linksBySong = new Map();

  (artistRes.data || []).forEach(function (row) {
    if (!artistsBySong.has(row.song_id)) {
      artistsBySong.set(row.song_id, []);
    }

    if (row.artists) {
      artistsBySong.get(row.song_id).push(row.artists);
    }
  });

  (categoryRes.data || []).forEach(function (row) {
    if (!categoriesBySong.has(row.song_id)) {
      categoriesBySong.set(row.song_id, []);
    }

    if (row.categories) {
      categoriesBySong.get(row.song_id).push(row.categories);
    }
  });

  (albumRes.data || []).forEach(function (row) {
    if (!albumsBySong.has(row.song_id)) {
      albumsBySong.set(row.song_id, []);
    }

    if (row.albums) {
      albumsBySong.get(row.song_id).push(row.albums);
    }
  });

  (linksRes.data || []).forEach(function (row) {
    if (!linksBySong.has(row.song_id)) {
      linksBySong.set(row.song_id, []);
    }

    linksBySong.get(row.song_id).push(row);
  });

  const merged = safeSongs.map(function (song) {
    return Object.assign({}, song, {
      _artists: artistsBySong.get(song.id) || [],
      _categories: categoriesBySong.get(song.id) || [],
      _albums: albumsBySong.get(song.id) || [],
      _links: linksBySong.get(song.id) || []
    });
  });

  return {
    data: merged,
    error: null
  };
}
/* =========================================================
   PÚBLICO: HOME
========================================================= */

async function loadHomeSongs() {
  const grid = $("homeSongsGrid");

  if (!grid) return;

  const { data, error } = await fetchSongsWithRelations();

  if (error) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Error al cargar canciones</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    return;
  }

  const songs = (data || [])
    .slice()
    .sort(function (a, b) {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })
    .slice(0, 6);

  if (!songs.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Aún no hay canciones</h3>
        <p>Agrega canciones desde el panel de administración.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = songs.map(function (song) {
    const slug = song.slug || slugify(song.title);
    const meta = songMetaText(song);

    return `
      <a class="song-card song-link-card" href="canto.html?slug=${safeUrlParam(slug)}">
        <p class="artists-line">${escapeHTML(artistsText(song))}</p>
        <h3>${escapeHTML(song.title || "Sin título")}</h3>
        <p>${escapeHTML(meta)}</p>
      </a>
    `;
  }).join("");
}

async function loadHomeArtists() {
  const grid = $("homeArtistsGrid");

  if (!grid) return;

  const { data, error } = await fetchArtists();

  if (error) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Error al cargar artistas</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    return;
  }

  const artists = (data || []).slice(0, 6);

  if (!artists.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Aún no hay artistas</h3>
        <p>Agrega artistas desde el panel de administración.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = artists.map(function (artist) {
    const slug = artist.slug || slugify(artist.name);

    return `
      <a class="artist-card" href="artista.html?slug=${safeUrlParam(slug)}">
        <div class="artist-mini-avatar">${escapeHTML(getInitials(artist.name))}</div>
        <h3>${escapeHTML(artist.name || "Artista")}</h3>
        <p>${escapeHTML(artist.description || "Ver canciones, álbumes y colaboraciones.")}</p>
      </a>
    `;
  }).join("");
}

/* =========================================================
   PÚBLICO: CANCIONES
========================================================= */

let allSongsForPage = [];
let currentSongsFilter = "all";

function renderSongsPage() {
  const grid = $("songsGrid") || $("songList") || $("songsList") || $("publicSongList");
  const countText = $("songCountText");
  const input = $("songsSearchInput") || $("songSearchInput") || $("searchInput");

  if (!grid) return;

  const query = input ? input.value.trim().toLowerCase() : "";

  let items = allSongsForPage.slice();

  if (currentSongsFilter !== "all") {
    items = items.filter(function (song) {
      return String(song.song_type || "").toLowerCase() === currentSongsFilter;
    });
  }

  if (query) {
    items = items.filter(function (song) {
      const text = [
        song.title || "",
        song.tone || "",
        song.difficulty || "",
        song.song_type || "",
        artistsText(song),
        (song._categories || []).map(function (category) {
          return category.name;
        }).join(" ")
      ].join(" ").toLowerCase();

      return text.includes(query);
    });
  }

  if (countText) {
    countText.textContent = items.length === 1
      ? "1 canción encontrada"
      : items.length + " canciones encontradas";
  }

  if (!items.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>No se encontraron canciones</h3>
        <p>Intenta buscar con otro nombre, artista o tono.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(function (song) {
    const slug = song.slug || slugify(song.title);
    const meta = songMetaText(song);
    const typeLabel = songTypeLabel(song.song_type);

    return `
      <a class="song-card song-link-card" href="canto.html?slug=${safeUrlParam(slug)}">
        <p class="artists-line">${escapeHTML(artistsText(song))}</p>
        <h3>${escapeHTML(song.title || "Sin título")}</h3>
        <p>
          ${escapeHTML(typeLabel)}
          ${meta ? " · " + escapeHTML(meta) : ""}
        </p>
      </a>
    `;
  }).join("");
}

function setSongsFilter(filter) {
  currentSongsFilter = filter || "all";
  renderSongsPage();
}

async function loadSongsPage() {
  const grid = $("songsGrid") || $("songList") || $("songsList") || $("publicSongList");
  const countText = $("songCountText");

  if (!grid) return;

  const { data, error } = await fetchSongsWithRelations();

  if (error) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Error al cargar canciones</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;

    if (countText) {
      countText.textContent = "Error al cargar canciones.";
    }

    return;
  }

  allSongsForPage = data || [];

  const type = getUrlParam("tipo");
  const searchParam = getUrlParam("buscar");

  if (type) {
    currentSongsFilter = type.toLowerCase();
  }

  const input = $("songsSearchInput") || $("songSearchInput") || $("searchInput");

  if (input && searchParam) {
    input.value = searchParam;
  }

  renderSongsPage();
}

function setupSongsSearch() {
  const input = $("songsSearchInput") || $("songSearchInput") || $("searchInput");

  if (!input) return;

  input.addEventListener("input", renderSongsPage);
}

/* =========================================================
   PÚBLICO: ARTISTAS
========================================================= */

let allArtistsForPage = [];

function renderArtistsPage(items) {
  const grid = $("artistsGrid") || $("artistList") || $("artistsList") || $("publicArtistList");
  const countText = $("artistCountText");

  if (!grid) return;

  const artists = items || [];

  if (countText) {
    countText.textContent = artists.length === 1
      ? "1 artista encontrado"
      : artists.length + " artistas encontrados";
  }

  if (!artists.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>No se encontraron artistas</h3>
        <p>Intenta buscar con otro nombre.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = artists.map(function (artist) {
    const slug = artist.slug || slugify(artist.name);

    return `
      <a class="artist-card" href="artista.html?slug=${safeUrlParam(slug)}">
        <div class="artist-mini-avatar">
          ${escapeHTML(getInitials(artist.name))}
        </div>

        <h3>${escapeHTML(artist.name || "Artista")}</h3>

        <p>${escapeHTML(artist.description || "Ver cantos, álbumes y colaboraciones.")}</p>
      </a>
    `;
  }).join("");
}

async function loadArtistsPage() {
  const grid = $("artistsGrid") || $("artistList") || $("artistsList") || $("publicArtistList");

  if (!grid) return;

  const { data, error } = await fetchArtists();

  if (error) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Error al cargar artistas</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    return;
  }

  allArtistsForPage = data || [];
  renderArtistsPage(allArtistsForPage);
}

function setupArtistsSearch() {
  const input = $("artistsSearchInput") || $("artistSearchInput") || $("artistSearch");

  if (!input) return;

  input.addEventListener("input", function () {
    const query = input.value.trim().toLowerCase();

    const filtered = allArtistsForPage.filter(function (artist) {
      const text = [
        artist.name || "",
        artist.description || ""
      ].join(" ").toLowerCase();

      return text.includes(query);
    });

    renderArtistsPage(filtered);
  });
}
/* =========================================================
   PÚBLICO: CATEGORÍAS
========================================================= */

let allCategoriesForPage = [];
let allCategorySongsForPage = [];

function renderCategorySongs(category) {
  const section = $("categorySongsSection");
  const title = $("selectedCategoryTitle");
  const description = $("selectedCategoryDescription");
  const grid = $("categorySongsGrid");

  if (!section || !grid || !category) return;

  section.style.display = "block";

  if (title) {
    title.textContent = category.name || "Categoría";
  }

  if (description) {
    description.textContent = category.description || "Cantos dentro de esta categoría.";
  }

  const songs = allCategorySongsForPage.filter(function (song) {
    return (song._categories || []).some(function (item) {
      return String(item.id) === String(category.id);
    });
  });

  if (!songs.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Aún no hay cantos</h3>
        <p>Esta categoría todavía no tiene canciones agregadas.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = songs.map(function (song) {
    const slug = song.slug || slugify(song.title);
    const meta = songMetaText(song);

    return `
      <a class="song-card song-link-card" href="canto.html?slug=${safeUrlParam(slug)}">
        <p class="artists-line">${escapeHTML(artistsText(song))}</p>
        <h3>${escapeHTML(song.title || "Sin título")}</h3>
        <p>${escapeHTML(meta)}</p>
      </a>
    `;
  }).join("");

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function selectCategoryById(categoryId) {
  const category = allCategoriesForPage.find(function (item) {
    return String(item.id) === String(categoryId);
  });

  if (!category) return;

  renderCategorySongs(category);
}

function renderCategoriesPage(items) {
  const grid = $("categoriesGrid") || $("categoryList");
  const countText = $("categoryCountText");

  if (!grid) return;

  const categories = items || [];

  if (countText) {
    countText.textContent = categories.length === 1
      ? "1 categoría encontrada"
      : categories.length + " categorías encontradas";
  }

  if (!categories.length) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>No se encontraron categorías</h3>
        <p>Intenta buscar con otro nombre.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = categories.map(function (category) {
    return `
      <button
        class="category-card"
        type="button"
        onclick="selectCategoryById('${escapeHTML(category.id)}')"
      >
        <h3>${escapeHTML(category.name || "Categoría")}</h3>
        <p>${escapeHTML(category.description || "Ver cantos de esta categoría.")}</p>
      </button>
    `;
  }).join("");
}

async function loadCategoriesPage() {
  const grid = $("categoriesGrid") || $("categoryList");

  if (!grid) return;

  const { data, error } = await fetchCategories();

  if (error) {
    grid.innerHTML = `
      <div class="song-card">
        <h3>Error al cargar categorías</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    return;
  }

  allCategoriesForPage = data || [];

  const songsResult = await fetchSongsWithRelations();

  if (!songsResult.error) {
    allCategorySongsForPage = songsResult.data || [];
  }

  renderCategoriesPage(allCategoriesForPage);
}

function setupCategoriesSearch() {
  const input = $("categoriesSearchInput");

  if (!input) return;

  input.addEventListener("input", function () {
    const query = input.value.trim().toLowerCase();

    const filtered = allCategoriesForPage.filter(function (category) {
      const text = [
        category.name || "",
        category.description || ""
      ].join(" ").toLowerCase();

      return text.includes(query);
    });

    renderCategoriesPage(filtered);
  });
}

/* =========================================================
   PÚBLICO: PERFIL DE ARTISTA
========================================================= */

function renderMiniSongCard(song) {
  const slug = song.slug || slugify(song.title);

  return `
    <article class="song-card mini-song-card">
      <h4>${escapeHTML(song.title || "Sin título")}</h4>

      <p class="artists-line">
        ${artistLinksHTML(song._artists)}
      </p>

      <a class="song-btn small-btn" href="canto.html?slug=${safeUrlParam(slug)}">
        Abrir canto
      </a>
    </article>
  `;
}

async function loadArtistProfile() {
  const box = $("artistProfile") || $("artistProfileContent") || $("artistDetail");

  if (!box) return;

  const slug = getUrlParam("slug");
  const client = getSupabase();

  if (!client || !slug) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Artista no encontrado</h3>
        <p>Vuelve a la lista de artistas e intenta de nuevo.</p>
      </div>
    `;
    return;
  }

  const { data: artist, error } = await client
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !artist) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Artista no encontrado</h3>
        <p>Este artista no existe o fue eliminado.</p>
      </div>
    `;
    return;
  }

  const relationResult = await client
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artist.id);

  const directResult = await client
    .from("songs")
    .select("id")
    .eq("artist_id", artist.id);

  const songIds = Array.from(new Set([
    ...((relationResult.data || []).map(function (row) {
      return row.song_id;
    })),
    ...((directResult.data || []).map(function (row) {
      return row.id;
    }))
  ].filter(Boolean)));

  const songsResult = await fetchSongsWithRelations(songIds);
  const songs = songsResult.data || [];

  const albumsResult = await client
    .from("albums")
    .select("*")
    .eq("artist_id", artist.id)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  const albums = albumsResult.data || [];

  const albumSections = albums.map(function (album) {
    const albumSongs = songs.filter(function (song) {
      return (song._albums || []).some(function (songAlbum) {
        return String(songAlbum.id) === String(album.id);
      });
    });

    if (!albumSongs.length) return "";

    return `
      <section class="artist-folder">
        <h3>📁 ${escapeHTML(album.title || "Álbum")}</h3>

        <div class="compact-list">
          ${albumSongs.map(renderMiniSongCard).join("")}
        </div>
      </section>
    `;
  }).join("");

  const songsWithoutArtistAlbum = songs.filter(function (song) {
    const hasAlbumFromThisArtist = (song._albums || []).some(function (album) {
      return String(album.artist_id) === String(artist.id);
    });

    return !hasAlbumFromThisArtist;
  });

  const collaborationSongs = songs.filter(function (song) {
    return (song._artists || []).length > 1;
  });

  box.innerHTML = `
    <section class="artist-hero-card">
      <div class="artist-avatar-public big">
        ${escapeHTML(getInitials(artist.name))}
      </div>

      <div>
        <p class="hero-kicker">Artista / Ministerio</p>
        <h1>${escapeHTML(artist.name || "Sin nombre")}</h1>
        <p>${escapeHTML(artist.description || "Ministerio o artista registrado.")}</p>
      </div>
    </section>

    ${albumSections || ""}

    ${songsWithoutArtistAlbum.length ? `
      <section class="artist-folder">
        <h3>Cantos</h3>

        <div class="compact-list">
          ${songsWithoutArtistAlbum.map(renderMiniSongCard).join("")}
        </div>
      </section>
    ` : ""}

    ${collaborationSongs.length ? `
      <section class="artist-folder">
        <h3>Colaboraciones</h3>

        <div class="compact-list">
          ${collaborationSongs.map(renderMiniSongCard).join("")}
        </div>
      </section>
    ` : ""}

    ${!songs.length ? `
      <div class="song-card">
        <h3>Este artista aún no tiene cantos</h3>
        <p>Agrega canciones desde el panel de administración.</p>
      </div>
    ` : ""}
  `;
}

/* =========================================================
   PÚBLICO: PÁGINA DE CANTO
========================================================= */

async function loadSongPage() {
  const box = $("songPage") || $("songDetail") || $("cantoContent");

  if (!box) return;

  const slug = getUrlParam("slug");
  const client = getSupabase();

  if (!client || !slug) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Canto no encontrado</h3>
        <p>Vuelve al cancionero e intenta de nuevo.</p>
      </div>
    `;
    return;
  }

  const { data: song, error } = await client
    .from("songs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !song) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Canto no encontrado</h3>
        <p>Este canto no existe o fue eliminado.</p>
      </div>
    `;
    return;
  }

  const { data: songs } = await fetchSongsWithRelations([song.id]);

  const fullSong = songs && songs[0]
    ? songs[0]
    : Object.assign({}, song, {
        _artists: [],
        _categories: [],
        _albums: [],
        _links: []
      });

  currentSongForPage = fullSong;
  currentTransposeSteps = 0;
  currentCapoMode = "original";

  const capoPosition = getCapoPosition(fullSong);
  const capoKey = fullSong.capo_key || "";
  const meta = songMetaText(fullSong);

  box.innerHTML = `
    <article class="song-detail-card">
      <p class="artists-line">
        ${artistLinksHTML(fullSong._artists)}
      </p>

      <h1>${escapeHTML(fullSong.title || "Sin título")}</h1>

      <p class="song-meta-line">
        ${escapeHTML(meta)}
      </p>

      ${capoPosition > 0 ? `
        <div class="capo-box">
          <span id="capoModeLabel">Sin capo</span>

          <button type="button" class="song-btn small-btn" onclick="setCapoMode('original')">
            Sin capo
          </button>

          <button type="button" class="song-btn small-btn" onclick="setCapoMode('capo')">
            Con capo ${capoPosition}${capoKey ? " · " + escapeHTML(capoKey) : ""}
          </button>
        </div>
      ` : ""}

      <div class="transpose-box">
        <button type="button" class="song-btn small-btn" onclick="changeTranspose(-1)">
          Bajar tono
        </button>

        <span id="transposeLabel">Tono original</span>

        <button type="button" class="song-btn small-btn" onclick="changeTranspose(1)">
          Subir tono
        </button>

        <button type="button" class="song-btn small-btn" onclick="resetTranspose()">
          Original
        </button>
      </div>

      <pre class="lyrics-block" id="lyricsContent">${renderChordedLyrics(fullSong.lyrics || "", 0)}</pre>

      ${renderSongLinksHTML(fullSong._links || [])}
    </article>
  `;
}
/* =========================================================
   ADMIN: LOGIN
========================================================= */

async function loginAdmin() {
  const email = getInputValue("adminEmailInput");
  const passwordInput = $("adminPasswordInput");
  const password = passwordInput ? passwordInput.value : "";

  showMessage("adminLoginMessage", "Iniciando sesión...");

  if (!email || !password) {
    showMessage("adminLoginMessage", "Escribe correo y contraseña.");
    return;
  }

  const client = getSupabase();

  if (!client) {
    showMessage("adminLoginMessage", "No se pudo conectar con Supabase.");
    return;
  }

  const { error } = await client.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    showMessage("adminLoginMessage", "No se pudo iniciar sesión: " + error.message);
    return;
  }

  showMessage("adminLoginMessage", "Sesión iniciada.");

  await checkAdminSession();
}

async function logoutAdmin() {
  const client = getSupabase();

  if (client) {
    await client.auth.signOut();
  }

  currentEditingArtistId = null;
  currentEditingCategoryId = null;
  currentEditingAlbumId = null;
  currentEditingSongId = null;

  await checkAdminSession();
}

async function checkAdminSession() {
  const loginSection = $("adminLoginSection");
  const adminPanel = $("adminPanel");
  const userText = $("adminUserText");

  if (!loginSection || !adminPanel) return;

  const client = getSupabase();

  if (!client) {
    loginSection.style.display = "block";
    adminPanel.style.display = "none";
    showMessage("adminLoginMessage", "No se pudo conectar con Supabase.");
    return;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    loginSection.style.display = "block";
    adminPanel.style.display = "none";
    showMessage("adminLoginMessage", "Error leyendo la sesión.");
    return;
  }

  const session = data ? data.session : null;

  if (!session || !session.user) {
    loginSection.style.display = "block";
    adminPanel.style.display = "none";
    return;
  }

  const email = session.user.email || "";

  if (email !== ADMIN_EMAIL) {
    await client.auth.signOut();

    loginSection.style.display = "block";
    adminPanel.style.display = "none";

    showMessage("adminLoginMessage", "Este correo no tiene permisos de administrador.");
    return;
  }

  loginSection.style.display = "none";
  adminPanel.style.display = "block";

  if (userText) {
    userText.innerText = "Sesión iniciada como: " + email;
  }

  await loadAdminData();
}

async function loadAdminData() {
  await Promise.all([
    loadAdminArtists(),
    loadAdminCategories(),
    loadAdminAlbums(),
    loadAdminSongs(),
    loadArtistOptions(),
    loadCategoryOptions(),
    loadAlbumOptions()
  ]);
}

/* =========================================================
   ADMIN: ARTISTAS
========================================================= */

function resetArtistForm() {
  currentEditingArtistId = null;

  const title = $("artistFormTitle");

  if (title) {
    title.innerText = "Agregar artista";
  }

  setInputValue("artistNameInput", "");
  setInputValue("artistDescriptionInput", "");
}

async function saveArtist() {
  const name = getInputValue("artistNameInput");
  const description = getInputValue("artistDescriptionInput");

  if (!name) {
    alert("Escribe el nombre del artista.");
    return;
  }

  const client = getSupabase();

  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  const payload = {
    name: name,
    slug: slugify(name),
    description: description,
    avatar_url: "",
    cover_url: ""
  };

  const result = currentEditingArtistId
    ? await client.from("artists").update(payload).eq("id", currentEditingArtistId)
    : await client.from("artists").insert(payload);

  if (result.error) {
    alert("No se pudo guardar artista: " + result.error.message);
    return;
  }

  const wasEditing = !!currentEditingArtistId;

  resetArtistForm();

  await Promise.all([
    loadAdminArtists(),
    loadArtistOptions(),
    loadArtistsPage(),
    loadHomeArtists()
  ]);

  alert(wasEditing ? "Artista actualizado." : "Artista guardado.");
}

async function editArtist(id) {
  const client = getSupabase();

  if (!client) return;

  const { data, error } = await client
    .from("artists")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    alert("No se pudo cargar el artista.");
    return;
  }

  currentEditingArtistId = id;

  const title = $("artistFormTitle");

  if (title) {
    title.innerText = "Editar artista";
  }

  setInputValue("artistNameInput", data.name || "");
  setInputValue("artistDescriptionInput", data.description || "");

  const form = $("artistFormCard");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function deleteArtist(id) {
  if (!confirm("¿Eliminar este artista?")) return;

  const client = getSupabase();

  if (!client) return;

  const { error } = await client
    .from("artists")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }

  await Promise.all([
    loadAdminArtists(),
    loadArtistOptions(),
    loadAdminAlbums(),
    loadAlbumOptions(),
    loadArtistsPage(),
    loadHomeArtists()
  ]);
}

async function loadAdminArtists() {
  const list = $("adminArtistList");

  if (!list) return;

  const { data, error } = await fetchArtists();

  if (error) {
    list.innerHTML = `<p style="color:#ffb4b4;">Error: ${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = `<p class="muted-text">No hay artistas todavía.</p>`;
    return;
  }

  list.innerHTML = data.map(function (artist) {
    return `
      <div class="admin-list-item">
        <div class="admin-person-row">
          <div class="artist-avatar-small">
            ${escapeHTML(getInitials(artist.name))}
          </div>

          <div>
            <strong>${escapeHTML(artist.name || "Sin nombre")}</strong>
            <p>${escapeHTML(artist.description || "Sin descripción.")}</p>
          </div>
        </div>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editArtist('${artist.id}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteArtist('${artist.id}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadArtistOptions() {
  const { data } = await fetchArtists();

  setOptions("albumArtistInput", data || [], "Selecciona artista", "id", "name");
  setMultiOptions("songArtistsInput", data || [], "name");
}
/* =========================================================
   ADMIN: CATEGORÍAS
========================================================= */

function resetCategoryForm() {
  currentEditingCategoryId = null;

  const title = $("categoryFormTitle");

  if (title) {
    title.innerText = "Agregar categoría";
  }

  setInputValue("categoryNameInput", "");
  setInputValue("categoryDescriptionInput", "");
}

async function saveCategory() {
  const name = getInputValue("categoryNameInput");
  const description = getInputValue("categoryDescriptionInput");

  if (!name) {
    alert("Escribe el nombre de la categoría.");
    return;
  }

  const client = getSupabase();

  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  const payload = {
    name: name,
    slug: slugify(name),
    description: description
  };

  const result = currentEditingCategoryId
    ? await client.from("categories").update(payload).eq("id", currentEditingCategoryId)
    : await client.from("categories").insert(payload);

  if (result.error) {
    alert("No se pudo guardar categoría: " + result.error.message);
    return;
  }

  const wasEditing = !!currentEditingCategoryId;

  resetCategoryForm();

  await Promise.all([
    loadAdminCategories(),
    loadCategoryOptions(),
    loadCategoriesPage()
  ]);

  alert(wasEditing ? "Categoría actualizada." : "Categoría guardada.");
}

async function editCategory(id) {
  const client = getSupabase();

  if (!client) return;

  const { data, error } = await client
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    alert("No se pudo cargar la categoría.");
    return;
  }

  currentEditingCategoryId = id;

  const title = $("categoryFormTitle");

  if (title) {
    title.innerText = "Editar categoría";
  }

  setInputValue("categoryNameInput", data.name || "");
  setInputValue("categoryDescriptionInput", data.description || "");

  const form = $("categoryFormCard");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function deleteCategory(id) {
  if (!confirm("¿Eliminar esta categoría?")) return;

  const client = getSupabase();

  if (!client) return;

  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }

  await Promise.all([
    loadAdminCategories(),
    loadCategoryOptions(),
    loadCategoriesPage()
  ]);
}

async function loadAdminCategories() {
  const list = $("adminCategoryList");

  if (!list) return;

  const { data, error } = await fetchCategories();

  if (error) {
    list.innerHTML = `<p style="color:#ffb4b4;">Error: ${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = `<p class="muted-text">No hay categorías todavía.</p>`;
    return;
  }

  list.innerHTML = data.map(function (category) {
    return `
      <div class="admin-list-item">
        <strong>${escapeHTML(category.name || "Sin nombre")}</strong>
        <p>${escapeHTML(category.description || "Sin descripción.")}</p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editCategory('${category.id}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteCategory('${category.id}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadCategoryOptions() {
  const { data } = await fetchCategories();

  setOptions("songCategoryInput", data || [], "Selecciona categoría", "id", "name");
}

/* =========================================================
   ADMIN: ÁLBUMES
========================================================= */

function resetAlbumForm() {
  currentEditingAlbumId = null;

  const title = $("albumFormTitle");

  if (title) {
    title.innerText = "Agregar álbum / carpeta";
  }

  setInputValue("albumArtistInput", "");
  setInputValue("albumTitleInput", "");
  setInputValue("albumDescriptionInput", "");
}

async function saveAlbum() {
  const artistId = getInputValue("albumArtistInput");
  const title = getInputValue("albumTitleInput");
  const description = getInputValue("albumDescriptionInput");

  if (!artistId || !title) {
    alert("Selecciona artista y escribe el nombre del álbum.");
    return;
  }

  const client = getSupabase();

  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  const payload = {
    artist_id: artistId,
    title: title,
    slug: slugify(title),
    description: description
  };

  const result = currentEditingAlbumId
    ? await client.from("albums").update(payload).eq("id", currentEditingAlbumId)
    : await client.from("albums").insert(payload);

  if (result.error) {
    alert("No se pudo guardar álbum: " + result.error.message);
    return;
  }

  const wasEditing = !!currentEditingAlbumId;

  resetAlbumForm();

  await Promise.all([
    loadAdminAlbums(),
    loadAlbumOptions()
  ]);

  alert(wasEditing ? "Álbum actualizado." : "Álbum guardado.");
}

async function editAlbum(id) {
  const client = getSupabase();

  if (!client) return;

  const { data, error } = await client
    .from("albums")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    alert("No se pudo cargar el álbum.");
    return;
  }

  currentEditingAlbumId = id;

  const title = $("albumFormTitle");

  if (title) {
    title.innerText = "Editar álbum / carpeta";
  }

  setInputValue("albumArtistInput", data.artist_id || "");
  setInputValue("albumTitleInput", data.title || "");
  setInputValue("albumDescriptionInput", data.description || "");

  const form = $("albumFormCard");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function deleteAlbum(id) {
  if (!confirm("¿Eliminar este álbum/carpeta? Las canciones no se borran.")) return;

  const client = getSupabase();

  if (!client) return;

  const { error } = await client
    .from("albums")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }

  await Promise.all([
    loadAdminAlbums(),
    loadAlbumOptions()
  ]);
}

async function loadAdminAlbums() {
  const list = $("adminAlbumList");

  if (!list) return;

  const { data, error } = await fetchAlbums();

  if (error) {
    list.innerHTML = `<p style="color:#ffb4b4;">Error: ${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = `<p class="muted-text">No hay álbumes todavía.</p>`;
    return;
  }

  list.innerHTML = data.map(function (album) {
    return `
      <div class="admin-list-item">
        <strong>📁 ${escapeHTML(album.title || "Sin título")}</strong>
        <p>${escapeHTML(album.artist ? album.artist.name : "Sin artista")}</p>
        <p>${escapeHTML(album.description || "Sin descripción.")}</p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editAlbum('${album.id}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteAlbum('${album.id}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadAlbumOptions() {
  const { data } = await fetchAlbums();

  const select = $("songAlbumInput");

  if (!select) return;

  select.innerHTML = `<option value="">Sin álbum / carpeta</option>`;

  (data || []).forEach(function (album) {
    const artistName = album.artist ? album.artist.name : "Sin artista";

    select.innerHTML += `
      <option value="${escapeHTML(album.id)}">
        ${escapeHTML(artistName)} — ${escapeHTML(album.title || "Sin título")}
      </option>
    `;
  });
}
/* =========================================================
   ADMIN: EDITOR DE LETRA
========================================================= */

function insertAtCursor(textareaId, text) {
  const textarea = $(textareaId);

  if (!textarea) return;

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);

  textarea.value = before + text + after;

  const newPosition = start + text.length;

  textarea.focus();
  textarea.setSelectionRange(newPosition, newPosition);
}

function insertSongSection(sectionName) {
  const cleanName = String(sectionName || "").trim();

  if (!cleanName) return;

  insertAtCursor("songLyricsInput", "\n[" + cleanName + "]\n");
}

/* =========================================================
   ADMIN: CANCIONES
========================================================= */

function resetSongForm() {
  currentEditingSongId = null;

  const title = $("songFormTitle");

  if (title) {
    title.innerText = "Agregar canción";
  }

  [
    "songTitleInput",
    "songToneInput",
    "songDifficultyInput",
    "songLyricsInput",
    "songLinksInput",
    "songCapoInput",
    "songCapoKeyInput"
  ].forEach(function (id) {
    setInputValue(id, "");
  });

  setInputValue("songTypeInput", "catolico");
  setInputValue("songCategoryInput", "");
  setInputValue("songAlbumInput", "");
  setSelectedValues("songArtistsInput", []);

  if (typeof window.resetAdminLinkItems === "function") {
    window.resetAdminLinkItems();
  }
}

async function saveSong() {
  const title = getInputValue("songTitleInput");
  const songType = getInputValue("songTypeInput") || "catolico";
  const tone = getInputValue("songToneInput");
  const difficulty = getInputValue("songDifficultyInput");
  const lyrics = getInputValue("songLyricsInput");
  const categoryId = getInputValue("songCategoryInput");
  const albumId = getInputValue("songAlbumInput");
  const artistIds = getSelectedValues("songArtistsInput");
  const linksText = getInputValue("songLinksInput");
  const links = parseSongLinksText(linksText);

  const capoPositionRaw = getInputValue("songCapoInput");
  const capoPosition = capoPositionRaw ? Number(capoPositionRaw) : 0;
  const capoKey = getInputValue("songCapoKeyInput");

  if (!title) {
    alert("Escribe el título de la canción.");
    return;
  }

  if (!artistIds.length) {
    alert("Selecciona al menos un artista.");
    return;
  }

  const client = getSupabase();

  if (!client) {
    alert("No se pudo conectar con Supabase.");
    return;
  }

  const payload = {
    title: title,
    slug: slugify(title),
    song_type: songType,
    tone: tone,
    difficulty: difficulty,
    lyrics: lyrics,
    artist_id: artistIds[0],
    category_id: categoryId || null,
    capo_position: Number.isNaN(capoPosition) ? 0 : capoPosition,
    capo_key: capoKey
  };

  let savedSongId = currentEditingSongId;
  let result;

  if (currentEditingSongId) {
    result = await client
      .from("songs")
      .update(payload)
      .eq("id", currentEditingSongId)
      .select("id")
      .single();
  } else {
    result = await client
      .from("songs")
      .insert(payload)
      .select("id")
      .single();
  }

  if (result.error) {
    alert("No se pudo guardar canción: " + result.error.message);
    return;
  }

  savedSongId = result.data ? result.data.id : savedSongId;

  const clearArtists = await client
    .from("song_artists")
    .delete()
    .eq("song_id", savedSongId);

  if (clearArtists.error) {
    alert("La canción se guardó, pero no se pudieron limpiar artistas anteriores: " + clearArtists.error.message);
    return;
  }

  const artistRows = artistIds.map(function (artistId, index) {
    return {
      song_id: savedSongId,
      artist_id: artistId,
      role: index === 0 ? "principal" : "colaborador",
      sort_order: index
    };
  });

  if (artistRows.length) {
    const artistResult = await client
      .from("song_artists")
      .insert(artistRows);

    if (artistResult.error) {
      alert("La canción se guardó, pero falló la relación con artistas: " + artistResult.error.message);
      return;
    }
  }

  const clearCategories = await client
    .from("song_categories")
    .delete()
    .eq("song_id", savedSongId);

  if (clearCategories.error) {
    alert("La canción se guardó, pero no se pudieron limpiar categorías anteriores: " + clearCategories.error.message);
    return;
  }

  if (categoryId) {
    const categoryResult = await client
      .from("song_categories")
      .insert({
        song_id: savedSongId,
        category_id: categoryId
      });

    if (categoryResult.error) {
      alert("La canción se guardó, pero falló la categoría: " + categoryResult.error.message);
      return;
    }
  }

  const clearAlbums = await client
    .from("album_songs")
    .delete()
    .eq("song_id", savedSongId);

  if (clearAlbums.error) {
    alert("La canción se guardó, pero no se pudieron limpiar álbumes anteriores: " + clearAlbums.error.message);
    return;
  }

  if (albumId) {
    const albumResult = await client
      .from("album_songs")
      .insert({
        song_id: savedSongId,
        album_id: albumId
      });

    if (albumResult.error) {
      alert("La canción se guardó, pero falló el álbum: " + albumResult.error.message);
      return;
    }
  }

  const clearLinks = await client
    .from("song_links")
    .delete()
    .eq("song_id", savedSongId);

  if (clearLinks.error) {
    alert("La canción se guardó, pero no se pudieron limpiar links anteriores: " + clearLinks.error.message);
    return;
  }

  if (links.length) {
    const linkRows = links.map(function (link, index) {
      return {
        song_id: savedSongId,
        title: link.title,
        link_type: link.link_type || "Tutorial",
        platform: link.platform || "",
        url: link.url,
        sort_order: index
      };
    });

    const linksResult = await client
      .from("song_links")
      .insert(linkRows);

    if (linksResult.error) {
      alert("La canción se guardó, pero fallaron los links: " + linksResult.error.message);
      return;
    }
  }

  const wasEditing = !!currentEditingSongId;

  resetSongForm();

  await Promise.all([
    loadAdminSongs(),
    loadSongsPage(),
    loadHomeSongs()
  ]);

  alert(wasEditing ? "Canción actualizada." : "Canción guardada.");
}
async function editSong(id) {
  const { data: songs, error } = await fetchSongsWithRelations([id]);

  if (error || !songs || !songs.length) {
    alert("No se pudo cargar la canción.");
    return;
  }

  const song = songs[0];

  currentEditingSongId = song.id;

  const title = $("songFormTitle");

  if (title) {
    title.innerText = "Editar canción";
  }

  setInputValue("songTitleInput", song.title || "");
  setInputValue("songTypeInput", song.song_type || "catolico");
  setInputValue("songToneInput", song.tone || "");
  setInputValue("songDifficultyInput", song.difficulty || "");
  setInputValue("songLyricsInput", song.lyrics || "");
  setInputValue("songLinksInput", linksToText(song._links || []));
  setInputValue("songCapoInput", song.capo_position || "");
  setInputValue("songCapoKeyInput", song.capo_key || "");

  setSelectedValues(
    "songArtistsInput",
    (song._artists || []).map(function (artist) {
      return artist.id;
    })
  );

  setInputValue(
    "songCategoryInput",
    song._categories && song._categories[0] ? song._categories[0].id : ""
  );

  setInputValue(
    "songAlbumInput",
    song._albums && song._albums[0] ? song._albums[0].id : ""
  );

  if (typeof window.loadAdminLinksFromTextarea === "function") {
    window.loadAdminLinksFromTextarea();
  }

  if (typeof window.updateAdminPreview === "function") {
    window.updateAdminPreview();
  }

  const form = $("songFormCard");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function deleteSong(id) {
  if (!confirm("¿Eliminar esta canción?")) return;

  const client = getSupabase();

  if (!client) return;

  const { error } = await client
    .from("songs")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }

  await Promise.all([
    loadAdminSongs(),
    loadSongsPage(),
    loadHomeSongs()
  ]);
}

async function loadAdminSongs() {
  const list = $("adminSongList");

  if (!list) return;

  const { data, error } = await fetchSongsWithRelations();

  if (error) {
    list.innerHTML = `<p style="color:#ffb4b4;">Error: ${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = `<p class="muted-text">No hay canciones todavía.</p>`;
    return;
  }

  list.innerHTML = data.map(function (song) {
    const linkCount = (song._links || []).length;
    const meta = [
      song.song_type || "",
      song.tone || "",
      linkCount ? linkCount + " link(s)" : ""
    ].filter(Boolean).join(" · ");

    return `
      <div class="admin-list-item">
        <strong>${escapeHTML(song.title || "Sin título")}</strong>

        <p class="artists-line">
          ${artistLinksHTML(song._artists)}
        </p>

        <p>${escapeHTML(meta)}</p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editSong('${song.id}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteSong('${song.id}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================================================
   ADMIN: LINKS Y PREVIEW
========================================================= */

let adminLinkItems = [];

function adminGetSelectedTexts(selectId) {
  const select = $(selectId);

  if (!select) return [];

  return Array.from(select.selectedOptions || [])
    .map(function (option) {
      return option.textContent.trim();
    })
    .filter(Boolean);
}

function adminParseLinksText(text) {
  return parseSongLinksText(text).map(function (link) {
    return {
      title: link.title || "Link",
      type: link.link_type || "Tutorial",
      platform: link.platform || "YouTube",
      url: link.url || ""
    };
  });
}

function adminTypeOptions(selected) {
  const options = [
    "Tutorial",
    "Video",
    "Canal",
    "Cover",
    "Acordes",
    "Letra",
    "Otro"
  ];

  return options.map(function (option) {
    return `
      <option value="${escapeHTML(option)}"${option === selected ? " selected" : ""}>
        ${escapeHTML(option)}
      </option>
    `;
  }).join("");
}

function adminPlatformOptions(selected) {
  const options = [
    "YouTube",
    "TikTok",
    "Instagram",
    "Facebook",
    "Spotify",
    "Sitio web",
    "Otro"
  ];

  return options.map(function (option) {
    return `
      <option value="${escapeHTML(option)}"${option === selected ? " selected" : ""}>
        ${escapeHTML(option)}
      </option>
    `;
  }).join("");
}

function syncAdminLinksTextarea() {
  const textarea = $("songLinksInput");

  if (!textarea) return;

  textarea.value = adminLinkItems.map(function (link) {
    return [
      link.title || "Link",
      link.type || "Tutorial",
      link.platform || "YouTube",
      link.url || ""
    ].join(" | ");
  }).join("\n");
}

function renderAdminLinksRows() {
  const box = $("songLinksRows");

  if (!box) return;

  if (!adminLinkItems.length) {
    box.innerHTML = `<p class="muted-text">Aún no hay links agregados.</p>`;
    syncAdminLinksTextarea();
    updateAdminPreview();
    return;
  }

  box.innerHTML = adminLinkItems.map(function (link, index) {
    return `
      <div class="song-card">
        <input
          type="text"
          value="${escapeHTML(link.title || "")}"
          placeholder="Título del link"
          oninput="updateAdminLinkField(${index}, 'title', this.value)"
        >

        <select onchange="updateAdminLinkField(${index}, 'type', this.value)">
          ${adminTypeOptions(link.type || "Tutorial")}
        </select>

        <select onchange="updateAdminLinkField(${index}, 'platform', this.value)">
          ${adminPlatformOptions(link.platform || "YouTube")}
        </select>

        <input
          type="url"
          value="${escapeHTML(link.url || "")}"
          placeholder="URL"
          oninput="updateAdminLinkField(${index}, 'url', this.value)"
        >

        <button class="song-btn small-btn danger" type="button" onclick="deleteAdminLink(${index})">
          Borrar link
        </button>
      </div>
    `;
  }).join("");

  syncAdminLinksTextarea();
  updateAdminPreview();
}

function updateAdminLinkField(index, field, value) {
  if (!adminLinkItems[index]) return;

  adminLinkItems[index][field] = value;

  syncAdminLinksTextarea();
  updateAdminPreview();
}

function addAdminLinkFromFields() {
  const title = getInputValue("newLinkTitleInput");
  const type = getInputValue("newLinkTypeInput") || "Tutorial";
  const platform = getInputValue("newLinkPlatformInput") || "YouTube";
  const url = getInputValue("newLinkUrlInput");

  if (!url) {
    alert("Pega el enlace antes de agregarlo.");
    return;
  }

  adminLinkItems.push({
    title: title || type + " en " + platform,
    type: type,
    platform: platform,
    url: url
  });

  setInputValue("newLinkTitleInput", "");
  setInputValue("newLinkUrlInput", "");

  renderAdminLinksRows();
}

function deleteAdminLink(index) {
  if (!confirm("¿Borrar este link?")) return;

  adminLinkItems.splice(index, 1);
  renderAdminLinksRows();
}

function loadAdminLinksFromTextarea() {
  const textarea = $("songLinksInput");

  if (!textarea) return;

  textarea.hidden = true;
  textarea.style.display = "none";

  adminLinkItems = adminParseLinksText(textarea.value);
  renderAdminLinksRows();
}

function resetAdminLinkItems() {
  adminLinkItems = [];
  renderAdminLinksRows();
}
function adminRenderLyricsPreview(lyrics) {
  return escapeHTML(lyrics || "").replace(/\(([^)]+)\)/g, function (_, chord) {
    return `<span class="chord-token">${escapeHTML(chord)}</span>`;
  });
}

function updateAdminPreview() {
  const box = $("adminPreviewBox");

  if (!box) return;

  const title = getInputValue("songTitleInput") || "Título del canto";
  const tone = getInputValue("songToneInput");
  const difficulty = getInputValue("songDifficultyInput");
  const capo = getInputValue("songCapoInput");
  const capoKey = getInputValue("songCapoKeyInput");
  const lyrics = $("songLyricsInput") ? $("songLyricsInput").value : "";
  const linksText = $("songLinksInput") ? $("songLinksInput").value : "";

  const artists = adminGetSelectedTexts("songArtistsInput");
  const links = adminLinkItems.length ? adminLinkItems : adminParseLinksText(linksText);

  const capoText = Number(capo) > 0
    ? "Capo " + capo + (capoKey ? " · Figuras en " + capoKey : "")
    : "";

  box.innerHTML = `
    <article class="song-detail-card preview-card">
      <p class="artists-line">
        ${artists.length ? escapeHTML(artists.join(" · ")) : "Sin artista seleccionado"}
      </p>

      <h1>${escapeHTML(title)}</h1>

      <p class="song-meta-line">
        ${escapeHTML([tone, difficulty].filter(Boolean).join(" · "))}
      </p>

      ${capoText ? `
        <div class="capo-box">
          <span>Sin capo: ${escapeHTML(tone || "Tono original")}</span>
          <span>Con ${escapeHTML(capoText)}</span>
        </div>
      ` : ""}

      <pre class="lyrics-block">${adminRenderLyricsPreview(lyrics || "La letra aparecerá aquí...")}</pre>

      ${links.length ? `
        <section class="song-links-box">
          <h2>Tutoriales y enlaces</h2>

          <div class="song-links-list">
            ${links.map(function (link) {
              return `
                <div class="song-link-item">
                  <span>🔗</span>

                  <div>
                    <strong>${escapeHTML(link.title || "Link")}</strong>
                    <small>${escapeHTML([link.platform, link.type].filter(Boolean).join(" · "))}</small>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>
      ` : ""}
    </article>
  `;
}

function setupAdminPreviewEvents() {
  [
    "songTitleInput",
    "songTypeInput",
    "songToneInput",
    "songDifficultyInput",
    "songCapoInput",
    "songCapoKeyInput",
    "songLyricsInput",
    "songArtistsInput",
    "songCategoryInput",
    "songAlbumInput"
  ].forEach(function (id) {
    const element = $(id);

    if (!element) return;

    element.addEventListener("input", updateAdminPreview);
    element.addEventListener("change", updateAdminPreview);
  });

  const textarea = $("songLinksInput");

  if (textarea) {
    textarea.hidden = true;
    textarea.style.display = "none";
  }

  loadAdminLinksFromTextarea();
  updateAdminPreview();
}

/* =========================================================
   DONACIONES
========================================================= */

function copyDonationNumber() {
  const numberElement = $("donationNumber");
  const message = $("copyDonationMessage");
  const number = numberElement ? numberElement.textContent.trim() : "";

  if (!number) {
    if (message) {
      message.textContent = "No se encontró el número de donación.";
    }

    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(number).then(function () {
      if (message) {
        message.textContent = "Número copiado correctamente.";
      }
    }).catch(function () {
      if (message) {
        message.textContent = "No se pudo copiar automáticamente. Puedes copiarlo manualmente.";
      }
    });

    return;
  }

  if (message) {
    message.textContent = "Puedes copiar el número manualmente: " + number;
  }
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  try {
    initTheme();
    initMenu();

    const themeButton = $("themeToggle");

    if (themeButton) {
      themeButton.addEventListener("click", toggleTheme);
    }

    setupSongsSearch();
    setupArtistsSearch();
    setupCategoriesSearch();
    setupAdminPreviewEvents();

    await Promise.all([
      loadHomeSongs(),
      loadHomeArtists(),
      loadSongsPage(),
      loadArtistsPage(),
      loadCategoriesPage(),
      loadArtistProfile(),
      loadSongPage()
    ]);

    if ($("adminPanel")) {
      await checkAdminSession();
    }
  } catch (error) {
    console.error("Error iniciando Juntos Hacia Dios:", error);
  }
});
/* =========================================================
   FUNCIONES EXPUESTAS PARA HTML
========================================================= */

window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;

window.saveArtist = saveArtist;
window.editArtist = editArtist;
window.deleteArtist = deleteArtist;
window.cancelArtistEdit = resetArtistForm;

window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.cancelCategoryEdit = resetCategoryForm;

window.saveAlbum = saveAlbum;
window.editAlbum = editAlbum;
window.deleteAlbum = deleteAlbum;
window.cancelAlbumEdit = resetAlbumForm;

window.saveSong = saveSong;
window.editSong = editSong;
window.deleteSong = deleteSong;
window.cancelSongEdit = resetSongForm;

window.insertSongSection = insertSongSection;

window.changeTranspose = changeTranspose;
window.resetTranspose = resetTranspose;
window.setCapoMode = setCapoMode;

window.setSongsFilter = setSongsFilter;
window.selectCategoryById = selectCategoryById;

window.copyDonationNumber = copyDonationNumber;

window.updateAdminPreview = updateAdminPreview;
window.addAdminLinkFromFields = addAdminLinkFromFields;
window.updateAdminLinkField = updateAdminLinkField;
window.deleteAdminLink = deleteAdminLink;
window.loadAdminLinksFromTextarea = loadAdminLinksFromTextarea;
window.resetAdminLinkItems = resetAdminLinkItems;

window.loadHomeSongs = loadHomeSongs;
window.loadHomeArtists = loadHomeArtists;
window.loadSongsPage = loadSongsPage;
window.loadArtistsPage = loadArtistsPage;
window.loadCategoriesPage = loadCategoriesPage;
window.loadArtistProfile = loadArtistProfile;
window.loadSongPage = loadSongPage;
/* =========================================================
   FIX: ACORDES ARRIBA DE LA LETRA + CAPO CORRECTO
   Este bloque corrige la forma de mostrar acordes y capo.
========================================================= */

function getTotalTransposeSteps() {
  if (!currentSongForPage) return currentTransposeSteps;

  const capoPosition = getCapoPosition(currentSongForPage);

  if (capoPosition > 0) {
    if (currentCapoMode === "capo") {
      return currentTransposeSteps;
    }

    return currentTransposeSteps + capoPosition;
  }

  return currentTransposeSteps;
}

function renderChordedLyrics(lyrics, transposeSteps) {
  const steps = Number(transposeSteps || 0);
  const lines = String(lyrics || "").split("\n");

  return lines.map(function (line) {
    if (!line.includes("(")) {
      return escapeHTML(line);
    }

    let chordLine = "";
    let lyricLine = "";
    let lyricPosition = 0;

    const regex = /\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const textBeforeChord = line.slice(lastIndex, match.index);

      lyricLine += textBeforeChord;
      lyricPosition += textBeforeChord.length;

      const chord = transposeChordGroup(match[1], steps);

      while (chordLine.length < lyricPosition) {
        chordLine += " ";
      }

      chordLine += chord;

      lastIndex = regex.lastIndex;
    }

    const textAfterLastChord = line.slice(lastIndex);
    lyricLine += textAfterLastChord;

    return `<span class="chord-line">${escapeHTML(chordLine)}</span>
<span class="lyric-line">${escapeHTML(lyricLine)}</span>`;
  }).join("\n");
}

function adminRenderLyricsPreview(lyrics) {
  return renderChordedLyrics(lyrics || "", 0);
}

async function loadSongPage() {
  const box = $("songPage") || $("songDetail") || $("cantoContent");

  if (!box) return;

  const slug = getUrlParam("slug");
  const client = getSupabase();

  if (!client || !slug) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Canto no encontrado</h3>
        <p>Vuelve al cancionero e intenta de nuevo.</p>
      </div>
    `;
    return;
  }

  const { data: song, error } = await client
    .from("songs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !song) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Canto no encontrado</h3>
        <p>Este canto no existe o fue eliminado.</p>
      </div>
    `;
    return;
  }

  const { data: songs } = await fetchSongsWithRelations([song.id]);

  const fullSong = songs && songs[0]
    ? songs[0]
    : Object.assign({}, song, {
        _artists: [],
        _categories: [],
        _albums: [],
        _links: []
      });

  currentSongForPage = fullSong;
  currentTransposeSteps = 0;
  currentCapoMode = "original";

  const capoPosition = getCapoPosition(fullSong);
  const capoKey = fullSong.capo_key || "";
  const meta = songMetaText(fullSong);

  box.innerHTML = `
    <article class="song-detail-card">
      <p class="artists-line">
        ${artistLinksHTML(fullSong._artists)}
      </p>

      <h1>${escapeHTML(fullSong.title || "Sin título")}</h1>

      <p class="song-meta-line">
        ${escapeHTML(meta)}
      </p>

      ${capoPosition > 0 ? `
        <div class="capo-box">
          <span id="capoModeLabel">Sin capo</span>

          <button type="button" class="song-btn small-btn" onclick="setCapoMode('original')">
            Sin capo
          </button>

          <button type="button" class="song-btn small-btn" onclick="setCapoMode('capo')">
            Con capo ${capoPosition}${capoKey ? " · " + escapeHTML(capoKey) : ""}
          </button>
        </div>
      ` : ""}

      <div class="transpose-box">
        <button type="button" class="song-btn small-btn" onclick="changeTranspose(-1)">
          Bajar tono
        </button>

        <span id="transposeLabel">Tono original</span>

        <button type="button" class="song-btn small-btn" onclick="changeTranspose(1)">
          Subir tono
        </button>

        <button type="button" class="song-btn small-btn" onclick="resetTranspose()">
          Original
        </button>
      </div>

      <pre class="lyrics-block" id="lyricsContent"></pre>

      ${renderSongLinksHTML(fullSong._links || [])}
    </article>
  `;

  updateSongLyricsDisplay();
}
