/* =========================================================
   JUNTOS HACIA DIOS
   app.js estable
========================================================= */

const ADMIN_EMAIL = "mooreprint645@gmail.com";

/* =========================================================
   ESTADO GLOBAL
========================================================= */

let currentEditingArtistId = null;
let currentEditingCategoryId = null;
let currentEditingAlbumId = null;
let currentEditingSongId = null;

let currentSongForPage = null;
let currentTransposeSteps = 0;
let currentCapoMode = "original";

let allSongsForPage = [];
let currentSongsFilter = "all";

let allArtistsForPage = [];
let allCategoriesForPage = [];
let allCategorySongsForPage = [];

let adminLinkItems = [];
let adminCapoVersionItems = [];

let adminCategoryBrowserType = "catolico";
let adminCategoryBrowserParentId = null;
let adminCategoryBrowserCategories = [];

let lockedCategoryParentId = null;
let currentDonationSettingsId = null;

/* =========================================================
   HELPERS
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

function safeUrlParam(value) {
  return encodeURIComponent(String(value || ""));
}

function getInputValue(id) {
  const input = $(id);
  return input ? String(input.value || "").trim() : "";
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
    element.textContent = text || "";
  }
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function currentPageFile() {
  const path = String(window.location.pathname || "").toLowerCase();
  return path.split("/").pop() || "index.html";
}

function isPage(fileName) {
  return currentPageFile() === fileName;
}

function isHomePage() {
  const file = currentPageFile();
  return file === "" || file === "index.html";
}

function getInitials(name) {
  const clean = String(name || "").trim().replace(/\s+/g, " ");

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
    .join("");
}

function getSelectedValues(selectId) {
  const box = $(selectId);

  if (!box) return [];

  if (box.tagName === "SELECT") {
    return Array.from(box.selectedOptions || [])
      .map(function (option) {
        return option.value;
      })
      .filter(Boolean);
  }

  return Array.from(box.querySelectorAll('input[type="checkbox"]:checked'))
    .map(function (input) {
      return input.value;
    })
    .filter(Boolean);
}

function setSelectedValues(selectId, values) {
  const box = $(selectId);

  if (!box) return;

  const selected = new Set((values || []).map(String));

  if (box.tagName === "SELECT") {
    Array.from(box.options || []).forEach(function (option) {
      option.selected = selected.has(String(option.value));
    });
    return;
  }

  Array.from(box.querySelectorAll('input[type="checkbox"]')).forEach(function (input) {
    input.checked = selected.has(String(input.value));
  });
}

function setOptions(selectId, items, placeholder, valueKey, labelKey) {
  const select = $(selectId);

  if (!select) return;

  const valueField = valueKey || "id";
  const labelField = labelKey || "name";

  select.innerHTML = `<option value="">${escapeHTML(placeholder || "Selecciona")}</option>`;

  (items || []).forEach(function (item) {
    select.innerHTML += `
      <option value="${escapeHTML(item[valueField] || "")}">
        ${escapeHTML(item[labelField] || "Sin nombre")}
      </option>
    `;
  });
}

function setMultiOptions(selectId, items, labelKey) {
  const select = $(selectId);

  if (!select) return;

  const labelField = labelKey || "name";

  select.innerHTML = "";

  (items || []).forEach(function (item) {
    select.innerHTML += `
      <option value="${escapeHTML(item.id || "")}">
        ${escapeHTML(item[labelField] || "Sin nombre")}
      </option>
    `;
  });
}
function artistsText(song) {
  const artists = song && song._artists ? song._artists : [];

  if (!artists.length) return "Sin artista";

  return artists
    .map(function (artist) {
      return artist.name || "";
    })
    .filter(Boolean)
    .join(" · ");
}

function artistLinksHTML(artists) {
  const safeArtists = artists || [];

  if (!safeArtists.length) {
    return `<span>Sin artista</span>`;
  }

  return safeArtists.map(function (artist) {
    const slug = artist.slug || slugify(artist.name || "");

    return `
      <a href="artista.html?slug=${safeUrlParam(slug)}">
        ${escapeHTML(artist.name || "Sin artista")}
      </a>
    `;
  }).join(`<span class="artist-dot"> · </span>`);
}

function songMetaText(song) {
  return [
    song && song.tone ? "Tono " + song.tone : "",
    song && song.difficulty ? song.difficulty : ""
  ].filter(Boolean).join(" · ");
}

function songTypeLabel(type) {
  const clean = String(type || "").toLowerCase();

  if (clean === "catolico") return "Católico";
  if (clean === "cristiano") return "Cristiano";

  return "Sin tipo";
}

function categoryTypeLabel(type) {
  const clean = String(type || "").toLowerCase();

  if (clean === "catolico") return "Católico";
  if (clean === "cristiano") return "Cristiano";

  return "General";
}

function artistTypeLabel(type) {
  const clean = String(type || "").toLowerCase();

  if (clean === "catolico") return "Católico";
  if (clean === "cristiano") return "Cristiano";
  if (clean === "mixto") return "Mixto";

  return "Sin tipo";
}

/* =========================================================
   TEMA Y MENÚ
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

  button.textContent = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
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

  const newButton = button.cloneNode(true);
  button.parentNode.replaceChild(newButton, button);

  newButton.setAttribute("aria-expanded", "false");
  newButton.setAttribute("aria-controls", "navMenu");

  newButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    const isOpen = menu.classList.toggle("show-menu");
    menu.classList.toggle("open", isOpen);

    newButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.remove("show-menu");
      menu.classList.remove("open");
      newButton.setAttribute("aria-expanded", "false");
    });
  });
}

function fixMainNavigationLinks() {
  document.querySelectorAll("a").forEach(function (link) {
    const text = String(link.textContent || "").trim().toLowerCase();

    if (text === "inicio") link.setAttribute("href", "index.html");
    if (text === "canciones") link.setAttribute("href", "canciones.html");
    if (text === "artistas") link.setAttribute("href", "artistas.html");
    if (text === "categorías" || text === "categorias") link.setAttribute("href", "categorias.html");
    if (text === "donaciones") link.setAttribute("href", "donaciones.html");
  });
}

function hideAdminLinkOnPublicPages() {
  if (isPage("admin.html")) return;

  document.querySelectorAll("a").forEach(function (link) {
    const href = String(link.getAttribute("href") || "").toLowerCase();
    const text = String(link.textContent || "").trim().toLowerCase();

    if (href.includes("admin.html") || text === "admin" || text === "administración") {
      link.remove();
    }
  });
}
/* =========================================================
   SUPABASE: LECTURA
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
    .order("song_type", { ascending: true })
    .order("sort_order", { ascending: true })
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

  return {
    data: (albums || []).map(function (album) {
      return Object.assign({}, album, {
        artist: artistMap.get(album.artist_id) || null
      });
    }),
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

  if (Array.isArray(ids) && ids.length === 0) {
    return {
      data: [],
      error: null
    };
  }

  let query = client
    .from("songs")
    .select("*")
    .order("title", { ascending: true });

  if (Array.isArray(ids) && ids.length) {
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

async function fetchCapoVersionsBySongIds(songIds) {
  const client = getSupabase();

  if (!client || !songIds || !songIds.length) {
    return {
      data: [],
      error: null
    };
  }

  return await client
    .from("song_capo_versions")
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

  if (Array.isArray(ids) && ids.length === 0) {
    return {
      data: [],
      error: null
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

  const [artistRes, categoryRes, albumRes, linksRes, capoRes] = await Promise.all([
    client
      .from("song_artists")
      .select("song_id, role, sort_order, artists(id, name, slug, description, artist_type)")
      .in("song_id", songIds)
      .order("sort_order", { ascending: true }),

    client
      .from("song_categories")
      .select("song_id, categories(id, name, slug, description, song_type, parent_id, sort_order)")
      .in("song_id", songIds),

    client
      .from("album_songs")
      .select("song_id, albums(id, title, slug, description, artist_id)")
      .in("song_id", songIds),

    fetchSongLinksBySongIds(songIds),

    fetchCapoVersionsBySongIds(songIds)
  ]);

  if (artistRes.error) return { data: [], error: artistRes.error };
  if (categoryRes.error) return { data: [], error: categoryRes.error };
  if (albumRes.error) return { data: [], error: albumRes.error };
  if (linksRes.error) return { data: [], error: linksRes.error };
  if (capoRes.error) return { data: [], error: capoRes.error };

  const artistsBySong = new Map();
  const categoriesBySong = new Map();
  const albumsBySong = new Map();
  const linksBySong = new Map();
  const capoBySong = new Map();

  (artistRes.data || []).forEach(function (row) {
    if (!artistsBySong.has(row.song_id)) artistsBySong.set(row.song_id, []);
    if (row.artists) artistsBySong.get(row.song_id).push(row.artists);
  });

  (categoryRes.data || []).forEach(function (row) {
    if (!categoriesBySong.has(row.song_id)) categoriesBySong.set(row.song_id, []);
    if (row.categories) categoriesBySong.get(row.song_id).push(row.categories);
  });

  (albumRes.data || []).forEach(function (row) {
    if (!albumsBySong.has(row.song_id)) albumsBySong.set(row.song_id, []);
    if (row.albums) albumsBySong.get(row.song_id).push(row.albums);
  });

  (linksRes.data || []).forEach(function (row) {
    if (!linksBySong.has(row.song_id)) linksBySong.set(row.song_id, []);
    linksBySong.get(row.song_id).push(row);
  });

  (capoRes.data || []).forEach(function (row) {
    if (!capoBySong.has(row.song_id)) capoBySong.set(row.song_id, []);
    capoBySong.get(row.song_id).push(row);
  });

  return {
    data: safeSongs.map(function (song) {
      return Object.assign({}, song, {
        _artists: artistsBySong.get(song.id) || [],
        _categories: categoriesBySong.get(song.id) || [],
        _albums: albumsBySong.get(song.id) || [],
        _links: linksBySong.get(song.id) || [],
        _capoVersions: capoBySong.get(song.id) || []
      });
    }),
    error: null
  };
}

/* =========================================================
   LINKS DE CANCIONES
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
   ACORDES, TRANSPOSICIÓN Y CAPO
========================================================= */

const CHORD_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const FLAT_TO_SHARP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#"
};

function normalizeNote(note) {
  const clean = String(note || "")
    .trim()
    .replace("♯", "#")
    .replace("♭", "b");

  return FLAT_TO_SHARP[clean] || clean;
}

function getRootNote(value) {
  const match = String(value || "").trim().match(/[A-G](?:#|b|♯|♭)?/);
  return match ? normalizeNote(match[0]) : "";
}

function noteIndex(note) {
  return CHORD_NOTES.indexOf(normalizeNote(note));
}

function transposeNote(note, steps) {
  const index = noteIndex(note);

  if (index === -1) return note;

  const nextIndex = (index + steps + CHORD_NOTES.length * 10) % CHORD_NOTES.length;

  return CHORD_NOTES[nextIndex];
}

function transposeSingleChord(chord, steps) {
  const match = String(chord || "").match(/^([A-G](?:#|b|♯|♭)?)(.*)$/);

  if (!match) return chord;

  const root = match[1];
  let rest = match[2] || "";

  const transposedRoot = transposeNote(root, steps);

  rest = rest.replace(/\/([A-G](?:#|b|♯|♭)?)/g, function (_, bassNote) {
    return "/" + transposeNote(bassNote, steps);
  });

  return transposedRoot + rest;
}

function transposeChordGroup(chordGroup, steps) {
  return String(chordGroup || "").replace(/[A-G](?:#|b|♯|♭)?[a-zA-Z0-9#b♯♭°+\-susmajdimaug/()]*/g, function (chord) {
    return transposeSingleChord(chord, steps);
  });
}

function getCapoPosition(song) {
  const value = Number(song && song.capo_position ? song.capo_position : 0);
  return Number.isNaN(value) ? 0 : value;
}

function capoVersionLabel(version) {
  if (!version) return "Sin capo";

  const label = version.label || "";
  const capo = Number(version.capo_position || 0);
  const key = version.capo_key || "";

  if (label) return label;
  if (capo > 0 && key) return "Capo " + capo + " · " + key;
  if (capo > 0) return "Capo " + capo;

  return "Versión";
}

function capoVersionToSong(song, version) {
  if (!song || !version) return song;

  return Object.assign({}, song, {
    capo_position: version.capo_position || 0,
    capo_key: version.capo_key || ""
  });
}

function getCapoTransposeSteps(song) {
  if (!song) return 0;

  const originalTone = getRootNote(song.tone || "");
  const capoTone = getRootNote(song.capo_key || "");

  const originalIndex = noteIndex(originalTone);
  const capoIndex = noteIndex(capoTone);

  if (originalIndex !== -1 && capoIndex !== -1) {
    let diff = capoIndex - originalIndex;

    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    return diff;
  }

  const capoPosition = getCapoPosition(song);

  return capoPosition > 0 ? -capoPosition : 0;
}

function getSelectedCapoSong() {
  if (!currentSongForPage) return null;

  const versions = currentSongForPage._capoVersions || [];

  if (currentSongForPage._selectedCapoVersionIndex >= 0 && versions[currentSongForPage._selectedCapoVersionIndex]) {
    return capoVersionToSong(currentSongForPage, versions[currentSongForPage._selectedCapoVersionIndex]);
  }

  return currentSongForPage;
}

function getTotalTransposeSteps() {
  if (!currentSongForPage) return currentTransposeSteps;

  if (currentCapoMode === "capo") {
    return currentTransposeSteps + getCapoTransposeSteps(getSelectedCapoSong());
  }

  return currentTransposeSteps;
}

function getSectionClass(sectionName) {
  const name = String(sectionName || "").toLowerCase();

  if (name.includes("coro") || name.includes("estribillo")) return "section-coro";
  if (name.includes("verso") || name.includes("estrofa")) return "section-verso";
  if (name.includes("intro")) return "section-intro";
  if (name.includes("puente")) return "section-puente";
  if (name.includes("pre")) return "section-pre";
  if (name.includes("final") || name.includes("outro")) return "section-final";

  return "section-default";
}

function renderChordedLyrics(lyrics, transposeSteps) {
  const steps = Number(transposeSteps || 0);
  const lines = String(lyrics || "").split("\n");

  return lines.map(function (line) {
    const rawLine = String(line || "");
    const trimmed = rawLine.trim();

    if (!trimmed) {
      return `<span class="song-empty-line"></span>`;
    }

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);

    if (sectionMatch) {
      const sectionName = sectionMatch[1];

      return `
        <span class="song-section-label ${getSectionClass(sectionName)}">
          ${escapeHTML(sectionName)}
        </span>
      `;
    }

    if (!rawLine.includes("(")) {
      return `
        <span class="song-plain-line">
          ${escapeHTML(rawLine)}
        </span>
      `;
    }

    let chordLine = "";
    let lyricLine = "";
    let lyricPosition = 0;

    const regex = /\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawLine)) !== null) {
      const textBeforeChord = rawLine.slice(lastIndex, match.index);

      lyricLine += textBeforeChord;
      lyricPosition += textBeforeChord.length;

      const chord = transposeChordGroup(match[1], steps);

      while (chordLine.length < lyricPosition) {
        chordLine += " ";
      }

      chordLine += chord;

      lastIndex = regex.lastIndex;
    }

    lyricLine += rawLine.slice(lastIndex);

    return `
      <span class="song-line">
        <span class="chord-line">${escapeHTML(chordLine)}</span>
        <span class="lyric-line">${escapeHTML(lyricLine)}</span>
      </span>
    `;
  }).join("");
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

  if (currentSongForPage) {
    currentSongForPage._selectedCapoVersionIndex = -1;
  }

  updateSongLyricsDisplay();
}

function setCapoVersionByIndex(index) {
  currentCapoMode = "capo";
  currentTransposeSteps = 0;

  if (currentSongForPage) {
    currentSongForPage._selectedCapoVersionIndex = Number(index);
  }

  updateSongLyricsDisplay();
}

function updateSongLyricsDisplay() {
  const lyricsBox = $("lyricsContent");
  const label = $("transposeLabel");
  const modeLabel = $("capoModeLabel");

  if (!lyricsBox || !currentSongForPage) return;

  lyricsBox.innerHTML = renderChordedLyrics(
    currentSongForPage.lyrics || "",
    getTotalTransposeSteps()
  );

  if (label) {
    if (currentTransposeSteps === 0) {
      label.textContent = "Tono original";
    } else if (currentTransposeSteps > 0) {
      label.textContent = "+" + currentTransposeSteps;
    } else {
      label.textContent = String(currentTransposeSteps);
    }
  }

  if (modeLabel) {
    if (currentCapoMode !== "capo") {
      modeLabel.textContent = "Sin capo / tono original";
      return;
    }

    const selectedSong = getSelectedCapoSong();
    const capo = getCapoPosition(selectedSong);
    const capoKey = selectedSong.capo_key || "";

    modeLabel.textContent = capo > 0
      ? "Con capo " + capo + (capoKey ? " · Figuras en " + capoKey : "")
      : "Con capo";
  }
}
/* =========================================================
   PÚBLICO: INICIO
========================================================= */

async function loadHomeSongs() {
  if (!isHomePage()) return;

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
  if (!isHomePage()) return;

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
        }).join(" "),
         (song._albums || []).map(function (album) {
  return album.title || album.name || "";
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
  if (!isPage("canciones.html")) return;

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
  const searchParam = getUrlParam("buscar") || getUrlParam("q");

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
  if (!isPage("canciones.html")) return;

  const input = $("songsSearchInput") || $("songSearchInput") || $("searchInput");

  if (!input) return;

  input.addEventListener("input", renderSongsPage);
}

/* =========================================================
   PÚBLICO: ARTISTAS
========================================================= */

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
  if (!isPage("artistas.html")) return;

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
  if (!isPage("artistas.html")) return;

  const input = $("artistsSearchInput") || $("artistSearchInput") || $("artistSearch");

  if (!input) return;

  input.addEventListener("input", function () {
    const query = input.value.trim().toLowerCase();

    const filtered = allArtistsForPage.filter(function (artist) {
      const text = [
        artist.name || "",
        artist.description || "",
        artist.artist_type || ""
      ].join(" ").toLowerCase();

      return text.includes(query);
    });

    renderArtistsPage(filtered);
  });
}

/* =========================================================
   PÚBLICO: CATEGORÍAS COMPACTAS
========================================================= */

function getCategoriesRoot() {
  if (!isPage("categorias.html")) return null;

  return $("categoriesPage") || $("categoriesGrid") || $("categoryList");
}

function getCategoriesSearchInput() {
  if (!isPage("categorias.html")) return null;

  return (
    $("categoriesSearchInput") ||
    $("categorySearchInput") ||
    document.querySelector('input[type="search"]') ||
    Array.from(document.querySelectorAll("input")).find(function (input) {
      const placeholder = String(input.placeholder || "").toLowerCase();
      return placeholder.includes("ador") || placeholder.includes("categor");
    })
  );
}

function getPublicCategoryById(categoryId) {
  return allCategoriesForPage.find(function (category) {
    return String(category.id) === String(categoryId);
  });
}

function getPublicCategoryChildren(parentId) {
  return allCategoriesForPage
    .filter(function (category) {
      if (adminCategoryBrowserType) {
        if (category.song_type !== adminCategoryBrowserType) return false;
      } else if (category.song_type) {
        return false;
      }

      return String(category.parent_id || "") === String(parentId || "");
    })
    .sort(function (a, b) {
      const orderA = Number(a.sort_order || 0);
      const orderB = Number(b.sort_order || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function getPublicCategoryPath(parentId) {
  const path = [];
  let currentId = parentId;

  while (currentId) {
    const category = getPublicCategoryById(currentId);

    if (!category) break;

    path.unshift(category);
    currentId = category.parent_id || null;
  }

  return path;
}

function setPublicCategoryType(type) {
  adminCategoryBrowserType = type || "";
  adminCategoryBrowserParentId = null;
  renderCategoriesExplorer();
}

function openPublicCategoryFolder(categoryId) {
  adminCategoryBrowserParentId = categoryId || null;
  renderCategoriesExplorer();

  const root = getCategoriesRoot();

  if (root) {
    root.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function renderPublicCategoryPath() {
  const path = getPublicCategoryPath(adminCategoryBrowserParentId);

  let html = `
    <div class="public-category-path">
      <span>Ruta:</span>
      <button type="button" class="song-btn small-btn" onclick="openPublicCategoryFolder(null)">
        Inicio
      </button>
  `;

  path.forEach(function (category) {
    html += `
      <span>›</span>
      <button
        type="button"
        class="song-btn small-btn"
        onclick="openPublicCategoryFolder('${escapeHTML(category.id)}')"
      >
        ${escapeHTML(category.name || "Categoría")}
      </button>
    `;
  });

  html += `</div>`;

  return html;
}

function categorySongsHref(category) {
  return `categorias.html?categoria=${safeUrlParam(category.slug || "")}`;
}

function renderCategoriesExplorer() {
  const root = getCategoriesRoot();

  if (!root) return;

  const children = getPublicCategoryChildren(adminCategoryBrowserParentId);

  root.innerHTML = `
    <div class="public-category-explorer">
      <p class="muted">${allCategoriesForPage.length} categorías disponibles</p>

      <div class="public-category-tabs">
        <button
          type="button"
          class="song-btn small-btn public-category-tab ${adminCategoryBrowserType === "catolico" ? "active" : ""}"
          onclick="setPublicCategoryType('catolico')"
        >
          Católico
        </button>

        <button
          type="button"
          class="song-btn small-btn public-category-tab ${adminCategoryBrowserType === "cristiano" ? "active" : ""}"
          onclick="setPublicCategoryType('cristiano')"
        >
          Cristiano
        </button>

        <button
          type="button"
          class="song-btn small-btn public-category-tab ${adminCategoryBrowserType === "" ? "active" : ""}"
          onclick="setPublicCategoryType('')"
        >
          General
        </button>
      </div>

      ${renderPublicCategoryPath()}

      ${children.length ? `
        <div class="artists-grid public-category-grid">
          ${children.map(function (category) {
            const childCount = allCategoriesForPage.filter(function (child) {
              return String(child.parent_id || "") === String(category.id || "");
            }).length;

            return `
              <article class="artist-card public-category-card">
                <h3>📁 ${escapeHTML(category.name || "Categoría")}</h3>
                <p>${escapeHTML(category.description || "Sin descripción.")}</p>
                <p>${childCount} subcategoría(s)</p>

                <div class="public-category-card-actions">
                  ${childCount ? `
                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="openPublicCategoryFolder('${escapeHTML(category.id)}')"
                    >
                      Abrir carpeta
                    </button>
                  ` : ""}

                  <a
                    class="song-btn small-btn secondary"
                    href="${categorySongsHref(category)}"
                  >
                    Ver cantos
                  </a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="public-category-empty">
          <p>No hay subcategorías aquí.</p>

          ${adminCategoryBrowserParentId ? `
            <button
              type="button"
              class="song-btn small-btn"
              onclick="showCategorySongsByCurrentFolder()"
            >
              Ver cantos de esta categoría
            </button>
          ` : ""}
        </div>
      `}
    </div>
  `;
}

function renderCategorySearchResults(query) {
  const root = getCategoriesRoot();

  if (!root) return;

  const cleanQuery = String(query || "").trim().toLowerCase();

  if (!cleanQuery) {
    renderCategoriesExplorer();
    return;
  }

  const results = allCategoriesForPage
    .filter(function (category) {
      return (
        String(category.name || "").toLowerCase().includes(cleanQuery) ||
        String(category.description || "").toLowerCase().includes(cleanQuery)
      );
    })
    .sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  root.innerHTML = `
    <div class="public-category-explorer">
      <p class="muted">${results.length} categoría(s) encontrada(s)</p>

      ${results.length ? `
        <div class="public-category-grid">
          ${results.map(function (category) {
            const childCount = allCategoriesForPage.filter(function (child) {
              return String(child.parent_id || "") === String(category.id || "");
            }).length;

            return `
              <article class="public-category-card">
                <p class="eyebrow">${escapeHTML(categoryTypeLabel(category.song_type || ""))}</p>
                <h3>${escapeHTML(category.name || "Categoría")}</h3>
                <p>${escapeHTML(category.description || "Sin descripción.")}</p>
                <p>${childCount} subcategoría(s)</p>

                <div class="public-category-card-actions">
                  ${childCount ? `
                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="
                        adminCategoryBrowserType='${escapeHTML(category.song_type || "")}';
                        openPublicCategoryFolder('${escapeHTML(category.id)}');
                      "
                    >
                      Abrir carpeta
                    </button>
                  ` : ""}

                  <a
                    class="song-btn small-btn secondary"
                    href="${categorySongsHref(category)}"
                  >
                    Ver cantos
                  </a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="public-category-empty">
          <p>No encontramos categorías con ese texto.</p>
        </div>
      `}
    </div>
  `;
}

function categorySongCard(song) {
  const slug = song.slug || slugify(song.title || "");

  return `
    <a class="category-song-card" href="canto.html?slug=${safeUrlParam(slug)}">
      <div>
        <p class="eyebrow">${escapeHTML(artistsText(song))}</p>
        <h3>${escapeHTML(song.title || "Canto sin título")}</h3>
        <p>${escapeHTML(songMetaText(song))}</p>
      </div>
      <span class="category-song-arrow">›</span>
    </a>
  `;
}

async function ensureCategorySongsLoaded() {
  if (allCategorySongsForPage.length) {
    return {
      data: allCategorySongsForPage,
      error: null
    };
  }

  const result = await fetchSongsWithRelations();

  if (!result.error) {
    allCategorySongsForPage = result.data || [];
  }

  return result;
}

async function showCategorySongsBySlug(categorySlug) {
  if (!isPage("categorias.html")) return;

  const root = getCategoriesRoot();

  if (!root) return;

  const cleanSlug = String(categorySlug || "").trim();

  root.innerHTML = `
    <div class="public-category-empty">
      <h3>Cargando cantos...</h3>
      <p>Buscando cantos de esta categoría.</p>
    </div>
  `;

  const category = allCategoriesForPage.find(function (item) {
    return String(item.slug || "") === cleanSlug;
  });

  if (!category) {
    root.innerHTML = `
      <div class="public-category-empty">
        <h3>Categoría no encontrada</h3>
        <p>No encontramos una categoría con este enlace.</p>
        <button type="button" class="song-btn small-btn" onclick="loadCategoriesPage()">
          Volver a categorías
        </button>
      </div>
    `;
    return;
  }

  const songsResult = await ensureCategorySongsLoaded();

  if (songsResult.error) {
    root.innerHTML = `
      <div class="public-category-empty">
        <h3>Error cargando cantos</h3>
        <p>${escapeHTML(songsResult.error.message || "No se pudieron cargar los cantos.")}</p>
        <button type="button" class="song-btn small-btn" onclick="loadCategoriesPage()">
          Volver a categorías
        </button>
      </div>
    `;
    return;
  }

  const categorySongs = (songsResult.data || []).filter(function (song) {
    return (song._categories || []).some(function (songCategory) {
      return String(songCategory.slug || "") === cleanSlug;
    });
  });

  root.innerHTML = `
    <div class="category-songs-view">
      <div class="category-songs-back">
        <button type="button" class="song-btn small-btn" onclick="loadCategoriesPage()">
          ← Volver a categorías
        </button>
      </div>

      <div class="category-songs-header">
        <p class="eyebrow">Cantos encontrados</p>
        <h2>${escapeHTML(category.name || "Categoría")}</h2>
        <p>${escapeHTML(category.description || "Cantos de esta categoría.")}</p>
      </div>

      ${categorySongs.length ? `
        <div class="category-songs-list">
          ${categorySongs.map(categorySongCard).join("")}
        </div>
      ` : `
        <div class="public-category-empty">
          <h3>Sin cantos todavía</h3>
          <p>Esta categoría existe, pero todavía no tiene cantos relacionados.</p>
        </div>
      `}
    </div>
  `;
}

function showCategorySongsByCurrentFolder() {
  const category = getPublicCategoryById(adminCategoryBrowserParentId);

  if (!category) {
    renderCategoriesExplorer();
    return;
  }

  showCategorySongsBySlug(category.slug || "");
}

async function loadCategoriesPage() {
  if (!isPage("categorias.html")) return;

  const root = getCategoriesRoot();

  if (!root) return;

root.innerHTML = `
    <div class="public-category-empty">
      <h3>Cargando categorías...</h3>
      <p>Un momento por favor.</p>
    </div>
  `;

  const result = await fetchCategories();

  if (result.error) {
    root.innerHTML = `
      <div class="public-category-empty">
        <h3>Error cargando categorías</h3>
        <p>${escapeHTML(result.error.message || "No se pudieron cargar.")}</p>
      </div>
    `;
    return;
  }

  allCategoriesForPage = result.data || [];

  const search = getCategoriesSearchInput();

  if (search && !search.dataset.categoriesReady) {
    search.dataset.categoriesReady = "true";

    search.addEventListener("input", function () {
      renderCategorySearchResults(search.value);
    });
  }

  const categorySlug = getUrlParam("categoria");

  if (categorySlug) {
    await showCategorySongsBySlug(categorySlug);
    return;
  }

  if (search && String(search.value || "").trim()) {
    renderCategorySearchResults(search.value);
  } else {
    renderCategoriesExplorer();
  }
}
   
   /* =========================================================
   PÚBLICO: PÁGINA DE CANTO
========================================================= */

function renderCapoButtons(song) {
  const versions = song._capoVersions || [];
  const capoPosition = getCapoPosition(song);
  const capoKey = song.capo_key || "";
  const buttons = [];

  if (capoPosition > 0) {
    buttons.push(`
      <button type="button" class="song-btn small-btn" onclick="setCapoMode('capo')">
        Capo ${capoPosition}${capoKey ? " · " + escapeHTML(capoKey) : ""}
      </button>
    `);
  }

  versions.forEach(function (version, index) {
    buttons.push(`
      <button type="button" class="song-btn small-btn" onclick="setCapoVersionByIndex(${index})">
        ${escapeHTML(capoVersionLabel(version))}
      </button>
    `);
  });

  if (!buttons.length) return "";

  return `
    <div class="capo-box">
      <span id="capoModeLabel">Sin capo / tono original</span>

      <button type="button" class="song-btn small-btn" onclick="setCapoMode('original')">
        Sin capo
      </button>

      ${buttons.join("")}
    </div>
  `;
}

async function loadSongPage() {
  if (!isPage("canto.html")) return;

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
        _links: [],
        _capoVersions: []
      });

  fullSong._selectedCapoVersionIndex = -1;

  currentSongForPage = fullSong;
  currentTransposeSteps = 0;
  currentCapoMode = "original";

  const meta = songMetaText(fullSong);

  box.innerHTML = `
    <article class="song-detail-card">
      <a class="song-btn small-btn" href="canciones.html">
        ← Volver a canciones
      </a>

      <p class="artists-line" style="margin-top:14px;">
        ${artistLinksHTML(fullSong._artists)}
      </p>

      <h1>${escapeHTML(fullSong.title || "Sin título")}</h1>

      <p class="song-meta-line">${escapeHTML(meta)}</p>

      ${renderCapoButtons(fullSong)}

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

async function loadArtistProfile() {
  if (!isPage("artista.html")) return;

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

  try {
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

    const songIds = (relationResult.data || [])
      .map(function (row) {
        return row.song_id;
      })
      .filter(Boolean);

    const songsResult = await fetchSongsWithRelations(songIds);
const songs = songsResult.data || [];
const recentSongs = songs
  .slice()
  .sort(function (a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  })
  .slice(0, 3);
     const albumsResult = await client
  .from("albums")
  .select("*")
  .eq("artist_id", artist.id)
  .order("title", { ascending: true });

const albums = albumsResult.data || [];
     const collaborations = songs.filter(function (song) {
  return (song._artists || []).some(function (songArtist) {
    return String(songArtist.id) !== String(artist.id);
  });
});
box.innerHTML = `
  <section class="artist-hero-card">
    <div class="artist-avatar-public big">
      ${escapeHTML(getInitials(artist.name))}
    </div>

    <div>
      <p class="hero-kicker">${escapeHTML(artistTypeLabel(artist.artist_type || ""))}</p>
      <h1>${escapeHTML(artist.name || "Sin nombre")}</h1>
      <p>${escapeHTML(artist.description || "Ministerio o artista registrado.")}</p>
    </div>
  </section>
${recentSongs.length ? `
    <section class="artist-profile-section">
      <h2>Canciones recientes</h2>

      <div class="artist-song-list">
        ${recentSongs.map(function (song) {
          const songSlug = song.slug || slugify(song.title || "");

          return `
            <a class="artist-song-row" href="canto.html?slug=${safeUrlParam(songSlug)}">
              <div>
                <h3>${escapeHTML(song.title || "Canto sin título")}</h3>
                <p>${escapeHTML(songMetaText(song) || "Canto disponible")}</p>
              </div>
              <span>›</span>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  ` : ""}
  ${songs.length ? `
    <section class="artist-profile-section">
      <h2>Cantos de este artista</h2>

      <div class="artist-song-list">
        ${songs.map(function (song) {
          const songSlug = song.slug || slugify(song.title || "");

          return `
            <a class="artist-song-row" href="canto.html?slug=${safeUrlParam(songSlug)}">
              <div>
                <h3>${escapeHTML(song.title || "Canto sin título")}</h3>
                <p>${escapeHTML(songMetaText(song) || "Canto disponible")}</p>
              </div>
              <span>›</span>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  ` : `
    <div class="song-card">
      <h3>Este artista aún no tiene cantos</h3>
      <p>Agrega canciones desde el panel de administración.</p>
    </div>
  `}
  ${albums.length ? `
    <section class="artist-profile-section">
      <h2>Álbumes</h2>

      <div class="artist-song-list">
        ${albums.map(function (album) {
          return `
            <a class="artist-song-row" href="canciones.html?q=${safeUrlParam(album.title || album.name || "")}">
              <div>
                <h3>${escapeHTML(album.title || album.name || "Álbum sin nombre")}</h3>
                <p>${escapeHTML(album.year || album.description || "Álbum registrado")}</p>
              </div>
              <span>♪</span>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  ` : ""}
  ${collaborations.length ? `
    <section class="artist-profile-section">
      <h2>Colaboraciones</h2>

      <div class="artist-song-list">
        ${collaborations.map(function (song) {
          const songSlug = song.slug || slugify(song.title || "");

          return `
            <a class="artist-song-row" href="canto.html?slug=${safeUrlParam(songSlug)}">
              <div>
                <h3>${escapeHTML(song.title || "Canto sin título")}</h3>
                <p>${escapeHTML(songMetaText(song) || "Colaboración")}</p>
              </div>
              <span>›</span>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  ` : ""}
`;
  } catch (error) {
    box.innerHTML = `
      <div class="song-card">
        <h3>Error cargando artista</h3>
        <p>${escapeHTML(error.message || "Intenta nuevamente.")}</p>
      </div>
    `;
  }
}
/* =========================================================
   DONACIONES
========================================================= */

async function fetchDonationSettings() {
  const client = getSupabase();

  if (!client) {
    return {
      data: null,
      error: { message: "Sin conexión a Supabase" }
    };
  }

  const { data, error } = await client
    .from("donation_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: data || null,
    error: error || null
  };
}

function donationSafeValue(value, fallback) {
  return value || fallback || "";
}

async function loadDonationPage() {
  if (!isPage("donaciones.html")) return;

  const box = $("donationPage") || $("donationContent") || $("donacionesContent");

  if (!box) return;

  box.innerHTML = `
    <div class="public-category-empty">
      <h3>Cargando donaciones...</h3>
      <p>Un momento por favor.</p>
    </div>
  `;

  const result = await fetchDonationSettings();

  if (result.error) {
    box.innerHTML = `
      <div class="song-card">
        <h3>No se pudieron cargar las donaciones</h3>
        <p>${escapeHTML(result.error.message || "Intenta nuevamente.")}</p>
      </div>
    `;
    return;
  }

  const data = result.data || {};

  box.innerHTML = `
    <section class="donation-page">
      <article class="song-detail-card">
        <p class="eyebrow">Donaciones</p>
        <h1>${escapeHTML(donationSafeValue(data.title, "Apoya este proyecto"))}</h1>
        <p>${escapeHTML(donationSafeValue(data.subtitle, "Tu donación nos ayuda a seguir compartiendo cantos."))}</p>

        <div class="song-card" style="margin-top:18px;">
          <h3>Datos bancarios</h3>
          <p><strong>Banco:</strong> ${escapeHTML(donationSafeValue(data.bank_name, "No especificado"))}</p>
          <p><strong>Titular:</strong> ${escapeHTML(donationSafeValue(data.account_holder, "No especificado"))}</p>
          <p><strong>Cuenta:</strong> ${escapeHTML(donationSafeValue(data.account_number, "No especificado"))}</p>
          <p><strong>Tipo:</strong> ${escapeHTML(donationSafeValue(data.account_type, "No especificado"))}</p>
        </div>

        ${data.note ? `
          <div class="song-card" style="margin-top:14px;">
            <p>${escapeHTML(data.note)}</p>
          </div>
        ` : ""}

        <a class="song-btn" href="index.html" style="margin-top:18px;">
          ${escapeHTML(donationSafeValue(data.button_text, "Volver al inicio"))}
        </a>
      </article>
    </section>
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
  if (!isPage("admin.html")) return;

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
    userText.textContent = "Sesión iniciada como: " + email;
  }

  await loadAdminData();
}

async function loadAdminData() {
  if (!isPage("admin.html")) return;

  await Promise.all([
    loadAdminArtists(),
    loadAdminCategories(),
    loadAdminAlbums(),
    loadAdminSongs(),
    loadArtistOptions(),
    loadCategoryOptions(),
    loadCategoryParentOptions(),
    loadAlbumOptions(),
    loadAdminDonations()
  ]);

  setupAdminCollapsibleSections();
}
/* =========================================================
   ADMIN: ARTISTAS
========================================================= */

function ensureArtistTypeField() {
  const nameInput = $("artistNameInput");

  if (!nameInput || $("artistTypeInput")) return;

  const wrapper = document.createElement("label");
  wrapper.innerHTML = `
    Tipo de artista
    <select id="artistTypeInput">
      <option value="">Sin tipo</option>
      <option value="catolico">Católico</option>
      <option value="cristiano">Cristiano</option>
      <option value="mixto">Mixto</option>
    </select>
  `;

  const parent = nameInput.closest("label") || nameInput.parentElement;

  if (parent && parent.parentElement) {
    parent.parentElement.insertBefore(wrapper, parent.nextSibling);
  }
}

function resetArtistForm() {
  ensureArtistTypeField();

  currentEditingArtistId = null;

  const title = $("artistFormTitle");

  if (title) {
    title.textContent = "Agregar artista";
  }

  setInputValue("artistNameInput", "");
  setInputValue("artistTypeInput", "");
  setInputValue("artistDescriptionInput", "");
}

async function saveArtist() {
  ensureArtistTypeField();

  const name = getInputValue("artistNameInput");
  const artistType = getInputValue("artistTypeInput");
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
    artist_type: artistType || "",
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
  ensureArtistTypeField();

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
    title.textContent = "Editar artista";
  }

  setInputValue("artistNameInput", data.name || "");
  setInputValue("artistTypeInput", data.artist_type || "");
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

  ensureArtistTypeField();

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
            <p>${escapeHTML(artistTypeLabel(artist.artist_type || ""))}</p>
            <p>${escapeHTML(artist.description || "Sin descripción.")}</p>
          </div>
        </div>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editArtist('${escapeHTML(artist.id)}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteArtist('${escapeHTML(artist.id)}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadArtistOptions() {
  const { data } = await fetchArtists();
setOptions("songMainArtistInput", data || [], "Selecciona artista principal", "id", "name");
  setOptions("albumArtistInput", data || [], "Selecciona artista", "id", "name");
  setMultiOptions("songArtistsInput", data || [], "name");
}

/* =========================================================
   ADMIN: CATEGORÍAS HELPERS
========================================================= */

function buildCategoryTree(categories, parentId) {
  return (categories || [])
    .filter(function (category) {
      return String(category.parent_id || "") === String(parentId || "");
    })
    .sort(function (a, b) {
      const typeA = String(a.song_type || "");
      const typeB = String(b.song_type || "");

      if (typeA !== typeB) return typeA.localeCompare(typeB);

      const orderA = Number(a.sort_order || 0);
      const orderB = Number(b.sort_order || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .map(function (category) {
      return Object.assign({}, category, {
        children: buildCategoryTree(categories, category.id)
      });
    });
}

function flattenCategoryTree(tree, level, prefix) {
  let result = [];

  (tree || []).forEach(function (category) {
    const path = prefix
      ? prefix + " > " + (category.name || "")
      : category.name || "";

    result.push(Object.assign({}, category, {
      level: level || 0,
      path: path
    }));

    result = result.concat(flattenCategoryTree(category.children || [], (level || 0) + 1, path));
  });

  return result;
}

function categoryIndent(level) {
  return "— ".repeat(Number(level || 0));
}

function getCategoryByIdFromBrowser(id) {
  return adminCategoryBrowserCategories.find(function (category) {
    return String(category.id) === String(id);
  });
}

function getCategoryChildrenFromBrowser(parentId) {
  return adminCategoryBrowserCategories
    .filter(function (category) {
      if (adminCategoryBrowserType) {
        if (category.song_type !== adminCategoryBrowserType) return false;
      } else if (category.song_type) {
        return false;
      }

      return String(category.parent_id || "") === String(parentId || "");
    })
    .sort(function (a, b) {
      const orderA = Number(a.sort_order || 0);
      const orderB = Number(b.sort_order || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function getCategoryPathFromBrowser(parentId) {
  const path = [];
  let currentId = parentId;

  while (currentId) {
    const category = getCategoryByIdFromBrowser(currentId);

    if (!category) break;

    path.unshift(category);
    currentId = category.parent_id || null;
  }

  return path;
}

function categoryPathTextForParent(parentId) {
  if (!parentId) return "Sin padre / categoría principal";

  const path = getCategoryPathFromBrowser(parentId)
    .map(function (category) {
      return category.name || "";
    })
    .filter(Boolean)
    .join(" > ");

  return path || "Categoría seleccionada";
}

function ensureCategoryTreeFields() {
  const nameInput = $("categoryNameInput");

  if (!nameInput) return;

  if (!$("categoryTypeInput")) {
    const typeWrapper = document.createElement("label");
    typeWrapper.innerHTML = `
      Tipo de categoría
      <select id="categoryTypeInput">
        <option value="">General</option>
        <option value="catolico">Católico</option>
        <option value="cristiano">Cristiano</option>
      </select>
    `;

    const parent = nameInput.closest("label") || nameInput.parentElement;

    if (parent && parent.parentElement) {
      parent.parentElement.insertBefore(typeWrapper, parent.nextSibling);
    }
  }

  if (!$("categoryParentInput")) {
    const parentWrapper = document.createElement("label");
    parentWrapper.innerHTML = `
      Categoría padre
      <select id="categoryParentInput">
        <option value="">Sin padre / categoría principal</option>
      </select>
    `;

    const typeInput = $("categoryTypeInput");
    const typeParent = typeInput ? typeInput.closest("label") : null;

    if (typeParent && typeParent.parentElement) {
      typeParent.parentElement.insertBefore(parentWrapper, typeParent.nextSibling);
    }
  }

  if (!$("categorySortInput")) {
    const sortWrapper = document.createElement("label");
    sortWrapper.innerHTML = `
      Orden
      <input id="categorySortInput" type="number" value="10" />
    `;

    const parentInput = $("categoryParentInput");
    const parentWrapper = parentInput ? parentInput.closest("label") : null;

    if (parentWrapper && parentWrapper.parentElement) {
      parentWrapper.parentElement.insertBefore(sortWrapper, parentWrapper.nextSibling);
    }
  }
}

function setLockedCategoryParent(parentId) {
  lockedCategoryParentId = parentId || "";

  const select = $("categoryParentInput");

  if (!select) return;

  if (!lockedCategoryParentId) {
    select.innerHTML = `<option value="">Sin padre / categoría principal</option>`;
    select.value = "";
    return;
  }

  select.innerHTML = `
    <option value="${escapeHTML(lockedCategoryParentId)}">
      Dentro de: ${escapeHTML(categoryPathTextForParent(lockedCategoryParentId))}
    </option>
  `;

  select.value = lockedCategoryParentId;
}

async function loadCategoryParentOptions() {
  ensureCategoryTreeFields();

  const select = $("categoryParentInput");

  if (!select) return;

  if (lockedCategoryParentId !== null) {
    setLockedCategoryParent(lockedCategoryParentId);
    return;
  }

  const { data } = await fetchCategories();
  const categories = data || [];
  const tree = buildCategoryTree(categories, null);
  const flat = flattenCategoryTree(tree, 0, "");

  select.innerHTML = `<option value="">Sin padre / categoría principal</option>`;

  flat.forEach(function (category) {
    if (currentEditingCategoryId && String(category.id) === String(currentEditingCategoryId)) {
      return;
    }

    select.innerHTML += `
      <option value="${escapeHTML(category.id)}">
        ${escapeHTML(categoryIndent(category.level) + category.path)}
      </option>
    `;
  });
}

function loadCategoryOptions() {
  return fetchCategories().then(function ({ data }) {
    const categories = data || [];
    const tree = buildCategoryTree(categories, null);
    const flat = flattenCategoryTree(tree, 0, "");

    const select = $("songCategoryInput");

    if (!select) return;

    select.innerHTML = `<option value="">Selecciona categoría</option>`;

    flat.forEach(function (category) {
      const label = [
        categoryTypeLabel(category.song_type || ""),
        category.path || category.name || ""
      ].filter(Boolean).join(" — ");

      select.innerHTML += `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(label)}
        </option>
      `;
    });
  });
}

/* =========================================================
   ADMIN: CATEGORÍAS NAVEGADOR
========================================================= */

function setAdminCategoryBrowserType(type) {
  adminCategoryBrowserType = type || "";
  adminCategoryBrowserParentId = null;
  lockedCategoryParentId = null;
  renderAdminCategoryBrowser();
  resetCategoryForm();
}

function openAdminCategoryFolder(categoryId) {
  adminCategoryBrowserParentId = categoryId || null;
  lockedCategoryParentId = null;
  renderAdminCategoryBrowser();
  resetCategoryForm();
}

function renderAdminCategoryPath() {
  const path = getCategoryPathFromBrowser(adminCategoryBrowserParentId);

  let html = `
    <div class="admin-category-path">
      <span>Ruta:</span>
      <button type="button" class="song-btn small-btn" onclick="openAdminCategoryFolder(null)">
        Inicio
      </button>
  `;

  path.forEach(function (category) {
    html += `
      <span>›</span>
      <button
        type="button"
        class="song-btn small-btn"
        onclick="openAdminCategoryFolder('${escapeHTML(category.id)}')"
      >
        ${escapeHTML(category.name || "Categoría")}
      </button>
    `;
  });

  html += `</div>`;

  return html;
}

function prepareAddCategoryInsideCurrentFolder() {
  ensureCategoryTreeFields();

  currentEditingCategoryId = null;

  const title = $("categoryFormTitle");
  const currentParent = adminCategoryBrowserParentId || "";

  if (title) {
    title.textContent = currentParent
      ? "Agregar subcategoría dentro de " + categoryPathTextForParent(currentParent)
      : "Agregar categoría principal";
  }

  const parentCategory = currentParent
    ? getCategoryByIdFromBrowser(currentParent)
    : null;

  setInputValue("categoryNameInput", "");
  setInputValue(
    "categoryTypeInput",
    parentCategory ? parentCategory.song_type || "" : adminCategoryBrowserType || ""
  );
  setInputValue("categorySortInput", "10");
  setInputValue("categoryDescriptionInput", "");

  setLockedCategoryParent(currentParent);

  const form = $("categoryFormCard");

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function moveAdminCategoryInOrder(categoryId, direction) {
  const siblings = getCategoryChildrenFromBrowser(adminCategoryBrowserParentId);
  const index = siblings.findIndex(function (category) {
    return String(category.id) === String(categoryId);
  });

  if (index === -1) return;

  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= siblings.length) return;

  const current = siblings[index];
  const target = siblings[newIndex];

  const currentOrder = Number(current.sort_order || 0);
  const targetOrder = Number(target.sort_order || 0);

  current.sort_order = targetOrder;
  target.sort_order = currentOrder;

  const originalCurrent = getCategoryByIdFromBrowser(current.id);
  const originalTarget = getCategoryByIdFromBrowser(target.id);

  if (originalCurrent) originalCurrent.sort_order = current.sort_order;
  if (originalTarget) originalTarget.sort_order = target.sort_order;

  renderAdminCategoryBrowser();

  setTimeout(function () {
    showMessage("adminCategoryOrderMessage", "Orden cambiado. Toca Guardar orden.");
  }, 50);
}

async function saveAdminCategoryOrder() {
  const client = getSupabase();

  if (!client) {
    showMessage("adminCategoryOrderMessage", "No se pudo conectar con Supabase.");
    return;
  }

  const siblings = getCategoryChildrenFromBrowser(adminCategoryBrowserParentId);

  if (!siblings.length) {
    showMessage("adminCategoryOrderMessage", "No hay categorías para ordenar.");
    return;
  }

  showMessage("adminCategoryOrderMessage", "Guardando orden...");

  for (let index = 0; index < siblings.length; index++) {
    const category = siblings[index];
    const newOrder = (index + 1) * 10;

    const { error } = await client
      .from("categories")
      .update({ sort_order: newOrder })
      .eq("id", category.id);

    if (error) {
      showMessage("adminCategoryOrderMessage", "Error guardando orden: " + error.message);
      return;
    }

    category.sort_order = newOrder;
  }

  showMessage("adminCategoryOrderMessage", "Orden guardado correctamente.");

  await Promise.all([
    loadAdminCategories(),
    loadCategoryOptions(),
    loadCategoryParentOptions(),
    loadCategoriesPage()
  ]);
}   
/* =========================================================
   ADMIN: RENDER CATEGORÍAS Y CRUD
========================================================= */

function renderAdminCategoryBrowser() {
  const list = $("adminCategoryList");

  if (!list) return;

  const currentCategory = adminCategoryBrowserParentId
    ? getCategoryByIdFromBrowser(adminCategoryBrowserParentId)
    : null;

  const children = getCategoryChildrenFromBrowser(adminCategoryBrowserParentId);

  list.innerHTML = `
    <div class="admin-category-browser">
      <div class="admin-category-browser-top">
        <div class="admin-category-tabs">
          <button
            type="button"
            class="admin-category-tab ${adminCategoryBrowserType === "catolico" ? "active" : ""}"
            onclick="setAdminCategoryBrowserType('catolico')"
          >
            Católico
          </button>

          <button
            type="button"
            class="admin-category-tab ${adminCategoryBrowserType === "cristiano" ? "active" : ""}"
            onclick="setAdminCategoryBrowserType('cristiano')"
          >
            Cristiano
          </button>

          <button
            type="button"
            class="admin-category-tab ${adminCategoryBrowserType === "" ? "active" : ""}"
            onclick="setAdminCategoryBrowserType('')"
          >
            General
          </button>
        </div>

        <button type="button" class="song-btn small-btn" onclick="prepareAddCategoryInsideCurrentFolder()">
          + Agregar aquí
        </button>
      </div>

      ${renderAdminCategoryPath()}

      ${currentCategory ? `
        <div class="admin-category-current-box">
          <h3>${escapeHTML(currentCategory.name || "Categoría")}</h3>
          <p>
            ${escapeHTML(categoryTypeLabel(currentCategory.song_type || ""))}
            · Orden ${escapeHTML(currentCategory.sort_order || 0)}
            ${currentCategory.description ? " · " + escapeHTML(currentCategory.description) : ""}
          </p>

          <div class="admin-category-folder-actions" style="margin-top:10px;">
            <button type="button" class="song-btn small-btn" onclick="editCategory('${escapeHTML(currentCategory.id)}')">
              Editar esta categoría
            </button>

            <button type="button" class="song-btn small-btn danger" onclick="deleteCategory('${escapeHTML(currentCategory.id)}')">
              Eliminar esta categoría
            </button>
          </div>
        </div>
      ` : ""}

      ${children.length ? `
        <div class="admin-category-folder-grid">
          ${children.map(function (category, index) {
            const childCount = getCategoryChildrenFromBrowser(category.id).length;

            return `
              <article class="admin-category-folder-card reorder-card">
                <div class="admin-category-order-row">
                  <div>
                    <h3>📁 ${escapeHTML(category.name || "Categoría")}</h3>
                    <p>
                      ${escapeHTML(categoryTypeLabel(category.song_type || ""))}
                      · Orden ${escapeHTML(category.sort_order || 0)}
                    </p>
                    <p>${escapeHTML(category.description || "Sin descripción.")}</p>
                    <p>${childCount} subcategoría(s)</p>
                  </div>

                  <div class="admin-category-order-actions">
                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="moveAdminCategoryInOrder('${escapeHTML(category.id)}', -1)"
                      ${index === 0 ? "disabled" : ""}
                    >
                      ↑ Subir
                    </button>

                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="moveAdminCategoryInOrder('${escapeHTML(category.id)}', 1)"
                      ${index === children.length - 1 ? "disabled" : ""}
                    >
                      ↓ Bajar
                    </button>

                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="openAdminCategoryFolder('${escapeHTML(category.id)}')"
                    >
                      Abrir
                    </button>

                    <button
                      type="button"
                      class="song-btn small-btn"
                      onclick="editCategory('${escapeHTML(category.id)}')"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="song-btn small-btn danger"
                      onclick="deleteCategory('${escapeHTML(category.id)}')"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            `;
          }).join("")}
        </div>

        <div class="admin-category-order-save">
          <button type="button" class="song-btn small-btn" onclick="saveAdminCategoryOrder()">
            Guardar orden
          </button>
        </div>

        <p id="adminCategoryOrderMessage" class="admin-category-order-message"></p>
      ` : `
        <div class="admin-category-empty">
          <p>No hay subcategorías aquí.</p>
          <button type="button" class="song-btn small-btn" onclick="prepareAddCategoryInsideCurrentFolder()">
            + Agregar primera categoría aquí
          </button>
        </div>
      `}
    </div>
  `;
}

async function loadAdminCategories() {
  const list = $("adminCategoryList");

  if (!list) return;

  ensureCategoryTreeFields();

  const { data, error } = await fetchCategories();

  if (error) {
    list.innerHTML = `<p style="color:#ffb4b4;">Error: ${escapeHTML(error.message)}</p>`;
    return;
  }

  adminCategoryBrowserCategories = data || [];
  renderAdminCategoryBrowser();
}

function resetCategoryForm() {
  ensureCategoryTreeFields();

  currentEditingCategoryId = null;

  const title = $("categoryFormTitle");

  if (title) {
    title.textContent = "Agregar categoría";
  }

  setInputValue("categoryNameInput", "");
  setInputValue("categoryTypeInput", adminCategoryBrowserType || "");
  setInputValue("categorySortInput", "10");
  setInputValue("categoryDescriptionInput", "");

  setLockedCategoryParent(adminCategoryBrowserParentId || "");
}

function cancelCategoryEdit() {
  lockedCategoryParentId = null;
  resetCategoryForm();
}

async function saveCategory() {
  ensureCategoryTreeFields();

  const name = getInputValue("categoryNameInput");
  const songType = getInputValue("categoryTypeInput");
  const parentId = getInputValue("categoryParentInput");
  const sortRaw = getInputValue("categorySortInput");
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
    song_type: songType || "",
    parent_id: parentId || null,
    sort_order: Number(sortRaw || 0),
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

  lockedCategoryParentId = null;
  resetCategoryForm();

  await Promise.all([
    loadAdminCategories(),
    loadCategoryOptions(),
    loadCategoryParentOptions(),
    loadCategoriesPage()
  ]);

  alert(wasEditing ? "Categoría actualizada." : "Categoría guardada.");
}

async function editCategory(id) {
  lockedCategoryParentId = null;
  ensureCategoryTreeFields();

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
    title.textContent = "Editar categoría";
  }

  await loadCategoryParentOptions();

  setInputValue("categoryNameInput", data.name || "");
  setInputValue("categoryTypeInput", data.song_type || "");
  setInputValue("categoryParentInput", data.parent_id || "");
  setInputValue("categorySortInput", String(data.sort_order || 0));
  setInputValue("categoryDescriptionInput", data.description || "");

  adminCategoryBrowserType = data.song_type || "";
  adminCategoryBrowserParentId = data.parent_id || null;
  renderAdminCategoryBrowser();

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
    loadCategoryParentOptions(),
    loadCategoriesPage()
  ]);
}

/* =========================================================
   ADMIN: ÁLBUMES
========================================================= */

function resetAlbumForm() {
  currentEditingAlbumId = null;

  const title = $("albumFormTitle");

  if (title) {
    title.textContent = "Agregar álbum / carpeta";
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
    title.textContent = "Editar álbum / carpeta";
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
          <button type="button" class="song-btn small-btn" onclick="editAlbum('${escapeHTML(album.id)}')">
            Editar
          </button>

          <button type="button" class="song-btn small-btn danger" onclick="deleteAlbum('${escapeHTML(album.id)}')">
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

  updateAdminPreview();
}

function insertSongSection(sectionName) {
  const cleanName = String(sectionName || "").trim();

  if (!cleanName) return;

  insertAtCursor("songLyricsInput", "\n[" + cleanName + "]\n");
}

/* =========================================================
   ADMIN: LINKS DE CANCIONES
========================================================= */

function resetAdminLinkItems() {
  adminLinkItems = [];
  renderAdminLinkRows();
}

function getAdminLinkRowsElement() {
  return $("songLinksRows") || $("adminSongLinksRows");
}

function renderAdminLinkRows() {
  const rows = getAdminLinkRowsElement();

  if (!rows) return;

  if (!adminLinkItems.length) {
    rows.innerHTML = `<p class="muted-text">No hay links todavía.</p>`;
    return;
  }

  rows.innerHTML = adminLinkItems.map(function (link, index) {
    return `
      <div class="admin-list-item">
        <strong>${escapeHTML(link.title || "Link")}</strong>
        <p>${escapeHTML([link.platform, link.link_type].filter(Boolean).join(" · "))}</p>
        <p>${escapeHTML(link.url || "")}</p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn danger" onclick="removeAdminLinkItem(${index})">
            Quitar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function getNewLinkValue(primaryId, fallbackId) {
  return getInputValue(primaryId) || getInputValue(fallbackId);
}

function addAdminLinkFromFields() {
  const title = getNewLinkValue("newLinkTitleInput", "newSongLinkTitleInput");
  const linkType = getNewLinkValue("newLinkTypeInput", "newSongLinkTypeInput") || "Tutorial";
  const platform = getNewLinkValue("newLinkPlatformInput", "newSongLinkPlatformInput");
  const url = getNewLinkValue("newLinkUrlInput", "newSongLinkUrlInput");

  if (!title || !url) {
    alert("Escribe título y URL del link.");
    return;
  }

  adminLinkItems.push({
    title: title,
    link_type: linkType,
    platform: platform,
    url: url,
    sort_order: adminLinkItems.length
  });

  setInputValue("newLinkTitleInput", "");
  setInputValue("newSongLinkTitleInput", "");
  setInputValue("newLinkTypeInput", "");
  setInputValue("newSongLinkTypeInput", "");
  setInputValue("newLinkPlatformInput", "");
  setInputValue("newSongLinkPlatformInput", "");
  setInputValue("newLinkUrlInput", "");
  setInputValue("newSongLinkUrlInput", "");

  const textarea = $("songLinksInput");

  if (textarea) {
    textarea.value = linksToText(adminLinkItems);
  }

  renderAdminLinkRows();
  updateAdminPreview();
}

function removeAdminLinkItem(index) {
  adminLinkItems.splice(index, 1);

  adminLinkItems = adminLinkItems.map(function (link, itemIndex) {
    return Object.assign({}, link, {
      sort_order: itemIndex
    });
  });

  const textarea = $("songLinksInput");

  if (textarea) {
    textarea.value = linksToText(adminLinkItems);
  }

  renderAdminLinkRows();
  updateAdminPreview();
}

function getAdminLinksFromForm() {
  const textarea = $("songLinksInput");

  if (textarea) {
    const parsed = parseSongLinksText(textarea.value);

    if (parsed.length) return parsed;
  }

  return adminLinkItems || [];
}

async function saveSongLinks(songId, links) {
  const client = getSupabase();

  if (!client || !songId) return;

  await client
    .from("song_links")
    .delete()
    .eq("song_id", songId);

  const safeLinks = links || [];

  if (!safeLinks.length) return;

  await client
    .from("song_links")
    .insert(
      safeLinks.map(function (link, index) {
        return {
          song_id: songId,
          title: link.title || "Link",
          link_type: link.link_type || "Tutorial",
          platform: link.platform || "",
          url: link.url || "",
          sort_order: index
        };
      })
    );
}

/* =========================================================
   ADMIN: VERSIONES CON CAPO
========================================================= */

function resetAdminCapoVersionItems() {
  adminCapoVersionItems = [];
  renderAdminCapoVersionRows();
}

function renderAdminCapoVersionRows() {
  const rows = $("songCapoVersionsRows");

  if (!rows) return;

  if (!adminCapoVersionItems.length) {
    rows.innerHTML = `<p class="muted-text">No hay versiones con capo todavía.</p>`;
    return;
  }

  rows.innerHTML = adminCapoVersionItems.map(function (version, index) {
    return `
      <div class="admin-list-item">
        <strong>${escapeHTML(capoVersionLabel(version))}</strong>
        <p>
          Capo ${escapeHTML(version.capo_position || 0)}
          ${version.capo_key ? " · " + escapeHTML(version.capo_key) : ""}
        </p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn danger" onclick="removeAdminCapoVersionItem(${index})">
            Quitar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function addAdminCapoVersionFromFields() {
  const label = getInputValue("newCapoLabelInput");
  const capoPositionRaw = getInputValue("newCapoPositionInput");
  const capoKey = getInputValue("newCapoKeyInput");
  const capoPosition = Number(capoPositionRaw || 0);

  if (!capoPosition || capoPosition < 1) {
    alert("Escribe una posición de capo válida.");
    return;
  }

  if (!capoKey) {
    alert("Escribe las figuras que se tocan con capo. Ejemplo: G.");
    return;
  }

  adminCapoVersionItems.push({
    label: label,
    capo_position: capoPosition,
    capo_key: capoKey,
    sort_order: adminCapoVersionItems.length
  });

  setInputValue("newCapoLabelInput", "");
  setInputValue("newCapoPositionInput", "");
  setInputValue("newCapoKeyInput", "");

  renderAdminCapoVersionRows();
  updateAdminPreview();
}

function removeAdminCapoVersionItem(index) {
  adminCapoVersionItems.splice(index, 1);

  adminCapoVersionItems = adminCapoVersionItems.map(function (version, itemIndex) {
    return Object.assign({}, version, {
      sort_order: itemIndex
    });
  });

  renderAdminCapoVersionRows();
  updateAdminPreview();
}

async function saveSongCapoVersions(songId) {
  const client = getSupabase();

  if (!client || !songId) return;

  await client
    .from("song_capo_versions")
    .delete()
    .eq("song_id", songId);

  if (!adminCapoVersionItems.length) return;

  await client
    .from("song_capo_versions")
    .insert(
      adminCapoVersionItems.map(function (version, index) {
        return {
          song_id: songId,
          label: version.label || "",
          capo_position: Number(version.capo_position || 0),
          capo_key: version.capo_key || "",
          sort_order: index
        };
      })
    );
}

/* =========================================================
   ADMIN: PREVIEW DE CANCIÓN
========================================================= */

function updateAdminPreview() {
  const preview = $("songPreview") || $("adminSongPreview") || $("songPreviewContent");

  if (!preview) return;

  const title = getInputValue("songTitleInput") || "Título del canto";
  const tone = getInputValue("songToneInput") || "Tono";
  const difficulty = getInputValue("songDifficultyInput") || "";
  const lyrics = $("songLyricsInput") ? $("songLyricsInput").value : "";
  const capoPosition = Number(getInputValue("songCapoInput") || 0);
  const capoKey = getInputValue("songCapoKeyInput");

  const links = getAdminLinksFromForm();

  const fakeSong = {
    title: title,
    tone: tone,
    difficulty: difficulty,
    lyrics: lyrics,
    capo_position: capoPosition,
    capo_key: capoKey
  };

  preview.innerHTML = `
    <article class="song-detail-card">
      <p class="eyebrow">Vista previa</p>
      <h1>${escapeHTML(title)}</h1>
      <p class="song-meta-line">${escapeHTML(songMetaText(fakeSong))}</p>

      ${capoPosition > 0 ? `
        <div class="capo-box">
          <span>Capo ${capoPosition}${capoKey ? " · Figuras en " + escapeHTML(capoKey) : ""}</span>
        </div>
      ` : ""}

      ${adminCapoVersionItems.length ? `
        <div class="capo-box">
          <span>Versiones con capo:</span>
          ${adminCapoVersionItems.map(function (version) {
            return `
              <button type="button" class="song-btn small-btn">
                ${escapeHTML(capoVersionLabel(version))}
              </button>
            `;
          }).join("")}
        </div>
      ` : ""}

      <pre class="lyrics-block">
        ${renderChordedLyrics(lyrics, 0)}
      </pre>

      ${renderSongLinksHTML(links)}
    </article>
  `;
}

/* =========================================================
   ADMIN: CANCIONES
========================================================= */

function resetSongForm() {
  currentEditingSongId = null;

  const title = $("songFormTitle");

  if (title) {
    title.textContent = "Agregar canción";
  }

  [
     "songMainArtistInput",
    "songTitleInput",
    "songToneInput",
    "songLyricsInput",
    "songLinksInput",
    "songCapoKeyInput"
  ].forEach(function (id) {
    setInputValue(id, "");
  });

  setInputValue("songTypeInput", "catolico");
  setInputValue("songDifficultyInput", "");
  setInputValue("songCapoInput", "0");
  setInputValue("songCategoryInput", "");
  setInputValue("songAlbumInput", "");
  setSelectedValues("songArtistsInput", []);

  resetAdminLinkItems();
  resetAdminCapoVersionItems();
  updateAdminPreview();
}

async function saveSong() {
  const title = getInputValue("songTitleInput");
  const songType = getInputValue("songTypeInput") || "catolico";
  const tone = getInputValue("songToneInput");
  const difficulty = getInputValue("songDifficultyInput");
  const lyrics = $("songLyricsInput") ? $("songLyricsInput").value : "";
  const categoryId = getInputValue("songCategoryInput");
  const albumId = getInputValue("songAlbumInput");
  const mainArtistId = getInputValue("songMainArtistInput");
const collaboratorIds = getSelectedValues("songArtistsInput");

const artistIds = Array.from(new Set(
  [mainArtistId].concat(collaboratorIds).filter(Boolean)
));
  const links = getAdminLinksFromForm();

  const capoPositionRaw = getInputValue("songCapoInput");
  const capoPosition = capoPositionRaw ? Number(capoPositionRaw) : 0;
  const capoKey = getInputValue("songCapoKeyInput");

  if (!title) {
    alert("Escribe el título de la canción.");
    return;
  }

  if (!tone) {
    alert("Escribe el tono original de la canción.");
    return;
  }

  if (!artistIds.length) {
    alert("Selecciona al menos un artista.");
    return;
  }

  if (capoPosition > 0 && !capoKey) {
    alert("Si seleccionas capo, escribe las figuras que se tocan con capo. Ejemplo: G.");
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
    artist_id: artistIds[0] || null,
    category_id: categoryId || null,
    capo_position: Number.isNaN(capoPosition) ? 0 : capoPosition,
    capo_key: capoPosition > 0 ? capoKey : ""
  };

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

  const savedSongId = result.data.id;

  await client.from("song_artists").delete().eq("song_id", savedSongId);
  await client.from("song_categories").delete().eq("song_id", savedSongId);
  await client.from("album_songs").delete().eq("song_id", savedSongId);

  await client.from("song_artists").insert(
    artistIds.map(function (artistId, index) {
      return {
        song_id: savedSongId,
        artist_id: artistId,
        role: index === 0 ? "principal" : "colaborador",
        sort_order: index
      };
    })
  );

  if (categoryId) {
    await client.from("song_categories").insert({
      song_id: savedSongId,
      category_id: categoryId
    });
  }

  if (albumId) {
    await client.from("album_songs").insert({
      song_id: savedSongId,
      album_id: albumId,
      sort_order: 0
    });
  }

  await saveSongLinks(savedSongId, links);
  await saveSongCapoVersions(savedSongId);

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
  const client = getSupabase();

  if (!client) return;

  const fullResult = await fetchSongsWithRelations([id]);
  const song = fullResult.data && fullResult.data[0] ? fullResult.data[0] : null;

  if (fullResult.error || !song) {
    alert("No se pudo cargar la canción.");
    return;
  }

  currentEditingSongId = id;

  const title = $("songFormTitle");

  if (title) {
    title.textContent = "Editar canción";
  }

  setInputValue("songTitleInput", song.title || "");
  setInputValue("songTypeInput", song.song_type || "catolico");
  setInputValue("songToneInput", song.tone || "");
  setInputValue("songDifficultyInput", song.difficulty || "");
  setInputValue("songLyricsInput", song.lyrics || "");
  setInputValue("songCapoInput", String(song.capo_position || 0));
  setInputValue("songCapoKeyInput", song.capo_key || "");
  setInputValue("songCategoryInput", song._categories && song._categories[0] ? song._categories[0].id : "");
  setInputValue("songAlbumInput", song._albums && song._albums[0] ? song._albums[0].id : "");
setInputValue(
  "songMainArtistInput",
  song.artist_id || ((song._artists || [])[0] ? (song._artists || [])[0].id : "")
);
  setSelectedValues(
    "songArtistsInput",
    (song._artists || []).map(function (artist) {
      return artist.id;
    })
  );

  adminLinkItems = (song._links || []).map(function (link, index) {
    return {
      title: link.title || "Link",
      link_type: link.link_type || "Tutorial",
      platform: link.platform || "",
      url: link.url || "",
      sort_order: index
    };
  });

  const textarea = $("songLinksInput");

  if (textarea) {
    textarea.value = linksToText(adminLinkItems);
  }

  adminCapoVersionItems = (song._capoVersions || []).map(function (version, index) {
    return {
      label: version.label || "",
      capo_position: version.capo_position || 0,
      capo_key: version.capo_key || "",
      sort_order: index
    };
  });

  renderAdminLinkRows();
  renderAdminCapoVersionRows();
  updateAdminPreview();

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
    return `
      <div class="admin-list-item">
        <strong>${escapeHTML(song.title || "Sin título")}</strong>
        <p>${escapeHTML(artistsText(song))}</p>
        <p>${escapeHTML(songTypeLabel(song.song_type))} · ${escapeHTML(songMetaText(song))}</p>

        <div class="admin-actions">
          <button type="button" class="song-btn small-btn" onclick="editSong('${escapeHTML(song.id)}')">
            Editar
          </button>

          <a class="song-btn small-btn" href="canto.html?slug=${safeUrlParam(song.slug || "")}" target="_blank">
            Ver
          </a>

          <button type="button" class="song-btn small-btn danger" onclick="deleteSong('${escapeHTML(song.id)}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");
}
   /* =========================================================
   ADMIN: DONACIONES
========================================================= */

function ensureAdminDonationSection() {
  const adminPanel = $("adminPanel");

  if (!adminPanel || $("donationsAdminSection")) return;

  const section = document.createElement("section");
  section.id = "donationsAdminSection";
  section.className = "admin-section";

  section.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Donaciones</p>
      <h2>Información de donaciones</h2>
      <p>Edita los datos que aparecen en la página pública de donaciones.</p>
    </div>

    <article class="admin-card" id="donationFormCard">
      <label>
        Título
        <input id="donationTitleInput" type="text" placeholder="Apoya este proyecto" />
      </label>

      <label>
        Subtítulo
        <input id="donationSubtitleInput" type="text" placeholder="Tu donación nos ayuda a seguir compartiendo cantos." />
      </label>

      <label>
        Banco
        <input id="donationBankInput" type="text" placeholder="Nombre del banco" />
      </label>

      <label>
        Titular
        <input id="donationHolderInput" type="text" placeholder="Nombre del titular" />
      </label>

      <label>
        Número de cuenta
        <input id="donationAccountInput" type="text" placeholder="0000000000" />
      </label>

      <label>
        Tipo de cuenta
        <input id="donationTypeInput" type="text" placeholder="Cuenta de ahorro / cheques" />
      </label>

      <label>
        Nota
        <textarea id="donationNoteInput" rows="4" placeholder="Gracias por apoyar este ministerio."></textarea>
      </label>

      <label>
        Texto del botón
        <input id="donationButtonInput" type="text" placeholder="Quiero apoyar" />
      </label>

      <div class="admin-actions">
        <button type="button" class="song-btn" onclick="saveDonationSettings()">
          Guardar donaciones
        </button>
      </div>

      <p id="donationAdminMessage" class="muted-text"></p>
    </article>
  `;

  adminPanel.appendChild(section);
}

function fillDonationAdminForm(settings) {
  const data = settings || {};

  currentDonationSettingsId = data.id || null;

  setInputValue("donationTitleInput", donationSafeValue(data.title, "Apoya este proyecto"));
  setInputValue("donationSubtitleInput", donationSafeValue(data.subtitle, "Tu donación nos ayuda a seguir compartiendo cantos."));
  setInputValue("donationBankInput", donationSafeValue(data.bank_name, ""));
  setInputValue("donationHolderInput", donationSafeValue(data.account_holder, ""));
  setInputValue("donationAccountInput", donationSafeValue(data.account_number, ""));
  setInputValue("donationTypeInput", donationSafeValue(data.account_type, ""));
  setInputValue("donationNoteInput", donationSafeValue(data.note, ""));
  setInputValue("donationButtonInput", donationSafeValue(data.button_text, "Quiero apoyar"));
}

async function loadAdminDonations() {
  if (!isPage("admin.html")) return;

  ensureAdminDonationSection();

  const result = await fetchDonationSettings();

  if (result.error) {
    showMessage("donationAdminMessage", "No se pudieron cargar donaciones: " + result.error.message);
    return;
  }

  fillDonationAdminForm(result.data || {});
}

async function saveDonationSettings() {
  const client = getSupabase();

  if (!client) {
    showMessage("donationAdminMessage", "No se pudo conectar con Supabase.");
    return;
  }

  const payload = {
    title: getInputValue("donationTitleInput"),
    subtitle: getInputValue("donationSubtitleInput"),
    bank_name: getInputValue("donationBankInput"),
    account_holder: getInputValue("donationHolderInput"),
    account_number: getInputValue("donationAccountInput"),
    account_type: getInputValue("donationTypeInput"),
    note: getInputValue("donationNoteInput"),
    button_text: getInputValue("donationButtonInput"),
    updated_at: new Date().toISOString()
  };

  showMessage("donationAdminMessage", "Guardando...");

  const result = currentDonationSettingsId
    ? await client.from("donation_settings").update(payload).eq("id", currentDonationSettingsId).select("id").single()
    : await client.from("donation_settings").insert(payload).select("id").single();

  if (result.error) {
    showMessage("donationAdminMessage", "No se pudo guardar: " + result.error.message);
    return;
  }

  currentDonationSettingsId = result.data.id;
  showMessage("donationAdminMessage", "Donaciones guardadas correctamente.");
}

/* =========================================================
   ADMIN: SECCIONES PLEGABLES
========================================================= */

const ADMIN_COLLAPSIBLE_SECTIONS = [
  "artistsAdminSection",
  "categoriesAdminSection",
  "albumsAdminSection",
  "songsAdminSection",
  "donationsAdminSection"
];

function openAdminSection(sectionId) {
  ADMIN_COLLAPSIBLE_SECTIONS.forEach(function (id) {
    const section = $(id);

    if (!section) return;

    if (id === sectionId) {
      section.classList.add("admin-section-open");
      section.classList.remove("admin-section-closed");
    } else {
      section.classList.remove("admin-section-open");
      section.classList.add("admin-section-closed");
    }
  });

  const target = $(sectionId);

  if (target) {
    setTimeout(function () {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
  }
}

function toggleAdminSection(sectionId) {
  const section = $(sectionId);

  if (!section) return;

  const isOpen = section.classList.contains("admin-section-open");

  if (isOpen) {
    section.classList.remove("admin-section-open");
    section.classList.add("admin-section-closed");
  } else {
    openAdminSection(sectionId);
  }
}

function openAllAdminSections() {
  ADMIN_COLLAPSIBLE_SECTIONS.forEach(function (id) {
    const section = $(id);

    if (!section) return;

    section.classList.add("admin-section-open");
    section.classList.remove("admin-section-closed");
  });
}

function closeAllAdminSections() {
  ADMIN_COLLAPSIBLE_SECTIONS.forEach(function (id) {
    const section = $(id);

    if (!section) return;

    section.classList.remove("admin-section-open");
    section.classList.add("admin-section-closed");
  });
}

function setupAdminCollapsibleSections() {
  if (!isPage("admin.html")) return;

  const sections = ADMIN_COLLAPSIBLE_SECTIONS
    .map(function (id) {
      return $(id);
    })
    .filter(Boolean);

  if (!sections.length) return;

  sections.forEach(function (section, index) {
    const heading = section.querySelector(".section-heading");

    if (heading && !heading.dataset.collapseReady) {
      heading.dataset.collapseReady = "true";

      heading.addEventListener("click", function () {
        toggleAdminSection(section.id);
      });
    }

    if (index === 0) {
      section.classList.add("admin-section-open");
      section.classList.remove("admin-section-closed");
    } else {
      section.classList.remove("admin-section-open");
      section.classList.add("admin-section-closed");
    }
  });
}

/* =========================================================
   ESTILOS DINÁMICOS
========================================================= */

function injectAppStyles() {
  if ($("jhd-clean-app-styles")) return;

  const style = document.createElement("style");
  style.id = "jhd-clean-app-styles";

  style.textContent = `
    .lyrics-block {
      background: #070a12 !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 16px !important;
      padding: 22px !important;
      white-space: normal !important;
      overflow-x: auto !important;
      font-family: "Courier New", Courier, monospace !important;
    }

    .song-section-label {
      display: inline-flex !important;
      width: auto !important;
      max-width: max-content !important;
      margin: 14px 0 10px !important;
      padding: 5px 10px !important;
      border-radius: 999px !important;
      font-size: 0.68rem !important;
      font-weight: 900 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      color: #071016 !important;
    }

    .section-intro { background: #7dd3fc !important; }
    .section-verso { background: #86efac !important; }
    .section-coro { background: #facc15 !important; }
    .section-puente { background: #c084fc !important; }
    .section-pre { background: #f9a8d4 !important; }
    .section-final,
    .section-default { background: #d1d5db !important; }

    .song-line {
      display: block !important;
      margin-bottom: 12px !important;
    }

    .chord-line {
      display: block !important;
      min-height: 1.05em !important;
      color: #ffcf53 !important;
      -webkit-text-fill-color: #ffcf53 !important;
      font-family: "Courier New", Courier, monospace !important;
      font-size: 1rem !important;
      font-weight: 950 !important;
      line-height: 1.05 !important;
      white-space: pre !important;
      text-shadow: 0 0 8px rgba(255,207,83,0.75) !important;
    }

    .lyric-line,
    .song-plain-line {
      display: block !important;
      color: #f8fafc !important;
      font-family: "Courier New", Courier, monospace !important;
      font-size: 1rem !important;
      font-weight: 650 !important;
      line-height: 1.42 !important;
      white-space: pre !important;
      letter-spacing: 0 !important;
    }

    .song-plain-line {
      margin-bottom: 8px !important;
      white-space: pre-wrap !important;
    }

    .song-empty-line {
      display: block !important;
      height: 6px !important;
    }

    .admin-section-closed > *:not(.section-heading) {
      display: none !important;
    }

    .admin-section .section-heading {
      cursor: pointer !important;
    }

    @media (max-width: 768px) {
      body {
        overflow-x: hidden !important;
      }

      .lyrics-block {
        margin-top: 12px !important;
        padding: 13px !important;
        border-radius: 14px !important;
      }

      .song-section-label {
        margin: 8px 0 8px !important;
        padding: 4px 9px !important;
        font-size: 0.58rem !important;
        line-height: 1 !important;
      }

      .song-line {
        margin-bottom: 8px !important;
      }

      .chord-line {
        font-size: 0.86rem !important;
      }

      .lyric-line,
      .song-plain-line {
        font-size: 0.88rem !important;
        line-height: 1.32 !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   ARRANQUE
========================================================= */

function initPublicPages() {
  loadHomeSongs();
  loadHomeArtists();

  loadSongsPage();
  setupSongsSearch();

  loadArtistsPage();
  setupArtistsSearch();

  loadCategoriesPage();

  loadArtistProfile();
  loadSongPage();

  loadDonationPage();
}

function initAdminPage() {
  if (!isPage("admin.html")) return;

  ensureArtistTypeField();
  ensureCategoryTreeFields();
  ensureAdminDonationSection();

  checkAdminSession();

  [
    "songLyricsInput",
    "songTitleInput",
    "songToneInput",
    "songDifficultyInput",
    "songCapoInput",
    "songCapoKeyInput",
    "songLinksInput"
  ].forEach(function (id) {
    const input = $(id);

    if (input && !input.dataset.previewReady) {
      input.dataset.previewReady = "true";
      input.addEventListener("input", updateAdminPreview);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  injectAppStyles();

  initTheme();
  initMenu();
  fixMainNavigationLinks();
  hideAdminLinkOnPublicPages();

  initPublicPages();
  initAdminPage();
});

/* =========================================================
   EXPORTS
========================================================= */

window.toggleTheme = toggleTheme;

window.setSongsFilter = setSongsFilter;

window.setPublicCategoryType = setPublicCategoryType;
window.openPublicCategoryFolder = openPublicCategoryFolder;
window.showCategorySongsBySlug = showCategorySongsBySlug;
window.showCategorySongsByCurrentFolder = showCategorySongsByCurrentFolder;
window.loadCategoriesPage = loadCategoriesPage;

window.changeTranspose = changeTranspose;
window.resetTranspose = resetTranspose;
window.setCapoMode = setCapoMode;
window.setCapoVersionByIndex = setCapoVersionByIndex;

window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;

window.resetArtistForm = resetArtistForm;
window.saveArtist = saveArtist;
window.editArtist = editArtist;
window.deleteArtist = deleteArtist;

window.setAdminCategoryBrowserType = setAdminCategoryBrowserType;
window.openAdminCategoryFolder = openAdminCategoryFolder;
window.prepareAddCategoryInsideCurrentFolder = prepareAddCategoryInsideCurrentFolder;
window.moveAdminCategoryInOrder = moveAdminCategoryInOrder;
window.saveAdminCategoryOrder = saveAdminCategoryOrder;
window.resetCategoryForm = resetCategoryForm;
window.cancelCategoryEdit = cancelCategoryEdit;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

window.resetAlbumForm = resetAlbumForm;
window.saveAlbum = saveAlbum;
window.editAlbum = editAlbum;
window.deleteAlbum = deleteAlbum;

window.addAdminLinkFromFields = addAdminLinkFromFields;
window.removeAdminLinkItem = removeAdminLinkItem;
window.addAdminCapoVersionFromFields = addAdminCapoVersionFromFields;
window.removeAdminCapoVersionItem = removeAdminCapoVersionItem;

window.insertSongSection = insertSongSection;
window.resetSongForm = resetSongForm;
window.saveSong = saveSong;
window.editSong = editSong;
window.deleteSong = deleteSong;
window.updateAdminPreview = updateAdminPreview;

window.saveDonationSettings = saveDonationSettings;

window.openAdminSection = openAdminSection;
window.toggleAdminSection = toggleAdminSection;
window.openAllAdminSections = openAllAdminSections;
window.closeAllAdminSections = closeAllAdminSections;
