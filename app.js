// ===================================================
// Funzioni di supporto
// ===================================================

// Legge un valore salvato in formato JSON (se manca o è rovinato, restituisce il predefinito)
function leggiJSON(chiave, predefinito) {
  try {
    const valore = localStorage.getItem(chiave);
    return valore ? JSON.parse(valore) : predefinito;
  } catch {
    return predefinito;
  }
}

function scriviJSON(chiave, valore) {
  localStorage.setItem(chiave, JSON.stringify(valore));
}

// Esegue un comando rapido, con un testo opzionale come input
function apriComando(nome, testo) {
  let indirizzo = 'shortcuts://run-shortcut?name=' + encodeURIComponent(nome);
  if (testo !== undefined) {
    indirizzo += '&input=text&text=' + encodeURIComponent(testo);
  }
  window.location.href = indirizzo;
}

// "1 h 12 min" oppure "45 min"
function formattaDurata(ms) {
  const minuti = Math.round(ms / 60000);
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return ore > 0 ? ore + ' h ' + resto + ' min' : resto + ' min';
}

// "01:05:09"
function formattaCronometro(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hh + ':' + mm + ':' + ss;
}

// "ven 13 nov"
function formattaData(iso) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

// "18:05"
function formattaOra(iso) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// "2026-11-13" (data locale: per nomi dei file e richieste per data)
function dataPerNomeFile(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const gg = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + gg;
}

// "2026-11-13T18:05": il formato che vogliono i campi data e ora del modulo (ora locale)
function perCampoDataOra(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return dataPerNomeFile(d) + 'T' + hh + ':' + mi;
}

// Lunedì della settimana corrente alle 00:00
function inizioSettimana() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const giorniDaLunedi = (d.getDay() + 6) % 7; // getDay: 0 = domenica, 1 = lunedì
  d.setDate(d.getDate() - giorniDaLunedi);
  return d;
}

// Giorno 1 del mese corrente alle 00:00
function inizioMese() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Crea una riga di elenco con titolo e sottotitolo
function creaRiga(titoloTesto, sottoTesto) {
  const riga = document.createElement('li');
  riga.className = 'riga';
  const sinistra = document.createElement('div');
  const titolo = document.createElement('div');
  titolo.className = 'riga-titolo';
  titolo.textContent = titoloTesto;
  const sotto = document.createElement('div');
  sotto.className = 'riga-sotto';
  sotto.textContent = sottoTesto;
  sinistra.append(titolo, sotto);
  riga.append(sinistra);
  return { riga, sinistra };
}

// Scrive un valore con le unità di misura più piccole: "12,3 km" -> 12,3 + <span class="unita">km</span>.
// Le parti fatte di lettere, "%" o "/" (km, min, bpm, /km, km/h...) diventano unità.
function scriviValore(el, testo) {
  el.textContent = '';
  testo = String(testo);
  if (testo === 'n/d') {
    el.textContent = testo;
    return;
  }
  testo.split(/(\s?[A-Za-z%/]+)/).forEach(parte => {
    if (!parte) return;
    if (/^\s?[A-Za-z%/]+$/.test(parte)) {
      const unita = document.createElement('span');
      unita.className = 'unita';
      unita.textContent = parte.trim();
      el.append(unita);
    } else {
      el.append(parte.replace(/^\s+/, '')); // lo spazio lo dà già il margine dell'unità
    }
  });
}

// Griglia di "strumenti" del riquadro principale: voci = [[etichetta, valore, nota?], ...]
function creaStrumenti(voci) {
  const griglia = document.createElement('div');
  griglia.className = 'strumenti';
  voci.forEach(([nome, testo, nota]) => {
    const strumento = document.createElement('div');
    strumento.className = 'strumento';
    const etichetta = document.createElement('span');
    etichetta.className = 'strumento-etichetta';
    etichetta.textContent = nome;
    const valore = document.createElement('span');
    valore.className = 'strumento-valore';
    scriviValore(valore, testo);
    strumento.append(etichetta, valore);
    if (nota) {
      const elNota = document.createElement('span');
      elNota.className = 'strumento-nota';
      elNota.textContent = nota;
      strumento.append(elNota);
    }
    griglia.append(strumento);
  });
  return griglia;
}

// Riepilogo mattutino (vedi la scheda Oggi): qui in cima perche la giornata
// viene disegnata gia all'avvio, prima che si arrivi alla sezione Oggi.
const CHIAVE_RIEPILOGO = 'riepilogoOggi';
const FILE_RIEPILOGO = 'out/oggi.json';
const PAUSA_RIEPILOGO_MS = 10 * 60 * 1000; // non serve rileggerlo a ogni tocco

let ultimaLetturaRiepilogo = 0;
let schedaNotizie = 'italia';

// Data di oggi in cima a ogni scheda ("sab 14 nov", in maiuscolo grazie allo stile)
function mostraDataOggi() {
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  document.querySelectorAll('.data-oggi').forEach(el => { el.textContent = oggi; });
}

mostraDataOggi();
// L'app può restare aperta in sottofondo per giorni: quando torna in primo piano aggiorna la data
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) mostraDataOggi();
});


// ===================================================
// Navigazione tra le schede in basso
// ===================================================

const tabs = document.querySelectorAll('.tab');
const viste = document.querySelectorAll('.vista');
const sottoschede = document.querySelectorAll('.sottoscheda');
const sottoviste = document.querySelectorAll('.sottovista');

const VISTE = ['oggi', 'agenda', 'spese', 'salute', 'pesca'];
const SOTTOVISTE = ['sonno', 'corsa', 'palestra']; // dentro la scheda Salute
// Le schede sono cambiate: chi aveva la versione precedente viene portato su quella nuova
const VISTE_VECCHIE = { sveglia: 'oggi', impostazioni: 'oggi', sonno: 'salute', corsa: 'salute', palestra: 'salute' };

const CHIAVE_SOTTOVISTA = 'ultimaSottovista';
let sottovistaAttiva = SOTTOVISTE.includes(localStorage.getItem(CHIAVE_SOTTOVISTA))
  ? localStorage.getItem(CHIAVE_SOTTOVISTA)
  : 'sonno';
let vistaPrecedente = 'oggi'; // dove tornare chiudendo le impostazioni

// Sottoschede di Salute: Sonno, Corsa, Palestra
function mostraSottovista(nome) {
  sottovistaAttiva = nome;
  sottoviste.forEach(v => v.classList.toggle('attiva', v.id === 'sotto-' + nome));
  sottoschede.forEach(b => b.classList.toggle('attiva', b.dataset.sotto === nome));
  document.body.dataset.vista = nome; // dentro Salute il colore segue la sottoscheda
  localStorage.setItem(CHIAVE_SOTTOVISTA, nome);
}

function mostraVista(nome) {
  if (!VISTE.includes(nome) && nome !== 'impostazioni') nome = VISTE_VECCHIE[nome] || 'oggi';

  viste.forEach(v => v.classList.toggle('attiva', v.id === 'vista-' + nome));
  tabs.forEach(t => t.classList.toggle('attiva', t.dataset.vista === nome));

  // Lo stile usa questo valore per il colore della sezione.
  // Le impostazioni non ne hanno uno proprio: tengono quello della scheda da cui arrivi.
  if (nome !== 'impostazioni') document.body.dataset.vista = nome;

  if (nome === 'salute') mostraSottovista(sottovistaAttiva);

  // Le impostazioni non sono una scheda della barra: non diventano la vista da riaprire
  if (nome !== 'impostazioni') {
    vistaPrecedente = nome;
    localStorage.setItem('ultimaVista', nome);
  }
  window.scrollTo(0, 0);
}

tabs.forEach(t => {
  t.addEventListener('click', () => mostraVista(t.dataset.vista));
});

sottoschede.forEach(b => {
  b.addEventListener('click', () => mostraSottovista(b.dataset.sotto));
});

// Ingranaggio in alto a destra: apre le impostazioni; "Chiudi" torna alla scheda di prima
document.querySelectorAll('[data-impostazioni]').forEach(b => {
  b.addEventListener('click', () => mostraVista('impostazioni'));
});
document.getElementById('btn-chiudi-impostazioni')
  .addEventListener('click', () => mostraVista(vistaPrecedente));

mostraVista(localStorage.getItem('ultimaVista') || 'oggi');


// ===================================================
// Sveglia
// ===================================================

// Un comando rapido per ogni tipo di ripetizione.
// I nomi devono coincidere esattamente con quelli in Comandi Rapidi.
// Comandi rapidi che portano un impegno nelle app di sistema, per avere le notifiche
const COMANDO_CALENDARIO = 'Routine Calendario';

const COMANDI_SVEGLIA = {
  una: 'Routine Sveglia',
  feriali: 'Routine Sveglia Feriali',
  ogni: 'Routine Sveglia Ogni giorno',
  weekend: 'Routine Sveglia Weekend'
};
const ETICHETTE_RIPETI = {
  una: 'una volta',
  feriali: 'lun-ven',
  ogni: 'ogni giorno',
  weekend: 'weekend'
};
const CHIAVE_PREFERITE = 'svegliePreferite'; // elenco di { id, ora, nome, ripeti }

const formSveglia = document.getElementById('form-sveglia');
const campoOra = document.getElementById('sveglia-ora');
const campoNomeSveglia = document.getElementById('sveglia-nome');
// Il messaggio si vede sia nel riquadro di Oggi sia nel pannello
const esitoSveglia = {
  set textContent(testo) {
    document.getElementById('sveglia-esito').textContent = testo;
    document.getElementById('sveglia-esito-pannello').textContent = testo;
  }
};
const elPreferite = document.getElementById('preferite');
const elPreferiteVuoto = document.getElementById('preferite-vuoto');
const elPreferiteAiuto = document.getElementById('preferite-aiuto');

// Legge ora, nome e ripetizione dal modulo (null se manca l'ora)
function leggiModuloSveglia() {
  const ora = campoOra.value; // formato "HH:MM"
  if (!ora) {
    esitoSveglia.textContent = 'Scegli un orario.';
    return null;
  }
  // Il carattere | separa ora e nome, quindi non può comparire nel nome
  const nome = (campoNomeSveglia.value.trim() || 'Sveglia').replaceAll('|', ' ');
  const ripeti = formSveglia.elements.ripeti.value || 'una';
  return { ora, nome, ripeti };
}

// Esegue il comando rapido giusto per la ripetizione scelta
function impostaSveglia(sveglia) {
  esitoSveglia.textContent =
    'Inviata: ' + sveglia.ora + ' ' + sveglia.nome + ' (' + ETICHETTE_RIPETI[sveglia.ripeti] + ')';
  apriComando(COMANDI_SVEGLIA[sveglia.ripeti], sveglia.ora + '|' + sveglia.nome);
}

formSveglia.addEventListener('submit', evento => {
  evento.preventDefault(); // evita che la pagina si ricarichi
  const sveglia = leggiModuloSveglia();
  if (sveglia) impostaSveglia(sveglia);
});

document.getElementById('btn-salva-preferita').addEventListener('click', () => {
  const sveglia = leggiModuloSveglia();
  if (!sveglia) return;

  const preferite = leggiJSON(CHIAVE_PREFERITE, []);
  const doppione = preferite.some(p =>
    p.ora === sveglia.ora && p.nome === sveglia.nome && p.ripeti === sveglia.ripeti
  );
  if (doppione) {
    esitoSveglia.textContent = 'Questa sveglia è già tra le preferite.';
    return;
  }

  preferite.push({ id: Date.now().toString(), ...sveglia });
  scriviJSON(CHIAVE_PREFERITE, preferite);
  esitoSveglia.textContent = 'Salvata tra le preferite.';
  mostraPreferite();
});

// Disegna l'elenco delle preferite, in ordine di orario
function mostraPreferite() {
  const preferite = leggiJSON(CHIAVE_PREFERITE, []).slice().sort((a, b) => a.ora.localeCompare(b.ora));

  elPreferite.innerHTML = '';
  elPreferiteVuoto.hidden = preferite.length > 0;
  elPreferiteAiuto.hidden = preferite.length === 0;

  preferite.forEach(p => {
    const { riga } = creaRiga(p.nome, p.ora + ' · ' + ETICHETTE_RIPETI[p.ripeti]);

    const elimina = document.createElement('button');
    elimina.className = 'btn-elimina';
    elimina.textContent = '×';
    elimina.setAttribute('aria-label', 'Elimina');
    elimina.addEventListener('click', evento => {
      evento.stopPropagation(); // non attivare anche il tocco sulla riga
      if (!confirm('Eliminare la preferita "' + p.nome + '"?')) return;
      const rimanenti = leggiJSON(CHIAVE_PREFERITE, []).filter(x => x.id !== p.id);
      scriviJSON(CHIAVE_PREFERITE, rimanenti);
      mostraPreferite();
    });
    riga.append(elimina);

    riga.addEventListener('click', () => {
      const domanda = 'Impostare la sveglia "' + p.nome + '" alle ' + p.ora + ' (' + ETICHETTE_RIPETI[p.ripeti] + ')?';
      if (confirm(domanda)) impostaSveglia(p);
    });

    elPreferite.append(riga);
  });
  mostraSveglieRapide(); // il riquadro di Oggi mostra le stesse preferite
}

mostraPreferite();


// ===================================================
// Palestra
// ===================================================

const COMANDO_HEVY = 'Routine Hevy';
const CHIAVE_IN_CORSO = 'allenamentoInCorso'; // { inizio, fine? }
const CHIAVE_ALLENAMENTI = 'allenamenti';     // elenco degli allenamenti salvati

const elInattivo = document.getElementById('palestra-inattivo');
const elInCorso = document.getElementById('palestra-incorso');
const formSalva = document.getElementById('palestra-salva');
const elCronometro = document.getElementById('cronometro');
const elInizioAlle = document.getElementById('inizio-alle');
const elRiepilogoDurata = document.getElementById('riepilogo-durata');
const campoNomeAll = document.getElementById('allenamento-nome');
const campoNota = document.getElementById('allenamento-nota');
const elNomiAll = document.getElementById('nomi-allenamenti');
const elStorico = document.getElementById('storico');
const elStoricoVuoto = document.getElementById('storico-vuoto');
const elStoricoAiuto = document.getElementById('storico-aiuto');
const elStatSettNum = document.getElementById('stat-sett-num');
const elStatSettTempo = document.getElementById('stat-sett-tempo');
const elStatMeseNum = document.getElementById('stat-mese-num');
const elStatMedia = document.getElementById('stat-media');

let intervalloCronometro = null;

// Mostra lo stato giusto (inattivo, in corso, salvataggio) in base ai dati salvati
function aggiornaPalestra() {
  const inCorso = leggiJSON(CHIAVE_IN_CORSO, null);
  const terminato = inCorso && inCorso.fine;

  elInattivo.hidden = !!inCorso;
  elInCorso.hidden = !inCorso || !!terminato;
  formSalva.hidden = !terminato;

  clearInterval(intervalloCronometro);

  if (inCorso && !terminato) {
    elInizioAlle.textContent = 'Iniziato alle ' + formattaOra(inCorso.inizio);
    const aggiornaCronometro = () => {
      elCronometro.textContent = formattaCronometro(Date.now() - new Date(inCorso.inizio));
    };
    aggiornaCronometro();
    intervalloCronometro = setInterval(aggiornaCronometro, 1000);
  }

  if (terminato) {
    const durata = new Date(inCorso.fine) - new Date(inCorso.inizio);
    elRiepilogoDurata.textContent =
      formattaOra(inCorso.inizio) + ' → ' + formattaOra(inCorso.fine) + ' · ' + formattaDurata(durata);
  }

  const allenamenti = leggiJSON(CHIAVE_ALLENAMENTI, []);
  mostraRiepilogo(allenamenti);
  mostraStorico(allenamenti);
}

// Calcola e mostra i 4 numeri del riepilogo
function mostraRiepilogo(allenamenti) {
  const settimana = inizioSettimana();
  const mese = inizioMese();

  const diSettimana = allenamenti.filter(a => new Date(a.inizio) >= settimana);
  const diMese = allenamenti.filter(a => new Date(a.inizio) >= mese);

  const tempoSettimana = diSettimana.reduce((somma, a) => somma + a.durataMs, 0);
  const tempoMese = diMese.reduce((somma, a) => somma + a.durataMs, 0);
  const media = diMese.length > 0 ? tempoMese / diMese.length : 0;

  elStatSettNum.textContent = diSettimana.length;
  scriviValore(elStatSettTempo, formattaDurata(tempoSettimana));
  elStatMeseNum.textContent = diMese.length;
  scriviValore(elStatMedia, formattaDurata(media));
}

// Disegna l'elenco degli allenamenti salvati, dal più recente
function mostraStorico(allenamenti) {
  const ordinati = allenamenti.slice().sort((a, b) => b.inizio.localeCompare(a.inizio));

  elStorico.innerHTML = '';
  elStoricoVuoto.hidden = ordinati.length > 0;
  elStoricoAiuto.hidden = ordinati.length === 0;

  ordinati.forEach(a => {
    const { riga, sinistra } = creaRiga(a.nome, formattaData(a.inizio) + ' · ' + formattaOra(a.inizio));

    if (a.nota) {
      const nota = document.createElement('div');
      nota.className = 'riga-nota';
      nota.textContent = a.nota;
      sinistra.append(nota);
    }

    const destra = document.createElement('div');
    destra.className = 'riga-valore';
    destra.textContent = formattaDurata(a.durataMs);
    riga.append(destra);

    // Tocco sulla riga: apre il pannello di modifica
    riga.addEventListener('click', () => apriModifica(a));

    elStorico.append(riga);
  });

  // Suggerimenti per il campo Nome: i nomi già usati
  elNomiAll.innerHTML = '';
  [...new Set(allenamenti.map(a => a.nome))].forEach(nome => {
    const opzione = document.createElement('option');
    opzione.value = nome;
    elNomiAll.append(opzione);
  });
}

// Inizia: salva l'ora di inizio e apre Hevy
document.getElementById('btn-inizia').addEventListener('click', () => {
  scriviJSON(CHIAVE_IN_CORSO, { inizio: new Date().toISOString() });
  aggiornaPalestra();
  apriComando(COMANDO_HEVY);
});

document.getElementById('btn-apri-hevy').addEventListener('click', () => {
  apriComando(COMANDO_HEVY);
});

// Termina: fissa subito l'ora di fine, poi chiede nome e nota
document.getElementById('btn-termina').addEventListener('click', () => {
  const inCorso = leggiJSON(CHIAVE_IN_CORSO, null);
  if (!inCorso) return;
  inCorso.fine = new Date().toISOString();
  scriviJSON(CHIAVE_IN_CORSO, inCorso);
  campoNomeAll.value = '';
  campoNota.value = '';
  aggiornaPalestra();
});

// Torna all'allenamento: annulla il "Termina"
document.getElementById('btn-riprendi').addEventListener('click', () => {
  const inCorso = leggiJSON(CHIAVE_IN_CORSO, null);
  if (!inCorso) return;
  delete inCorso.fine;
  scriviJSON(CHIAVE_IN_CORSO, inCorso);
  aggiornaPalestra();
});

document.getElementById('btn-annulla').addEventListener('click', () => {
  if (confirm("Annullare l'allenamento in corso? Non verrà salvato.")) {
    localStorage.removeItem(CHIAVE_IN_CORSO);
    aggiornaPalestra();
  }
});

// Salva: aggiunge l'allenamento allo storico
formSalva.addEventListener('submit', evento => {
  evento.preventDefault();
  const inCorso = leggiJSON(CHIAVE_IN_CORSO, null);
  const nome = campoNomeAll.value.trim();
  if (!inCorso || !inCorso.fine || !nome) return;

  const allenamenti = leggiJSON(CHIAVE_ALLENAMENTI, []);
  allenamenti.push({
    id: Date.now().toString(),
    nome: nome,
    inizio: inCorso.inizio,
    fine: inCorso.fine,
    durataMs: new Date(inCorso.fine) - new Date(inCorso.inizio),
    nota: campoNota.value.trim()
  });
  scriviJSON(CHIAVE_ALLENAMENTI, allenamenti);
  localStorage.removeItem(CHIAVE_IN_CORSO);
  aggiornaPalestra();
});


// ---------- Modifica di un allenamento salvato ----------

const veloModifica = document.getElementById('velo-modifica');
const formModifica = document.getElementById('form-modifica');
const campoModNome = document.getElementById('mod-nome');
const campoModInizio = document.getElementById('mod-inizio');
const campoModFine = document.getElementById('mod-fine');
const campoModNota = document.getElementById('mod-nota');
const esitoModifica = document.getElementById('mod-esito');

let idInModifica = null;

function apriModifica(allenamento) {
  idInModifica = allenamento.id;
  campoModNome.value = allenamento.nome;
  campoModInizio.value = perCampoDataOra(allenamento.inizio);
  campoModFine.value = perCampoDataOra(allenamento.fine);
  campoModNota.value = allenamento.nota || '';
  esitoModifica.textContent = '';
  veloModifica.hidden = false;
}

function chiudiModifica() {
  veloModifica.hidden = true;
  idInModifica = null;
}

formModifica.addEventListener('submit', evento => {
  evento.preventDefault();
  const nome = campoModNome.value.trim();
  const inizio = new Date(campoModInizio.value); // interpretato come ora locale
  const fine = new Date(campoModFine.value);

  if (!nome) {
    esitoModifica.textContent = 'Il nome non può essere vuoto.';
    return;
  }
  if (isNaN(inizio) || isNaN(fine)) {
    esitoModifica.textContent = 'Inserisci data e ora di inizio e fine.';
    return;
  }
  if (fine <= inizio) {
    esitoModifica.textContent = "La fine deve essere dopo l'inizio.";
    return;
  }

  // Aggiorna solo i campi modificati, lasciando intatti gli altri dati dell'allenamento
  const allenamenti = leggiJSON(CHIAVE_ALLENAMENTI, []).map(a => {
    if (a.id !== idInModifica) return a;
    return {
      ...a,
      nome: nome,
      inizio: inizio.toISOString(),
      fine: fine.toISOString(),
      durataMs: fine - inizio,
      nota: campoModNota.value.trim()
    };
  });
  scriviJSON(CHIAVE_ALLENAMENTI, allenamenti);
  chiudiModifica();
  aggiornaPalestra();
});

document.getElementById('btn-mod-elimina').addEventListener('click', () => {
  if (!confirm('Eliminare questo allenamento?')) return;
  const rimanenti = leggiJSON(CHIAVE_ALLENAMENTI, []).filter(a => a.id !== idInModifica);
  scriviJSON(CHIAVE_ALLENAMENTI, rimanenti);
  chiudiModifica();
  aggiornaPalestra();
});

document.getElementById('btn-mod-annulla').addEventListener('click', chiudiModifica);

// Tocco sulla zona scura fuori dal pannello: chiude senza salvare
veloModifica.addEventListener('click', evento => {
  if (evento.target === veloModifica) chiudiModifica();
});

aggiornaPalestra();


// ===================================================
// Intervals.icu: scarica i dati del Suunto (scheda Impostazioni)
// ===================================================

const CHIAVE_API_INTERVALS = 'intervalsChiaveApi'; // resta solo su questo iPhone, mai nel backup
const CHIAVE_DATI_SALUTE = 'datiSalute';           // { notti: { "AAAA-MM-GG": {...} }, attivita: { id: {...} } }
const CHIAVE_ULTIMA_SYNC = 'ultimaSincronizzazione';
const CHIAVE_VERSIONE_DATI = 'versioneDatiSalute';
const VERSIONE_DATI = '2'; // se cambia, alla prossima apertura si riscarica tutto
const GIORNI_DA_SCARICARE = 90;
const ORE_TRA_SYNC_AUTOMATICHE = 1;

const campoChiaveIntervals = document.getElementById('intervals-chiave');
const elStatoSync = document.getElementById('stato-sync');
const esitoSync = document.getElementById('esito-sync');

function mostraEsitoSync(testo, errore) {
  esitoSync.textContent = testo;
  esitoSync.classList.toggle('esito-errore', !!errore);
}

// Chiama un indirizzo dell'API di Intervals.icu per il proprio account (athlete/0)
async function chiamaIntervals(percorso) {
  const chiave = localStorage.getItem(CHIAVE_API_INTERVALS);
  if (!chiave) throw new Error('Chiave API mancante: incollala e tocca "Salva chiave".');

  const risposta = await fetch('https://intervals.icu/api/v1/athlete/0/' + percorso, {
    headers: { Authorization: 'Basic ' + btoa('API_KEY:' + chiave) }
  });
  if (risposta.status === 401 || risposta.status === 403) {
    throw new Error('Chiave API non valida: controllala su Intervals.icu.');
  }
  if (!risposta.ok) throw new Error('Intervals.icu ha risposto con errore ' + risposta.status + '.');
  return risposta.json();
}

// Scarica benessere (sonno, battiti a riposo, HRV...) e attività degli ultimi giorni
async function sincronizza() {
  const oggi = new Date();
  const inizio = new Date();
  inizio.setDate(inizio.getDate() - GIORNI_DA_SCARICARE);
  const intervallo = 'oldest=' + dataPerNomeFile(inizio) + '&newest=' + dataPerNomeFile(oggi);

  const [benessere, attivita] = await Promise.all([
    chiamaIntervals('wellness?' + intervallo),
    chiamaIntervals('activities?' + intervallo)
  ]);

  const dati = leggiJSON(CHIAVE_DATI_SALUTE, { notti: {}, attivita: {} });

  // Benessere: una voce per giorno. Teniamo solo i campi che ci servono.
  benessere.forEach(g => {
    const voce = {
      data: g.id,                 // giorno del risveglio, "AAAA-MM-GG"
      sonnoSec: g.sleepSecs,
      punteggioSonno: g.sleepScore,
      qualitaSonno: g.sleepQuality, // 1 eccellente, 2 buona, 3 discreta, 4 scarsa
      fcRiposo: g.restingHR,
      fcMediaSonno: g.avgSleepingHR,
      hrv: g.hrv,
      spo2: g.spO2,
      passi: g.steps
    };
    const haDati = Object.keys(voce).some(k => k !== 'data' && voce[k] !== null && voce[k] !== undefined);
    if (haDati) dati.notti[g.id] = voce;
  });

  // Attività registrate col Suunto
  attivita.forEach(a => {
    dati.attivita[a.id] = {
      id: a.id,
      nome: a.name,
      tipo: a.type,                     // es. "Run"
      inizio: a.start_date,             // orario UTC, confrontabile con gli allenamenti salvati
      durataSec: a.elapsed_time,        // tempo totale
      movimentoSec: a.moving_time,      // tempo in movimento
      distanzaM: a.distance,
      dislivelloM: a.total_elevation_gain,
      fcMedia: a.average_heartrate,
      fcMax: a.max_heartrate,
      calorie: a.calories,
      carico: a.icu_training_load,
      zoneFcSec: a.icu_hr_zone_times,   // secondi passati in ciascuna zona
      zoneFcLimiti: a.icu_hr_zones      // limite superiore (bpm) di ciascuna zona
    };
  });

  scriviJSON(CHIAVE_DATI_SALUTE, dati);
  localStorage.setItem(CHIAVE_ULTIMA_SYNC, new Date().toISOString());
  localStorage.setItem(CHIAVE_VERSIONE_DATI, VERSIONE_DATI);
  return dati;
}

// Aggiorna tutte le schede che mostrano dati scaricati
function aggiornaSchedeSalute() {
  mostraStatoSync();
  mostraCorsa();
  mostraSonno();
}

// Sincronizzazione avviata da un pulsante: mostra l'esito in Impostazioni.
// Restituisce il messaggio d'errore, oppure null se è andata bene.
async function sincronizzaConEsito() {
  mostraEsitoSync('Sincronizzazione in corso...');
  let messaggioErrore = null;
  try {
    await sincronizza();
    mostraEsitoSync('Sincronizzazione completata.');
  } catch (errore) {
    messaggioErrore = errore.message || 'Sincronizzazione non riuscita: controlla la connessione.';
    mostraEsitoSync(messaggioErrore, true);
  }
  aggiornaSchedeSalute();
  return messaggioErrore;
}

function mostraStatoSync() {
  const haChiave = !!localStorage.getItem(CHIAVE_API_INTERVALS);
  campoChiaveIntervals.placeholder = haChiave ? 'Chiave salvata (incolla per sostituirla)' : 'Incolla la chiave API';

  const ultima = localStorage.getItem(CHIAVE_ULTIMA_SYNC);
  const dati = leggiJSON(CHIAVE_DATI_SALUTE, { notti: {}, attivita: {} });
  const nottiConSonno = Object.values(dati.notti).filter(n => n.sonnoSec).length;
  const numAttivita = Object.keys(dati.attivita).length;

  elStatoSync.textContent = ultima
    ? 'Ultima sincronizzazione: ' + formattaData(ultima) + ' alle ' + formattaOra(ultima) +
      ' · ' + nottiConSonno + ' notti con sonno · ' + numAttivita + ' attività'
    : 'Mai sincronizzato.';
}

document.getElementById('btn-salva-chiave').addEventListener('click', () => {
  const chiave = campoChiaveIntervals.value.trim();
  if (!chiave) {
    mostraEsitoSync('Incolla prima la chiave API.', true);
    return;
  }
  localStorage.setItem(CHIAVE_API_INTERVALS, chiave);
  campoChiaveIntervals.value = '';
  mostraEsitoSync('Chiave salvata.');
  mostraStatoSync();
});

document.getElementById('btn-sincronizza').addEventListener('click', sincronizzaConEsito);

// Sincronizzazione automatica all'apertura, se è passata almeno un'ora dall'ultima
// (oppure subito, se i dati salvati sono di una versione vecchia dell'app)
async function sincronizzaSeServe() {
  if (!localStorage.getItem(CHIAVE_API_INTERVALS) || !navigator.onLine) return;
  const ultima = localStorage.getItem(CHIAVE_ULTIMA_SYNC);
  const versioneOk = localStorage.getItem(CHIAVE_VERSIONE_DATI) === VERSIONE_DATI;
  if (versioneOk && ultima && Date.now() - new Date(ultima) < ORE_TRA_SYNC_AUTOMATICHE * 3600000) return;
  try {
    await sincronizza();
    aggiornaSchedeSalute();
  } catch {
    // In automatico gli errori si ignorano: si vedranno con "Sincronizza ora"
  }
}

mostraStatoSync();


// ===================================================
// Corsa: dati del Suunto scaricati da Intervals.icu
// ===================================================

const TIPI_CORSA = ['Run', 'TrailRun', 'VirtualRun'];
const PASSO_MIN_SEC = 150; // 2:30 /km: sotto è una registrazione anomala
const PASSO_MAX_SEC = 720; // 12:00 /km: sopra è una registrazione anomala
const SETTIMANE_GRAFICO = 8;
const CORSE_GRAFICO = 12;
const SVG_NS = 'http://www.w3.org/2000/svg';

const elCorsaVuoto = document.getElementById('corsa-vuoto');
const elCorsaContenuto = document.getElementById('corsa-contenuto');
const elCorsaUltima = document.getElementById('corsa-ultima');
const elCorsaStorico = document.getElementById('corsa-storico');
const elCorsaFonte = document.getElementById('corsa-fonte');

// Elenco delle corse salvate, dalla più recente
function leggiCorse() {
  const dati = leggiJSON(CHIAVE_DATI_SALUTE, { notti: {}, attivita: {} });
  return Object.values(dati.attivita)
    .filter(a => TIPI_CORSA.includes(a.tipo) && a.distanzaM > 0)
    .sort((a, b) => b.inizio.localeCompare(a.inizio));
}

// Secondi per km (usa il tempo in movimento se disponibile)
function passoSec(corsa) {
  const tempo = corsa.movimentoSec || corsa.durataSec;
  return tempo / (corsa.distanzaM / 1000);
}

function passoValido(corsa) {
  const p = passoSec(corsa);
  return p >= PASSO_MIN_SEC && p <= PASSO_MAX_SEC;
}

// "8,03" (km con due decimali e virgola)
function formattaKm(metri, decimali = 2) {
  return (metri / 1000).toFixed(decimali).replace('.', ',');
}

// "5:59 /km"
function formattaPasso(secondiAlKm) {
  const totale = Math.round(secondiAlKm);
  const min = Math.floor(totale / 60);
  const sec = String(totale % 60).padStart(2, '0');
  return min + ':' + sec + ' /km';
}

function valoreOnd(valore, suffisso) {
  return valore === null || valore === undefined ? 'n/d' : Math.round(valore) + suffisso;
}

// Crea un elemento SVG con i suoi attributi
function elementoSvg(tipo, attributi) {
  const el = document.createElementNS(SVG_NS, tipo);
  Object.entries(attributi).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// Grafico a colonne (una sola serie): punti = [{ etichetta, valore, dettaglio }]
function disegnaColonne(contenitore, info, punti, formattaAsse, testoIniziale) {
  const L = 340, A = 170, sx = 34, dx = 8, su = 10, giu = 24;
  const largh = L - sx - dx, alt = A - su - giu;
  const massimo = Math.max(...punti.map(p => p.valore), 0);
  // Fondo scala arrotondato (numero pari sotto 20, decina sopra) così le tacche sono numeri tondi
  const scala = massimo <= 0 ? 2 : massimo < 20 ? Math.ceil(massimo / 2) * 2 : Math.ceil(massimo / 10) * 10;

  const svg = elementoSvg('svg', { viewBox: '0 0 ' + L + ' ' + A, role: 'img' });

  // Griglia orizzontale: base, metà, massimo
  [0, 0.5, 1].forEach(f => {
    const y = su + alt - f * alt;
    svg.append(elementoSvg('line', { class: 'griglia', x1: sx, x2: L - dx, y1: y, y2: y }));
    const testo = elementoSvg('text', { class: 'asse', x: sx - 6, y: y + 4, 'text-anchor': 'end' });
    testo.textContent = formattaAsse(f * scala);
    svg.append(testo);
  });

  const fascia = largh / punti.length;
  const spessore = Math.min(24, fascia - 6);
  const barre = [];

  punti.forEach((p, i) => {
    const cx = sx + fascia * i + fascia / 2;
    const h = (p.valore / scala) * alt;
    const x = cx - spessore / 2;
    const yBase = su + alt;
    const r = Math.min(4, h);

    // Colonna con angoli arrotondati solo in alto, base squadrata
    if (h > 0) {
      const d = 'M' + x + ',' + yBase +
        ' V' + (yBase - h + r) +
        ' Q' + x + ',' + (yBase - h) + ' ' + (x + r) + ',' + (yBase - h) +
        ' H' + (x + spessore - r) +
        ' Q' + (x + spessore) + ',' + (yBase - h) + ' ' + (x + spessore) + ',' + (yBase - h + r) +
        ' V' + yBase + ' Z';
      const barra = elementoSvg('path', { class: 'barra', d });
      barre.push(barra);
      svg.append(barra);
    } else {
      barre.push(null);
    }

    const etichetta = elementoSvg('text', { class: 'asse', x: cx, y: A - 6, 'text-anchor': 'middle' });
    etichetta.textContent = p.etichetta;
    svg.append(etichetta);

    // Area di tocco grande quanto tutta la fascia
    const bersaglio = elementoSvg('rect', { class: 'bersaglio', x: sx + fascia * i, y: su, width: fascia, height: alt + giu });
    bersaglio.addEventListener('click', () => {
      barre.forEach(b => b && b.classList.remove('selezionata'));
      if (barre[i]) barre[i].classList.add('selezionata');
      info.textContent = p.dettaglio;
    });
    svg.append(bersaglio);
  });

  contenitore.innerHTML = '';
  contenitore.append(svg);
  info.textContent = testoIniziale;
}

// Grafico a linea (una sola serie): punti = [{ etichetta, valore, dettaglio }].
// Con "invertito" i valori piccoli stanno in alto (per il passo: più veloce = più in alto).
function disegnaLinea(contenitore, info, punti, formattaAsse, invertito, testoIniziale) {
  const L = 340, A = 170, sx = 46, dx = 12, su = 12, giu = 24;
  const largh = L - sx - dx, alt = A - su - giu;
  const valori = punti.map(p => p.valore);
  let min = Math.min(...valori), max = Math.max(...valori);
  if (max - min < 1) { min -= 15; max += 15; }
  const margine = (max - min) * 0.1;
  min -= margine;
  max += margine;

  const yDi = v => {
    const f = (v - min) / (max - min);
    return invertito ? su + f * alt : su + alt - f * alt;
  };
  const xDi = i => punti.length === 1 ? sx + largh / 2 : sx + (largh * i) / (punti.length - 1);

  const svg = elementoSvg('svg', { viewBox: '0 0 ' + L + ' ' + A, role: 'img' });

  // Griglia: valore più alto, intermedio, più basso del grafico
  [0, 0.5, 1].forEach(f => {
    const y = su + f * alt;
    const valore = invertito ? min + f * (max - min) : max - f * (max - min);
    svg.append(elementoSvg('line', { class: 'griglia', x1: sx, x2: L - dx, y1: y, y2: y }));
    const testo = elementoSvg('text', { class: 'asse', x: sx - 6, y: y + 4, 'text-anchor': 'end' });
    testo.textContent = formattaAsse(valore);
    svg.append(testo);
  });

  const percorso = punti.map((p, i) => (i === 0 ? 'M' : 'L') + xDi(i) + ',' + yDi(p.valore)).join(' ');
  svg.append(elementoSvg('path', { class: 'linea', d: percorso }));

  // Etichette sull'asse orizzontale: prima e ultima data
  [0, punti.length - 1].forEach((i, n) => {
    if (n === 1 && i === 0) return;
    const testo = elementoSvg('text', {
      class: 'asse', x: xDi(i), y: A - 6,
      'text-anchor': punti.length === 1 ? 'middle' : (n === 0 ? 'start' : 'end')
    });
    testo.textContent = punti[i].etichetta;
    svg.append(testo);
  });

  const cerchi = [];
  punti.forEach((p, i) => {
    const cerchio = elementoSvg('circle', { class: 'punto', cx: xDi(i), cy: yDi(p.valore), r: 5 });
    cerchi.push(cerchio);
    svg.append(cerchio);
  });

  // Aree di tocco: strisce verticali attorno a ogni punto
  punti.forEach((p, i) => {
    const passo = punti.length === 1 ? largh : largh / (punti.length - 1);
    const bersaglio = elementoSvg('rect', {
      class: 'bersaglio', x: xDi(i) - passo / 2, y: 0, width: passo, height: A
    });
    bersaglio.addEventListener('click', () => {
      cerchi.forEach(c => c.classList.remove('selezionato'));
      cerchi[i].classList.add('selezionato');
      info.textContent = p.dettaglio;
    });
    svg.append(bersaglio);
  });

  contenitore.innerHTML = '';
  contenitore.append(svg);
  info.textContent = testoIniziale;
}

// Riquadro "ultima corsa"
function mostraUltimaCorsa(c) {
  elCorsaUltima.innerHTML = '';

  // Riga in alto: etichetta a sinistra, invito ai dettagli a destra
  const testa = document.createElement('div');
  testa.className = 'hero-testa';
  const etichetta = document.createElement('span');
  etichetta.className = 'etichetta';
  etichetta.textContent = 'Ultima corsa · ' + formattaData(c.inizio) + ' · ' + formattaOra(c.inizio);
  const link = document.createElement('span');
  link.className = 'hero-link';
  link.textContent = 'Dettagli ›';
  testa.append(etichetta, link);

  // Numero principale: i km
  const valore = document.createElement('div');
  valore.className = 'hero-valore';
  scriviValore(valore, formattaKm(c.distanzaM) + ' km');

  // Strumenti: passo, battiti, tempo
  const strumenti = creaStrumenti([
    ['Passo', formattaPasso(passoSec(c))],
    ['FC media', valoreOnd(c.fcMedia, ' bpm')],
    ['Tempo', formattaDurata((c.movimentoSec || c.durataSec) * 1000)]
  ]);

  elCorsaUltima.append(testa, valore, strumenti);
  elCorsaUltima.onclick = () => apriDettaglioCorsa(c);
}

// I 6 numeri del riepilogo
function mostraRiepilogoCorsa(corse) {
  const settimana = inizioSettimana();
  const mese = inizioMese();
  const diSettimana = corse.filter(c => new Date(c.inizio) >= settimana);
  const diMese = corse.filter(c => new Date(c.inizio) >= mese);

  const somma = (elenco, campo) => elenco.reduce((t, c) => t + (c[campo] || 0), 0);

  scriviValore(document.getElementById('stat-corsa-sett-km'), formattaKm(somma(diSettimana, 'distanzaM'), 1) + ' km');
  document.getElementById('stat-corsa-sett-num').textContent = diSettimana.length;
  scriviValore(document.getElementById('stat-corsa-mese-km'), formattaKm(somma(diMese, 'distanzaM'), 1) + ' km');
  scriviValore(document.getElementById('stat-corsa-mese-disl'), Math.round(somma(diMese, 'dislivelloM')) + ' m');

  // Passo medio del mese: tempo totale / km totali (solo corse con passo plausibile)
  const valide = diMese.filter(passoValido);
  const km = somma(valide, 'distanzaM') / 1000;
  const tempo = valide.reduce((t, c) => t + (c.movimentoSec || c.durataSec), 0);
  scriviValore(document.getElementById('stat-corsa-mese-passo'), km > 0 ? formattaPasso(tempo / km) : 'n/d');

  // FC media del mese, pesata sulla durata di ogni corsa
  const conFc = diMese.filter(c => c.fcMedia);
  const pesoTot = conFc.reduce((t, c) => t + (c.movimentoSec || c.durataSec), 0);
  const fc = pesoTot > 0
    ? conFc.reduce((t, c) => t + c.fcMedia * (c.movimentoSec || c.durataSec), 0) / pesoTot
    : null;
  scriviValore(document.getElementById('stat-corsa-mese-fc'), valoreOnd(fc, ' bpm'));
}

// Grafico dei km nelle ultime settimane (da lunedì a domenica)
function mostraGraficoKm(corse) {
  const lunedi = inizioSettimana();
  const punti = [];
  for (let i = SETTIMANE_GRAFICO - 1; i >= 0; i--) {
    const da = new Date(lunedi);
    da.setDate(da.getDate() - 7 * i);
    const a = new Date(da);
    a.setDate(a.getDate() + 7);
    const nella = corse.filter(c => new Date(c.inizio) >= da && new Date(c.inizio) < a);
    const metri = nella.reduce((t, c) => t + c.distanzaM, 0);
    punti.push({
      etichetta: da.getDate() + '/' + (da.getMonth() + 1),
      valore: metri / 1000,
      dettaglio: 'Settimana dal ' + da.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) +
        ': ' + formattaKm(metri, 1) + ' km in ' + nella.length + (nella.length === 1 ? ' corsa' : ' corse')
    });
  }
  disegnaColonne(
    document.getElementById('grafico-km'),
    document.getElementById('info-km'),
    punti,
    v => (Math.round(v * 10) / 10).toString().replace('.', ','),
    'Tocca una colonna per i dettagli'
  );
}

// Grafico del passo medio delle ultime corse (in ordine di data)
function mostraGraficoPasso(corse) {
  const contenitore = document.getElementById('grafico-passo');
  const info = document.getElementById('info-passo');
  const scelte = corse.filter(passoValido).slice(0, CORSE_GRAFICO).reverse();

  if (scelte.length === 0) {
    contenitore.innerHTML = '';
    info.textContent = 'Nessuna corsa con passo valido.';
    return;
  }

  const punti = scelte.map(c => ({
    etichetta: new Date(c.inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' }),
    valore: passoSec(c),
    dettaglio: formattaData(c.inizio) + ': ' + formattaPasso(passoSec(c)) + ' · ' +
      formattaKm(c.distanzaM, 1) + ' km · FC ' + valoreOnd(c.fcMedia, ' bpm')
  }));
  disegnaLinea(contenitore, info, punti, v => formattaPasso(v).replace(' /km', ''), true, 'Tocca un punto per i dettagli');
}

// Storico: una riga per corsa
function mostraStoricoCorse(corse) {
  elCorsaStorico.innerHTML = '';
  corse.forEach(c => {
    const sotto = formattaData(c.inizio) + ' · ' + formattaKm(c.distanzaM) + ' km · ' + formattaPasso(passoSec(c));
    const { riga } = creaRiga(c.nome || 'Corsa', sotto);
    const destra = document.createElement('div');
    destra.className = 'riga-valore';
    destra.textContent = c.fcMedia ? Math.round(c.fcMedia) + ' bpm' : formattaDurata(c.durataSec * 1000);
    riga.append(destra);
    riga.addEventListener('click', () => apriDettaglioCorsa(c));
    elCorsaStorico.append(riga);
  });
}

// ---------- Dettaglio di una corsa ----------

const veloCorsa = document.getElementById('velo-corsa');

function apriDettaglioCorsa(c) {
  document.getElementById('corsa-dett-titolo').textContent = c.nome || 'Corsa';
  document.getElementById('corsa-dett-data').textContent =
    new Date(c.inizio).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' alle ' + formattaOra(c.inizio);

  const movimento = c.movimentoSec || c.durataSec;
  const voci = [
    ['Distanza', formattaKm(c.distanzaM) + ' km'],
    ['Tempo in movimento', formattaDurata(movimento * 1000)],
    ['Passo medio', formattaPasso(passoSec(c))],
    ['Velocità media', ((c.distanzaM / 1000) / (movimento / 3600)).toFixed(1).replace('.', ',') + ' km/h'],
    ['FC media', valoreOnd(c.fcMedia, ' bpm')],
    ['FC massima', valoreOnd(c.fcMax, ' bpm')],
    ['Dislivello', valoreOnd(c.dislivelloM, ' m')],
    ['Calorie', valoreOnd(c.calorie, ' kcal')],
    ['Carico allenamento', valoreOnd(c.carico, '')],
    ['Tempo totale', formattaDurata(c.durataSec * 1000)]
  ];

  const elValori = document.getElementById('corsa-dett-valori');
  elValori.innerHTML = '';
  voci.forEach(([nome, testo]) => {
    const box = document.createElement('div');
    box.className = 'dettaglio';
    const e = document.createElement('span');
    e.className = 'dettaglio-etichetta';
    e.textContent = nome;
    const v = document.createElement('span');
    v.className = 'dettaglio-valore';
    scriviValore(v, testo);
    box.append(e, v);
    elValori.append(box);
  });

  // Zone di frequenza cardiaca (Z1 = più bassa)
  const elZone = document.getElementById('corsa-dett-zone');
  const titoloZone = document.getElementById('corsa-dett-zone-titolo');
  elZone.innerHTML = '';
  const zone = Array.isArray(c.zoneFcSec) ? c.zoneFcSec : [];
  const totaleZone = zone.reduce((t, s) => t + s, 0);
  titoloZone.hidden = totaleZone === 0;

  if (totaleZone > 0) {
    const limiti = Array.isArray(c.zoneFcLimiti) ? c.zoneFcLimiti : [];
    zone.forEach((secondi, i) => {
      const quota = secondi / totaleZone;
      const riga = document.createElement('div');
      riga.className = 'zona';

      const nome = document.createElement('span');
      const da = i === 0 ? null : limiti[i - 1];
      const fino = limiti[i];
      nome.textContent = 'Z' + (i + 1) + (fino ? (da ? ' ' + da + '-' + fino : ' <' + fino) : '');

      const traccia = document.createElement('div');
      traccia.className = 'zona-traccia';
      const riempimento = document.createElement('div');
      riempimento.className = 'zona-riempimento';
      riempimento.style.width = (quota * 100).toFixed(1) + '%';
      traccia.append(riempimento);

      const valore = document.createElement('span');
      valore.className = 'zona-valore';
      valore.textContent = Math.round(secondi / 60) + ' min';

      riga.append(nome, traccia, valore);
      elZone.append(riga);
    });
  }

  veloCorsa.hidden = false;
}

function chiudiDettaglioCorsa() {
  veloCorsa.hidden = true;
}

document.getElementById('btn-corsa-chiudi').addEventListener('click', chiudiDettaglioCorsa);
veloCorsa.addEventListener('click', evento => {
  if (evento.target === veloCorsa) chiudiDettaglioCorsa();
});

// Aggiorna tutta la scheda Corsa
function mostraCorsa() {
  const corse = leggiCorse();
  elCorsaVuoto.hidden = corse.length > 0;
  elCorsaContenuto.hidden = corse.length === 0;

  const ultima = localStorage.getItem(CHIAVE_ULTIMA_SYNC);
  elCorsaFonte.textContent = 'Dati del Suunto tramite Intervals.icu' +
    (ultima ? ' · aggiornati ' + formattaData(ultima) + ' alle ' + formattaOra(ultima) : '');

  if (corse.length === 0) return;
  mostraUltimaCorsa(corse[0]);
  mostraRiepilogoCorsa(corse);
  mostraGraficoKm(corse);
  mostraGraficoPasso(corse);
  mostraStoricoCorse(corse);
}

document.getElementById('btn-sync-corsa').addEventListener('click', async () => {
  elCorsaFonte.textContent = 'Sincronizzazione in corso...';
  const errore = await sincronizzaConEsito();
  if (errore) elCorsaFonte.textContent = errore;
});

mostraCorsa();


// ===================================================
// Sonno: dati notturni del Suunto scaricati da Intervals.icu
// ===================================================

const ETICHETTE_QUALITA = { 1: 'eccellente', 2: 'buona', 3: 'discreta', 4: 'scarsa' };
const NOTTI_GRAFICO_SONNO = 14;
const NOTTI_GRAFICI_RECUPERO = 30;

const elSonnoVuoto = document.getElementById('sonno-vuoto');
const elSonnoContenuto = document.getElementById('sonno-contenuto');
const elSonnoUltima = document.getElementById('sonno-ultima');
const elSonnoStorico = document.getElementById('sonno-storico');
const elSonnoFonte = document.getElementById('sonno-fonte');

// "2026-11-10" -> data locale (a mezzogiorno, per evitare problemi di fuso orario)
function giornoLocale(testo) {
  const [a, m, g] = testo.split('-').map(Number);
  return new Date(a, m - 1, g, 12);
}

// Tutte le voci giornaliere scaricate, dalla più recente
function leggiNotti() {
  const dati = leggiJSON(CHIAVE_DATI_SALUTE, { notti: {}, attivita: {} });
  return Object.values(dati.notti).sort((a, b) => b.data.localeCompare(a.data));
}

// Media di un campo sulle voci che lo hanno (null se nessuna)
function mediaCampo(voci, campo) {
  const valide = voci.filter(v => typeof v[campo] === 'number');
  return valide.length ? valide.reduce((t, v) => t + v[campo], 0) / valide.length : null;
}

// Riquadro "ultima notte"
function mostraUltimaNotte(n) {
  elSonnoUltima.innerHTML = '';

  const etichetta = document.createElement('span');
  etichetta.className = 'etichetta';
  etichetta.textContent = 'Ultima notte · risveglio ' + formattaData(giornoLocale(n.data));

  // Numero principale: la durata, scritta come "6 h 33 min" con le unità più piccole
  const minuti = Math.round(n.sonnoSec / 60);
  const valore = document.createElement('div');
  valore.className = 'hero-valore';
  scriviValore(valore, Math.floor(minuti / 60) + ' h ' + (minuti % 60) + ' min');

  // Strumenti: punteggio (con la qualità sotto), poi i valori di recupero
  const qualita = ETICHETTE_QUALITA[n.qualitaSonno];
  const strumenti = creaStrumenti([
    ['Punteggio', n.punteggioSonno ? String(Math.round(n.punteggioSonno)) : 'n/d', qualita],
    ['HRV', valoreOnd(n.hrv, ' ms')],
    ['FC riposo', valoreOnd(n.fcRiposo, ' bpm')],
    ['FC sonno', valoreOnd(n.fcMediaSonno, ' bpm')],
    ['SpO2', valoreOnd(n.spo2, '%')]
  ]);

  elSonnoUltima.append(etichetta, valore, strumenti);
}

// Le 4 medie degli ultimi 7 giorni
function mostraMedieSonno(notti) {
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() - 6);
  const recenti = notti.filter(n => giornoLocale(n.data) >= limite);

  const sonno = mediaCampo(recenti, 'sonnoSec');
  const punteggio = mediaCampo(recenti, 'punteggioSonno');
  scriviValore(document.getElementById('stat-sonno-media'), sonno ? formattaDurata(sonno * 1000) : 'n/d');
  document.getElementById('stat-sonno-punteggio').textContent = valoreOnd(punteggio, '');
  scriviValore(document.getElementById('stat-sonno-fc'), valoreOnd(mediaCampo(recenti, 'fcRiposo'), ' bpm'));
  scriviValore(document.getElementById('stat-sonno-hrv'), valoreOnd(mediaCampo(recenti, 'hrv'), ' ms'));

  const conSonno = recenti.filter(n => n.sonnoSec).length;
  document.getElementById('sonno-notti-7').textContent = 'Notti con dati di sonno: ' + conSonno + ' su 7.';
}

// Colonne con le ore di sonno delle ultime notti (anche quelle senza dati, a zero)
function mostraGraficoSonno(notti) {
  const perGiorno = {};
  notti.forEach(n => { perGiorno[n.data] = n; });

  const punti = [];
  for (let i = NOTTI_GRAFICO_SONNO - 1; i >= 0; i--) {
    const giorno = new Date();
    giorno.setDate(giorno.getDate() - i);
    const n = perGiorno[dataPerNomeFile(giorno)];
    const secondi = n && n.sonnoSec ? n.sonnoSec : 0;
    punti.push({
      etichetta: String(giorno.getDate()),
      valore: secondi / 3600,
      dettaglio: 'Risveglio ' + formattaData(giorno) + ': ' +
        (secondi ? formattaDurata(secondi * 1000) + (n.punteggioSonno ? ' · punteggio ' + Math.round(n.punteggioSonno) : '') : 'nessun dato')
    });
  }
  disegnaColonne(
    document.getElementById('grafico-sonno'),
    document.getElementById('info-sonno'),
    punti,
    v => (Math.round(v * 10) / 10).toString().replace('.', ',') + ' h',
    'Tocca una colonna per i dettagli'
  );
}

// Linea di un valore notturno (HRV o FC a riposo) nelle ultime notti che lo hanno
function mostraGraficoRecupero(notti, campo, idGrafico, idInfo, unita) {
  const contenitore = document.getElementById(idGrafico);
  const info = document.getElementById(idInfo);
  const scelte = notti.filter(n => typeof n[campo] === 'number').slice(0, NOTTI_GRAFICI_RECUPERO).reverse();

  if (scelte.length === 0) {
    contenitore.innerHTML = '';
    info.textContent = 'Ancora nessun dato.';
    return;
  }

  const punti = scelte.map(n => ({
    etichetta: giornoLocale(n.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' }),
    valore: n[campo],
    dettaglio: 'Risveglio ' + formattaData(giornoLocale(n.data)) + ': ' + Math.round(n[campo]) + unita
  }));
  disegnaLinea(contenitore, info, punti, v => String(Math.round(v)), false, 'Tocca un punto per i dettagli');
}

// Storico: una riga per notte con dati di sonno
function mostraStoricoNotti(notti) {
  elSonnoStorico.innerHTML = '';
  notti.filter(n => n.sonnoSec).forEach(n => {
    const parti = [];
    if (n.punteggioSonno) parti.push('punteggio ' + Math.round(n.punteggioSonno));
    if (n.fcRiposo) parti.push('FC ' + Math.round(n.fcRiposo));
    if (n.hrv) parti.push('HRV ' + Math.round(n.hrv));
    const { riga } = creaRiga(formattaData(giornoLocale(n.data)), parti.join(' · ') || 'solo durata');
    const destra = document.createElement('div');
    destra.className = 'riga-valore';
    destra.textContent = formattaDurata(n.sonnoSec * 1000);
    riga.append(destra);
    elSonnoStorico.append(riga);
  });
}

// Aggiorna tutta la scheda Sonno
function mostraSonno() {
  const notti = leggiNotti();
  const conSonno = notti.filter(n => n.sonnoSec);

  elSonnoVuoto.hidden = conSonno.length > 0;
  elSonnoContenuto.hidden = conSonno.length === 0;

  const ultima = localStorage.getItem(CHIAVE_ULTIMA_SYNC);
  elSonnoFonte.textContent = 'Dati del Suunto tramite Intervals.icu' +
    (ultima ? ' · aggiornati ' + formattaData(ultima) + ' alle ' + formattaOra(ultima) : '');

  if (conSonno.length === 0) return;
  mostraUltimaNotte(conSonno[0]);
  mostraMedieSonno(notti);
  mostraGraficoSonno(notti);
  mostraGraficoRecupero(notti, 'hrv', 'grafico-hrv', 'info-hrv', ' ms');
  mostraGraficoRecupero(notti, 'fcRiposo', 'grafico-fc-riposo', 'info-fc-riposo', ' bpm');
  mostraStoricoNotti(notti);
}

document.getElementById('btn-sync-sonno').addEventListener('click', async () => {
  elSonnoFonte.textContent = 'Sincronizzazione in corso...';
  const errore = await sincronizzaConEsito();
  if (errore) elSonnoFonte.textContent = errore;
});

mostraSonno();


// ===================================================
// Agenda: appuntamenti e cose da fare
// ===================================================

const CHIAVE_AGENDA = 'agenda';
const GIORNI_FATTI = 90; // nell'archivio si tengono gli ultimi tre mesi

// Una voce: { id, titolo, data: 'AAAA-MM-GG' o null, ora: 'HH:MM' o null,
//             nota, fatto, fattoIl, fonte: 'mano' | 'voce', daRivedere }
// Con l'ora e un appuntamento, senza ora e una cosa da fare.

function leggiAgenda() {
  return leggiJSON(CHIAVE_AGENDA, []).filter(v => v && v.id && typeof v.titolo === 'string');
}

// Data locale come 'AAAA-MM-GG': niente fusi orari, niente sorprese
function giornoISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dataDaISO(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(a, m - 1, g);
}

function giorniDiDifferenza(iso) {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  return Math.round((dataDaISO(iso) - oggi) / 86400000);
}

function etichettaGiorno(iso) {
  const d = giorniDiDifferenza(iso);
  if (d === 0) return 'oggi · ' + dataDaISO(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  if (d === 1) return 'domani · ' + dataDaISO(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  return dataDaISO(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function quantoFa(iso) {
  const d = -giorniDiDifferenza(iso);
  if (d === 1) return 'ieri';
  return d + ' giorni fa';
}

// Ordine dentro un giorno: prima gli orari in sequenza, poi le cose senza ora.
// Se le voci senza ora stessero sopra, un appuntamento potrebbe sfuggire.
function ordinaNelGiorno(a, b) {
  if (!!a.ora !== !!b.ora) return a.ora ? -1 : 1;
  if (a.ora && b.ora && a.ora !== b.ora) return a.ora < b.ora ? -1 : 1;
  return a.titolo.localeCompare(b.titolo);
}

function raggruppaAgenda(voci) {
  const oggi = giornoISO(new Date());
  const scadute = [], senzaData = [];
  const giorni = new Map();

  voci.forEach(v => {
    if (!v.data) { senzaData.push(v); return; }
    if (v.data < oggi) { scadute.push(v); return; }
    if (!giorni.has(v.data)) giorni.set(v.data, []);
    giorni.get(v.data).push(v);
  });

  scadute.sort((a, b) => a.data.localeCompare(b.data) || ordinaNelGiorno(a, b));
  senzaData.sort((a, b) => a.titolo.localeCompare(b.titolo));
  const ordinati = [...giorni.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  ordinati.forEach(([, lista]) => lista.sort(ordinaNelGiorno));
  return { scadute, giorni: ordinati, senzaData };
}


// ---------- Disegno delle righe ----------

function creaVoceAgenda(v, opzioni) {
  const riga = document.createElement('li');
  riga.className = 'voce' + (opzioni.scaduta ? ' scaduta' : '') + (v.fatto ? ' fatta' : '');

  if (v.ora && !v.fatto) {
    const ora = document.createElement('span');
    ora.className = 'voce-ora mono';
    ora.textContent = v.ora;
    riga.append(ora);
  } else {
    const cerchio = document.createElement('button');
    cerchio.type = 'button';
    cerchio.className = 'voce-cerchio' + (v.fatto ? ' fatto' : '');
    cerchio.setAttribute('aria-label', v.fatto ? 'Da rifare' : 'Segna come fatto');
    cerchio.addEventListener('click', e => { e.stopPropagation(); segnaFatto(v.id, !v.fatto); });
    riga.append(cerchio);
  }

  const centro = document.createElement('div');
  centro.className = 'voce-centro';
  const titolo = document.createElement('div');
  titolo.className = 'voce-titolo';
  titolo.textContent = v.titolo;
  if (v.daRivedere) {
    const segno = document.createElement('span');
    segno.className = 'da-rivedere';
    segno.textContent = 'DA RIVEDERE';
    titolo.append(segno);
  }
  if (v.avvisato && !v.fatto) {
    const campana = document.createElementNS(SVG_NS, 'svg');
    campana.setAttribute('class', 'segno-avviso');
    const uso = document.createElementNS(SVG_NS, 'use');
    uso.setAttribute('href', '#i-campana');
    campana.append(uso);
    titolo.append(campana);
  }
  centro.append(titolo);

  const dettagli = [];
  if (opzioni.scaduta) dettagli.push(etichettaGiorno(v.data) + ' · ' + quantoFa(v.data));
  if (opzioni.conGiorno && v.data) dettagli.push(etichettaGiorno(v.data));
  if (v.ora && (opzioni.scaduta || v.fatto)) dettagli.push(v.ora);
  if (v.nota) dettagli.push(v.nota);
  if (dettagli.length) {
    const sotto = document.createElement('div');
    sotto.className = 'voce-sotto';
    sotto.textContent = dettagli.join(' · ');
    centro.append(sotto);
  }
  riga.append(centro);

  // Sullo scaduto una freccia porta la voce a oggi, senza aprire niente
  if (opzioni.scaduta) {
    const aOggi = document.createElement('button');
    aOggi.type = 'button';
    aOggi.className = 'voce-azione';
    aOggi.setAttribute('aria-label', 'Sposta a oggi');
    aOggi.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"/><path d="M13 6l6 6-6 6"/></svg>';
    aOggi.addEventListener('click', e => { e.stopPropagation(); spostaAOggi(v.id); });
    riga.append(aOggi);
  }

  riga.addEventListener('click', () => apriImpegno(v));
  return riga;
}

function creaGruppo(contenitore, titolo, voci, opzioni) {
  const intestazione = document.createElement('div');
  intestazione.className = 'gruppo-giorno' + (opzioni.scaduta ? ' scaduto' : '');
  const nome = document.createElement('span');
  nome.textContent = titolo;
  const quante = document.createElement('span');
  quante.textContent = voci.length;
  intestazione.append(nome, quante);

  const lista = document.createElement('ul');
  lista.className = 'lista' + (opzioni.scaduta ? ' lista-scaduta' : '');
  voci.forEach(v => lista.append(creaVoceAgenda(v, opzioni)));

  contenitore.append(intestazione, lista);
}


// ---------- Le due sottoschede ----------

const elAgenda = document.getElementById('agenda-elenco');
const elAgendaVuoto = document.getElementById('agenda-vuoto');
const sottoschedeAgenda = document.querySelectorAll('.sottoscheda-agenda');
let vistaAgenda = 'dafare';

function mostraAgenda() {
  const voci = leggiAgenda();
  elAgenda.innerHTML = '';

  if (vistaAgenda === 'fatti') {
    const limite = giornoISO(new Date(Date.now() - GIORNI_FATTI * 86400000));
    const fatti = voci
      .filter(v => v.fatto && (v.fattoIl || '') >= limite)
      .sort((a, b) => (b.fattoIl || '').localeCompare(a.fattoIl || ''));
    elAgendaVuoto.textContent = 'Niente di fatto negli ultimi tre mesi.';
    elAgendaVuoto.hidden = fatti.length > 0;

    const perGiorno = new Map();
    fatti.forEach(v => {
      const g = v.fattoIl || 'senza';
      if (!perGiorno.has(g)) perGiorno.set(g, []);
      perGiorno.get(g).push(v);
    });
    perGiorno.forEach((lista, g) => {
      creaGruppo(elAgenda, g === 'senza' ? 'senza data' : etichettaGiorno(g), lista, { conGiorno: false });
    });
    return;
  }

  const { scadute, giorni, senzaData } = raggruppaAgenda(voci.filter(v => !v.fatto));
  const quante = scadute.length + senzaData.length + giorni.reduce((t, [, l]) => t + l.length, 0);
  elAgendaVuoto.textContent = 'Niente in programma. Tocca + per aggiungere un impegno.';
  elAgendaVuoto.hidden = quante > 0;

  if (scadute.length) creaGruppo(elAgenda, 'scaduto', scadute, { scaduta: true });
  giorni.forEach(([iso, lista]) => creaGruppo(elAgenda, etichettaGiorno(iso), lista, {}));
  if (senzaData.length) creaGruppo(elAgenda, 'senza data', senzaData, {});
}

function mostraSottoschedaAgenda(nome) {
  vistaAgenda = nome;
  sottoschedeAgenda.forEach(b => b.classList.toggle('attiva', b.dataset.agenda === nome));
  mostraAgenda();
}

sottoschedeAgenda.forEach(b => {
  b.addEventListener('click', () => mostraSottoschedaAgenda(b.dataset.agenda));
});

function aggiornaAgenda() {
  mostraAgenda();
  mostraGiornata();
}

function segnaFatto(id, fatto) {
  const voci = leggiAgenda().map(v => v.id !== id ? v : {
    ...v,
    fatto,
    fattoIl: fatto ? giornoISO(new Date()) : null
  });
  scriviJSON(CHIAVE_AGENDA, voci);
  aggiornaAgenda();
}

function spostaAOggi(id) {
  const voci = leggiAgenda().map(v => v.id !== id ? v : { ...v, data: giornoISO(new Date()) });
  scriviJSON(CHIAVE_AGENDA, voci);
  aggiornaAgenda();
}


// ---------- Pannello: nuovo impegno o modifica ----------

const veloImpegno = document.getElementById('velo-impegno');
const campoTitolo = document.getElementById('impegno-titolo');
const campoData = document.getElementById('impegno-data');
const campoOraImpegno = document.getElementById('impegno-ora');
const campoNotaImpegno = document.getElementById('impegno-nota');
const esitoImpegno = document.getElementById('impegno-esito');
const btnEliminaImpegno = document.getElementById('btn-impegno-elimina');
let impegnoInModifica = null;

function apriImpegno(voce) {
  impegnoInModifica = voce || null;
  document.getElementById('impegno-titolo-pannello').textContent = voce ? 'Modifica impegno' : 'Nuovo impegno';
  campoTitolo.value = voce ? voce.titolo : '';
  campoData.value = voce ? (voce.data || '') : giornoISO(new Date());
  campoOraImpegno.value = voce ? (voce.ora || '') : '';
  campoNotaImpegno.value = voce ? (voce.nota || '') : '';
  esitoImpegno.textContent = '';
  btnEliminaImpegno.hidden = !voce;
  veloImpegno.hidden = false;
  if (!voce) campoTitolo.focus();
}

function chiudiImpegno() {
  veloImpegno.hidden = true;
  impegnoInModifica = null;
}

document.getElementById('btn-nuovo-impegno').addEventListener('click', () => apriImpegno(null));
document.getElementById('btn-impegno-chiudi').addEventListener('click', chiudiImpegno);
veloImpegno.addEventListener('click', e => { if (e.target === veloImpegno) chiudiImpegno(); });

// Scorciatoie per il giorno
document.querySelectorAll('[data-giorno]').forEach(b => {
  b.addEventListener('click', () => {
    const scelta = b.dataset.giorno;
    if (scelta === 'niente') { campoData.value = ''; return; }
    const d = new Date();
    if (scelta === 'domani') d.setDate(d.getDate() + 1);
    if (scelta === 'settimana') d.setDate(d.getDate() + 7);
    campoData.value = giornoISO(d);
  });
});

// Salva quello che c'e nel pannello e restituisce la voce salvata, oppure null se manca qualcosa
function salvaImpegnoDalPannello() {
  const titolo = campoTitolo.value.trim();
  if (!titolo) {
    esitoImpegno.textContent = 'Scrivi che cosa devi fare.';
    return null;
  }
  if (campoOraImpegno.value && !campoData.value) {
    esitoImpegno.textContent = 'Con un orario serve anche il giorno.';
    return null;
  }

  const comuni = {
    titolo,
    data: campoData.value || null,
    ora: campoOraImpegno.value || null,
    nota: campoNotaImpegno.value.trim(),
    daRivedere: false // controllato a mano
  };

  const voci = leggiAgenda();
  let salvata;
  if (impegnoInModifica) {
    salvata = { ...impegnoInModifica, ...comuni };
    scriviJSON(CHIAVE_AGENDA, voci.map(v => v.id !== salvata.id ? v : salvata));
  } else {
    salvata = {
      id: Date.now().toString(),
      ...comuni,
      fatto: false,
      fattoIl: null,
      fonte: 'mano',
      avvisato: false
    };
    scriviJSON(CHIAVE_AGENDA, voci.concat(salvata));
    impegnoInModifica = salvata; // un secondo tocco aggiorna, non duplica
  }
  return salvata;
}

document.getElementById('form-impegno').addEventListener('submit', e => {
  e.preventDefault();
  if (!salvaImpegnoDalPannello()) return;
  chiudiImpegno();
  aggiornaAgenda();
});

// Routine non puo mandare notifiche: l'avviso lo crea l'app Calendario,
// tramite un Comando Rapido che riceve "titolo|GG/MM/AAAA HH:MM".
// L'azione Promemoria di iOS e stata scartata: rifiuta la data di avviso.
function mandaASistema() {
  // I controlli vengono prima del salvataggio, altrimenti un tentativo
  // fallito lascerebbe comunque una voce nell'agenda
  if (!campoData.value) {
    esitoImpegno.textContent = 'Serve almeno il giorno per creare un avviso.';
    return;
  }
  if (!campoOraImpegno.value) {
    esitoImpegno.textContent = "Per creare l'avviso serve anche un orario.";
    return;
  }

  const voce = salvaImpegnoDalPannello();
  if (!voce) return;

  const ora = voce.ora;
  // Si manda "titolo|GG/MM/AAAA HH:MM": due sole parti, cosi nel Comando Rapido
  // bastano il primo e l'ultimo elemento, senza indici da scrivere a mano.
  // La data va in formato italiano perche la legge l'iPhone, non il codice.
  const [anno, mese, giorno] = voce.data.split('-');
  const quando = giorno + '/' + mese + '/' + anno + ' ' + ora;

  scriviJSON(CHIAVE_AGENDA, leggiAgenda().map(v => v.id !== voce.id ? v : { ...v, avvisato: true }));
  chiudiImpegno();
  aggiornaAgenda();
  apriComando(COMANDO_CALENDARIO, voce.titolo + '|' + quando);
}

document.getElementById('btn-impegno-calendario')
  .addEventListener('click', () => mandaASistema());

btnEliminaImpegno.addEventListener('click', () => {
  if (!impegnoInModifica) return;
  if (!confirm('Eliminare "' + impegnoInModifica.titolo + '"?')) return;
  scriviJSON(CHIAVE_AGENDA, leggiAgenda().filter(v => v.id !== impegnoInModifica.id));
  chiudiImpegno();
  aggiornaAgenda();
});


// ===================================================
// Scheda Oggi: la giornata e la sveglia in breve
// ===================================================

// Testo confrontabile: stesso impegno scritto con maiuscole o spazi diversi
function normalizzaTitolo(t) {
  return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Impegni di oggi da Google Calendar (arrivano col riepilogo mattutino).
// Quelli gia presenti nell'agenda di Routine (stesso titolo e stessa ora) non si ripetono:
// succede per ogni impegno salvato con "Salva e avvisami".
function impegniCalendarioDiOggi(vociRoutine) {
  const r = riepilogoDiOggi();
  if (!r || !Array.isArray(r.impegni)) return [];
  const gia = new Set(vociRoutine.map(v => normalizzaTitolo(v.titolo) + '|' + (v.ora || '')));
  return r.impegni
    .filter(e => e && typeof e.titolo === 'string' && e.titolo.trim())
    .map(e => ({ titolo: e.titolo.trim(), ora: /^\d{2}:\d{2}$/.test(e.ora || '') ? e.ora : null, daCalendario: true }))
    .filter(e => !gia.has(normalizzaTitolo(e.titolo) + '|' + (e.ora || '')));
}

function mostraGiornata() {
  const voci = leggiAgenda().filter(v => !v.fatto);
  const oggi = giornoISO(new Date());
  const diRoutine = voci.filter(v => v.data === oggi);
  const diOggi = diRoutine.concat(impegniCalendarioDiOggi(diRoutine)).sort(ordinaNelGiorno);
  const scadute = voci.filter(v => v.data && v.data < oggi);

  const riassunto = document.getElementById('giornata-riassunto');
  const elenco = document.getElementById('giornata-elenco');
  elenco.innerHTML = '';

  if (diOggi.length === 0 && scadute.length === 0) {
    riassunto.textContent = 'Niente in programma per oggi.';
    return;
  }

  const parti = [];
  const appuntamenti = diOggi.filter(v => v.ora || v.daCalendario).length;
  const daFare = diOggi.length - appuntamenti;
  if (appuntamenti) parti.push(appuntamenti + (appuntamenti === 1 ? ' appuntamento' : ' appuntamenti'));
  if (daFare) parti.push(daFare + (daFare === 1 ? ' cosa da fare' : ' cose da fare'));
  if (scadute.length) parti.push(scadute.length + (scadute.length === 1 ? ' scaduta' : ' scadute'));
  riassunto.textContent = parti.join(', ') + '.';

  // Lo scaduto sta in una riga sola: in Oggi serve il colpo d'occhio
  if (scadute.length) {
    const riga = document.createElement('div');
    riga.className = 'giornata-riga scaduta';
    const segno = document.createElement('span');
    segno.className = 'giornata-ora mono';
    segno.textContent = '!';
    const centro = document.createElement('div');
    centro.className = 'voce-centro';
    const titolo = document.createElement('div');
    titolo.className = 'voce-titolo';
    titolo.textContent = scadute.length === 1 ? '1 cosa scaduta' : scadute.length + ' cose scadute';
    const sotto = document.createElement('div');
    sotto.className = 'voce-sotto';
    sotto.textContent = scadute.slice(0, 3).map(v => v.titolo).join(', ') + (scadute.length > 3 ? '...' : '');
    centro.append(titolo, sotto);
    riga.append(segno, centro);
    riga.addEventListener('click', () => mostraVista('agenda'));
    elenco.append(riga);
  }

  diOggi.forEach(v => {
    const riga = document.createElement('div');
    riga.className = 'giornata-riga' + (v.daCalendario ? ' calendario' : '');

    if (v.daCalendario && !v.ora) {
      const spazio = document.createElement('span');
      spazio.className = 'giornata-ora mono';
      spazio.textContent = 'tutto';
      riga.append(spazio);
    } else if (v.ora) {
      const ora = document.createElement('span');
      ora.className = 'giornata-ora mono';
      ora.textContent = v.ora;
      riga.append(ora);
    } else {
      const spazio = document.createElement('span');
      spazio.className = 'giornata-ora';
      const cerchio = document.createElement('button');
      cerchio.type = 'button';
      cerchio.className = 'voce-cerchio';
      cerchio.setAttribute('aria-label', 'Segna come fatto');
      cerchio.addEventListener('click', e => { e.stopPropagation(); segnaFatto(v.id, true); });
      spazio.append(cerchio);
      riga.append(spazio);
    }

    const centro = document.createElement('div');
    centro.className = 'voce-centro';
    const titolo = document.createElement('div');
    titolo.className = 'voce-titolo';
    titolo.textContent = v.titolo;
    centro.append(titolo);
    if (v.nota || v.daCalendario) {
      const sotto = document.createElement('div');
      sotto.className = 'voce-sotto';
      sotto.textContent = v.daCalendario ? 'Google Calendar' : v.nota;
      centro.append(sotto);
    }
    riga.append(centro);
    if (!v.daCalendario) riga.addEventListener('click', () => apriImpegno(v));
    elenco.append(riga);
  });
}

// Sveglie preferite in forma compatta: un tocco le imposta
function mostraSveglieRapide() {
  const preferite = leggiJSON(CHIAVE_PREFERITE, []);
  const elenco = document.getElementById('sveglia-rapide');
  elenco.innerHTML = '';
  document.getElementById('sveglia-rapide-vuoto').hidden = preferite.length > 0;

  preferite.slice(0, 3).forEach(p => {
    const riga = document.createElement('li');
    riga.className = 'rapida';
    const ora = document.createElement('span');
    ora.className = 'rapida-ora mono';
    ora.textContent = p.ora;
    const centro = document.createElement('div');
    centro.className = 'voce-centro';
    const nome = document.createElement('div');
    nome.className = 'voce-titolo';
    nome.textContent = p.nome;
    const sotto = document.createElement('div');
    sotto.className = 'voce-sotto';
    sotto.textContent = ETICHETTE_RIPETI[p.ripeti];
    centro.append(nome, sotto);
    const imposta = document.createElement('span');
    imposta.className = 'rapida-imposta';
    imposta.textContent = 'Imposta';
    riga.append(ora, centro, imposta);
    riga.addEventListener('click', () => impostaSveglia(p));
    elenco.append(riga);
  });
}

// Pannello della sveglia completa
const veloSveglia = document.getElementById('velo-sveglia');
document.getElementById('btn-apri-sveglia').addEventListener('click', () => { veloSveglia.hidden = false; });
document.getElementById('btn-chiudi-sveglia').addEventListener('click', () => { veloSveglia.hidden = true; });
veloSveglia.addEventListener('click', e => { if (e.target === veloSveglia) veloSveglia.hidden = true; });

// ---------- Riepilogo mattutino ----------
// Ogni mattina alle 6:40 un'attivita pianificata di Claude scrive out/oggi.json
// nel repository privato (lo stesso della casella di arrivo): frase del giorno,
// email da aprire (solo mittente e oggetto), impegni di Google Calendar, notizie.

// (le costanti del riepilogo stanno in cima al file: la giornata le usa gia all'avvio)

// Il riepilogo vale solo per il giorno per cui e stato scritto
function riepilogoDiOggi() {
  const r = leggiJSON(CHIAVE_RIEPILOGO, null);
  return r && r.perGiorno === giornoISO(new Date()) ? r : null;
}

async function leggiRiepilogo() {
  if (!configurazioneGitHub()) return;
  if (Date.now() - ultimaLetturaRiepilogo < PAUSA_RIEPILOGO_MS && riepilogoDiOggi()) return;
  try {
    const dati = await chiamaGitHub('/contents/' + FILE_RIEPILOGO, { cache: 'no-store' });
    ultimaLetturaRiepilogo = Date.now();
    if (!dati || !dati.content) return;
    const r = JSON.parse(daBase64(dati.content));
    if (!r || typeof r !== 'object') return;
    scriviJSON(CHIAVE_RIEPILOGO, r);
    mostraRiepilogoOggi();
    mostraGiornata();
  } catch {
    // Senza rete o senza file resta quello che c'era: il resto di Oggi funziona lo stesso
  }
}

// Una riga cliccabile che apre un link fuori dall'app (Gmail, articolo)
function creaRigaLink(titoloTesto, sottoTesto, link, urgente) {
  const riga = document.createElement(link ? 'a' : 'div');
  riga.className = 'link-riga';
  if (link) {
    riga.href = link;
    riga.target = '_blank';
    riga.rel = 'noopener';
  }
  const segno = document.createElement('span');
  segno.className = 'link-segno' + (urgente ? ' urgente' : '');
  const centro = document.createElement('div');
  centro.className = 'voce-centro';
  const titolo = document.createElement('div');
  titolo.className = 'voce-titolo';
  titolo.textContent = titoloTesto;
  centro.append(titolo);
  if (sottoTesto) {
    const sotto = document.createElement('div');
    sotto.className = 'voce-sotto';
    sotto.textContent = sottoTesto;
    centro.append(sotto);
  }
  riga.append(segno, centro);
  if (link) {
    const freccia = document.createElement('span');
    freccia.className = 'link-freccia';
    freccia.textContent = '↗';
    riga.append(freccia);
  }
  return riga;
}

function testoValido(t) {
  return typeof t === 'string' && t.trim() !== '';
}

function mostraRiepilogoOggi() {
  const r = riepilogoDiOggi();

  // Frase della giornata
  const card = document.getElementById('riepilogo-card');
  card.hidden = !(r && testoValido(r.frase));
  if (!card.hidden) {
    document.getElementById('riepilogo-frase').textContent = r.frase;
    document.getElementById('riepilogo-ora').textContent = r.generato ? formattaOra(r.generato) : '';
  }

  // Email da aprire: urgenti in cima
  const email = r && Array.isArray(r.email) ? r.email.filter(e => e && testoValido(e.oggetto)) : [];
  email.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0));
  const cardEmail = document.getElementById('email-card');
  cardEmail.hidden = email.length === 0;
  const elencoEmail = document.getElementById('email-elenco');
  elencoEmail.innerHTML = '';
  email.forEach(e => {
    const link = /^https:\/\/mail\.google\.com\//.test(e.link || '') ? e.link : null;
    elencoEmail.append(creaRigaLink(e.oggetto, e.da || '', link, !!e.urgente));
  });
  document.getElementById('email-numero').textContent = email.length || '';

  mostraNotizie();
  mostraCitazione();
}

function mostraNotizie() {
  const r = riepilogoDiOggi();
  const notizie = r && r.notizie && typeof r.notizie === 'object' ? r.notizie : {};
  const perScheda = nome => (Array.isArray(notizie[nome]) ? notizie[nome] : []).filter(n => n && testoValido(n.titolo));
  const schede = ['italia', 'settore', 'locali'];
  const card = document.getElementById('notizie-card');
  card.hidden = schede.every(nome => perScheda(nome).length === 0);
  if (card.hidden) return;

  // Se la scheda scelta e vuota, passa alla prima che ha qualcosa
  if (perScheda(schedaNotizie).length === 0) schedaNotizie = schede.find(nome => perScheda(nome).length > 0);
  document.querySelectorAll('.sottoscheda-notizie').forEach(b => {
    b.classList.toggle('attiva', b.dataset.notizie === schedaNotizie);
    b.disabled = perScheda(b.dataset.notizie).length === 0; // scheda senza notizie fresche
  });

  const elenco = document.getElementById('notizie-elenco');
  elenco.innerHTML = '';
  perScheda(schedaNotizie).forEach(n => {
    const link = /^https?:\/\//.test(n.link || '') ? n.link : null;
    const sotto = [n.fonte, n.riassunto].filter(testoValido).join(' · ');
    elenco.append(creaRigaLink(n.titolo, sotto, link, false));
  });
}

document.querySelectorAll('.sottoscheda-notizie').forEach(b => {
  b.addEventListener('click', () => { schedaNotizie = b.dataset.notizie; mostraNotizie(); });
});


// ---------- Frase del giorno ----------
// Di solito la sceglie Claude nel riepilogo; se il riepilogo non c'e,
// Routine ne prende una da questo elenco, diversa ogni giorno.
const CITAZIONI = [
  ['Non è perché le cose sono difficili che non osiamo; è perché non osiamo che sono difficili.', 'Seneca'],
  ['Nessun vento è favorevole per chi non sa dove andare.', 'Seneca'],
  ['Mentre si rimanda, la vita passa.', 'Seneca'],
  ['Non è che abbiamo poco tempo: è che ne perdiamo molto.', 'Seneca'],
  ['Non perdere altro tempo a discutere di come debba essere un uomo buono. Sii uno.', 'Marco Aurelio'],
  ['Ciò che ostacola l’azione fa avanzare l’azione. Ciò che sta sulla via diventa la via.', 'Marco Aurelio'],
  ['Non sono le cose a turbare gli uomini, ma i giudizi che essi danno delle cose.', 'Epitteto'],
  ['Nessuno è libero se non è padrone di sé stesso.', 'Epitteto'],
  ['Chi poco pensa, molto erra.', 'Leonardo da Vinci'],
  ['Come il ferro s’arrugginisce senza esercizio, così l’ingegno senza esercizio si guasta.', 'Leonardo da Vinci'],
  ['Il modo più efficace per farlo è farlo.', 'Amelia Earhart'],
  ['Il primo principio è che non devi ingannare te stesso, e tu sei la persona più facile da ingannare.', 'Richard Feynman'],
  ['La vita è come andare in bicicletta: per restare in equilibrio devi continuare a muoverti.', 'Albert Einstein'],
  ['Non ho talenti speciali. Sono solo appassionatamente curioso.', 'Albert Einstein'],
  ['Con la forza d’animo vinciamo.', 'Ernest Shackleton'],
  ['Cogli l’attimo, confidando il meno possibile nel domani.', 'Orazio'],
  ['Possono, perché credono di potere.', 'Virgilio'],
  ['Un viaggio di mille miglia comincia con un passo.', 'Lao Tzu'],
  ['Fatti non foste a viver come bruti, ma per seguir virtute e canoscenza.', 'Dante Alighieri'],
  ['Nella vita non c’è nulla da temere, solo da capire.', 'Marie Curie'],
  ['Se ho visto più lontano, è perché stavo sulle spalle di giganti.', 'Isaac Newton'],
  ['È un piccolo passo per un uomo, ma un balzo gigantesco per l’umanità.', 'Neil Armstrong'],
  ['Finché c’è vita, c’è speranza.', 'Cicerone'],
  ['Il corpo faccia quello che vuole. Io non sono il corpo: io sono la mente.', 'Rita Levi-Montalcini'],
  ['Ancora imparo.', 'Michelangelo Buonarroti']
];

function mostraCitazione() {
  const r = riepilogoDiOggi();
  let testo, autore;
  if (r && r.motivazione && testoValido(r.motivazione.testo)) {
    testo = r.motivazione.testo;
    autore = r.motivazione.autore || '';
  } else {
    const oggi = new Date();
    const giornoAnno = Math.floor((oggi - new Date(oggi.getFullYear(), 0, 0)) / 86400000);
    [testo, autore] = CITAZIONI[giornoAnno % CITAZIONI.length];
  }
  document.getElementById('citazione-testo').textContent = '«' + testo.replace(/^[«"]+|[»"]+$/g, '') + '»';
  document.getElementById('citazione-autore').textContent = autore;
}


// ---------- Meteo dal vivo (Open-Meteo, nessuna chiave) ----------
const CHIAVE_METEO = 'meteoOggi';
const METEO_LUOGO = { nome: 'Mogliano Veneto', lat: 45.561, lon: 12.236 };
const PAUSA_METEO_MS = 20 * 60 * 1000;
const DIREZIONI_VENTO = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

let meteoInCorso = false;

async function aggiornaMeteo(forza) {
  const salvato = leggiJSON(CHIAVE_METEO, null);
  if (meteoInCorso) return;
  if (!forza && salvato && Date.now() - salvato.quando < PAUSA_METEO_MS) return;
  meteoInCorso = true;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + METEO_LUOGO.lat + '&longitude=' + METEO_LUOGO.lon +
      '&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl' +
      '&hourly=pressure_msl&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=Europe%2FRome&forecast_days=1&past_days=1';
    const risposta = await fetch(url);
    if (!risposta.ok) throw new Error();
    const d = await risposta.json();

    // Tendenza della pressione: confronto con 3 ore prima
    let tendenza = null;
    const ore = d.hourly && d.hourly.time;
    if (ore && d.current) {
      const adesso = d.current.time.slice(0, 13);
      const i = ore.findIndex(t => t.slice(0, 13) === adesso);
      if (i >= 3) tendenza = d.hourly.pressure_msl[i] - d.hourly.pressure_msl[i - 3];
    }
    const ultimo = (d.daily.time || []).length - 1;
    scriviJSON(CHIAVE_METEO, {
      quando: Date.now(),
      giorno: giornoISO(new Date()),
      temp: d.current.temperature_2m,
      vento: d.current.wind_speed_10m,
      direzione: d.current.wind_direction_10m,
      pressione: d.current.pressure_msl,
      tendenza,
      min: d.daily.temperature_2m_min[ultimo],
      max: d.daily.temperature_2m_max[ultimo],
      pioggia: d.daily.precipitation_probability_max[ultimo]
    });
    mostraMeteo();
  } catch {
    // Senza rete resta l'ultimo dato salvato, con la sua ora
  } finally {
    meteoInCorso = false;
  }
}

function mostraMeteo() {
  const m = leggiJSON(CHIAVE_METEO, null);
  const card = document.getElementById('meteo-card');
  card.hidden = !m;
  if (!m) return;

  const tondo = v => (typeof v === 'number' ? Math.round(v) : null);
  const direzione = typeof m.direzione === 'number' ? DIREZIONI_VENTO[Math.round(m.direzione / 45) % 8] : '';
  let tendenza = 'stabile';
  if (typeof m.tendenza === 'number') {
    if (m.tendenza >= 1) tendenza = 'in salita';
    else if (m.tendenza <= -1) tendenza = 'in calo';
  }
  const odierno = m.giorno === giornoISO(new Date());

  const contenitore = document.getElementById('meteo-strumenti');
  contenitore.innerHTML = '';
  const griglia = creaStrumenti([
    ['Temp', tondo(m.temp) !== null ? tondo(m.temp) + '°' : 'n/d', odierno && tondo(m.min) !== null ? tondo(m.min) + ' / ' + tondo(m.max) + '°' : ''],
    ['Pioggia', odierno && tondo(m.pioggia) !== null ? tondo(m.pioggia) + '%' : 'n/d', 'oggi'],
    ['Vento', tondo(m.vento) !== null ? tondo(m.vento) + ' km/h' : 'n/d', direzione],
    ['Press.', tondo(m.pressione) !== null ? String(tondo(m.pressione)) : 'n/d', 'hPa ' + tendenza]
  ]);
  griglia.classList.add('quattro');
  contenitore.append(griglia);

  const minuti = Math.round((Date.now() - m.quando) / 60000);
  document.getElementById('meteo-ora').textContent = minuti < 2 ? 'adesso' : formattaOra(new Date(m.quando).toISOString());
}

// I pulsanti "vai a una scheda" dentro i riquadri di Oggi
document.querySelectorAll('[data-vai]').forEach(b => {
  b.addEventListener('click', e => { e.stopPropagation(); mostraVista(b.dataset.vai); });
});

mostraSottoschedaAgenda('dafare');
mostraGiornata();
mostraSveglieRapide();
mostraRiepilogoOggi();
mostraMeteo();


// ===================================================
// Spese
// ===================================================

const CHIAVE_SPESE = 'spese';
const MESI_NEL_GRAFICO = 12;
const CATEGORIE_IN_EVIDENZA = 6; // le altre si aprono con un tocco

// L'ordine conta: le prime quattro sono la "vita sociale", che ha un totale suo.
// Elenco in un punto solo: da qui si potra renderlo modificabile dalle Impostazioni.
const CATEGORIE_SPESA = [
  { id: 'bar',         breve: 'Bar',    nome: 'Bar e caffe',       icona: 'i-caffe',      sociale: true },
  { id: 'drink',       breve: 'Drink',  nome: 'Aperitivi e drink', icona: 'i-bicchiere',  sociale: true },
  { id: 'pasti',       breve: 'Pasti',  nome: 'Pasti fuori',       icona: 'i-piatto',     sociale: true },
  { id: 'feste',       breve: 'Feste',  nome: 'Feste e serate',    icona: 'i-coriandoli', sociale: true },
  { id: 'trasporti',   breve: 'Trasp.', nome: 'Trasporti',         icona: 'i-auto' },
  { id: 'pesca',       breve: 'Pesca',  nome: 'Pesca',             icona: 'i-pesce' },
  { id: 'sport',       breve: 'Sport',  nome: 'Sport e salute',    icona: 'i-manubrio' },
  { id: 'shopping',    breve: 'Shop',   nome: 'Shopping',          icona: 'i-borsa' },
  { id: 'abbonamenti', breve: 'Abbon.', nome: 'Abbonamenti',       icona: 'i-ricorrente' },
  { id: 'altro',       breve: 'Altro',  nome: 'Altro',             icona: 'i-punti' }
];
const CATEGORIA = {};
CATEGORIE_SPESA.forEach(c => { CATEGORIA[c.id] = c; });

// Gli importi sono salvati in centesimi: numeri interi, nessun errore di arrotondamento
function euroTesto(centesimi) {
  return (centesimi / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Scrive un importo con il simbolo dell'euro piu piccolo
function scriviEuro(el, centesimi) {
  el.textContent = euroTesto(centesimi);
  const u = document.createElement('span');
  u.className = 'unita';
  u.textContent = '€';
  el.append(u);
}

function leggiSpese() {
  return leggiJSON(CHIAVE_SPESE, []).filter(s => s && s.id && typeof s.importoCent === 'number' && s.quando);
}

function primoDelMese(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nomeMese(d) {
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function stessoMese(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function speseDelMese(spese, mese) {
  return spese.filter(s => stessoMese(new Date(s.quando), mese));
}

function sommaCent(spese) {
  return spese.reduce((t, s) => t + s.importoCent, 0);
}


// ---------- Inserimento ----------

const elImporto = document.getElementById('spesa-importo');
const elQuando = document.getElementById('spesa-quando');
const campoNotaSpesa = document.getElementById('campo-spesa-nota');
const elNotaSpesa = document.getElementById('spesa-nota');
const elConferma = document.getElementById('spesa-conferma');
const elConfermaTesto = document.getElementById('spesa-conferma-testo');

let cifre = '';          // centesimi digitati, come testo
let ultimaSalvata = null; // per il pulsante Annulla
let timerConferma = null;

function mostraImporto() {
  const centesimi = cifre === '' ? 0 : parseInt(cifre, 10);
  scriviEuro(elImporto, centesimi);
  elImporto.classList.toggle('vuoto-valore', cifre === '');
  elQuando.textContent = 'oggi, ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function premiTasto(valore) {
  if (valore === 'canc') {
    cifre = cifre.slice(0, -1);
  } else {
    const prossime = (cifre + valore).replace(/^0+/, '');
    if (prossime.length > 7) return; // massimo 99.999,99
    cifre = prossime;
  }
  mostraImporto();
}

// Tastierino: 1-9, poi 00, 0 e cancella
const elTastierino = document.getElementById('tastierino');
['1','2','3','4','5','6','7','8','9','00','0','canc'].forEach(v => {
  const t = document.createElement('button');
  t.type = 'button';
  t.className = 'tasto' + (v === '00' || v === 'canc' ? ' piccolo' : '');
  if (v === 'canc') {
    t.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px">' +
      '<path d="M9 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L2 12z"/><path d="M13 9.5l5 5M18 9.5l-5 5"/></svg>';
    t.setAttribute('aria-label', 'Cancella una cifra');
  } else {
    t.textContent = v;
  }
  t.addEventListener('click', () => premiTasto(v));
  elTastierino.append(t);
});

// Griglia delle categorie: la stessa serve anche nel pannello di modifica
function creaGrigliaCategorie(contenitore, alTocco) {
  contenitore.innerHTML = '';
  CATEGORIE_SPESA.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'categoria' + (c.sociale ? ' sociale' : '');
    b.dataset.categoria = c.id;
    b.innerHTML = '<svg><use href="#' + c.icona + '"/></svg>';
    const nome = document.createElement('span');
    nome.textContent = c.breve;
    b.append(nome);
    b.addEventListener('click', () => alTocco(c.id, contenitore));
    contenitore.append(b);
  });
}

document.getElementById('btn-spesa-nota').addEventListener('click', () => {
  campoNotaSpesa.hidden = !campoNotaSpesa.hidden;
  if (!campoNotaSpesa.hidden) elNotaSpesa.focus();
});

function salvaSpesa(categoriaId) {
  if (cifre === '') {
    mostraConferma("Scrivi prima l'importo.", false);
    return;
  }
  const spesa = {
    id: Date.now().toString(),
    importoCent: parseInt(cifre, 10),
    categoria: categoriaId,
    nota: elNotaSpesa.value.trim(),
    quando: new Date().toISOString(),
    fonte: 'mano',      // 'voce' quando arrivera dal comando vocale
    daRivedere: false   // vero se la categoria l'ha indovinata Claude
  };
  scriviJSON(CHIAVE_SPESE, leggiSpese().concat(spesa));
  ultimaSalvata = spesa.id;

  cifre = '';
  elNotaSpesa.value = '';
  campoNotaSpesa.hidden = true;
  mostraImporto();
  meseVisto = primoDelMese(new Date()); // il mese della spesa appena inserita
  mostraSpese();
  mostraConferma('Salvata: ' + euroTesto(spesa.importoCent) + ' € · ' + CATEGORIA[categoriaId].nome, true);
}

function mostraConferma(testo, conAnnulla) {
  clearTimeout(timerConferma);
  elConfermaTesto.textContent = testo;
  document.getElementById('btn-spesa-annulla').hidden = !conAnnulla;
  elConferma.hidden = false;
  timerConferma = setTimeout(() => { elConferma.hidden = true; ultimaSalvata = null; }, 6000);
}

document.getElementById('btn-spesa-annulla').addEventListener('click', () => {
  if (!ultimaSalvata) return;
  scriviJSON(CHIAVE_SPESE, leggiSpese().filter(s => s.id !== ultimaSalvata));
  ultimaSalvata = null;
  elConferma.hidden = true;
  mostraSpese();
});

creaGrigliaCategorie(document.getElementById('categorie-spesa'), salvaSpesa);
mostraImporto();


// ---------- Mese corrente ----------

let meseVisto = primoDelMese(new Date());
let tutteLeCategorie = false;

function mostraRiepilogoMese(spese) {
  const delMese = speseDelMese(spese, meseVisto);
  const totale = sommaCent(delMese);
  const oggi = new Date();
  const corrente = stessoMese(meseVisto, oggi);

  document.getElementById('spese-mese-nome').textContent = nomeMese(meseVisto);
  document.getElementById('btn-mese-succ').disabled = corrente;
  scriviEuro(document.getElementById('spese-totale'), totale);

  // Confronto con il mese prima: allo stesso giorno, altrimenti a meta mese
  // il confronto con un mese intero direbbe sempre che stai risparmiando
  const precedente = new Date(meseVisto.getFullYear(), meseVisto.getMonth() - 1, 1);
  const giornoLimite = corrente ? oggi.getDate() : 32;
  const delPrec = speseDelMese(spese, precedente).filter(s => new Date(s.quando).getDate() <= giornoLimite);
  const elConfronto = document.getElementById('spese-confronto');
  elConfronto.classList.remove('su', 'giu');
  if (delPrec.length === 0) {
    elConfronto.textContent = 'Nessuna spesa registrata a ' + precedente.toLocaleDateString('it-IT', { month: 'long' }) + '.';
  } else {
    const differenza = totale - sommaCent(delPrec);
    const quando = corrente ? ' allo stesso giorno' : '';
    if (differenza === 0) {
      elConfronto.textContent = 'Come ' + precedente.toLocaleDateString('it-IT', { month: 'long' }) + quando + '.';
    } else {
      elConfronto.classList.add(differenza > 0 ? 'su' : 'giu');
      elConfronto.textContent = (differenza > 0 ? '▲ ' : '▼ ') + euroTesto(Math.abs(differenza)) +
        ' € rispetto a ' + precedente.toLocaleDateString('it-IT', { month: 'long' }) + quando;
    }
  }

  // Media al giorno: sui giorni trascorsi se il mese e quello in corso
  const giorni = corrente ? oggi.getDate() : new Date(meseVisto.getFullYear(), meseVisto.getMonth() + 1, 0).getDate();
  scriviEuro(document.getElementById('spese-media'), Math.round(totale / giorni));
  scriviEuro(document.getElementById('spese-sociale'),
    sommaCent(delMese.filter(s => CATEGORIA[s.categoria] && CATEGORIA[s.categoria].sociale)));

  mostraCategorieMese(delMese, totale);
  mostraElencoSpese(delMese);
}

function mostraCategorieMese(delMese, totale) {
  const box = document.getElementById('spese-categorie');
  box.innerHTML = '';
  if (delMese.length === 0) {
    box.classList.add('vuoto');
    box.textContent = 'Nessuna spesa in questo mese.';
    return;
  }
  box.classList.remove('vuoto');

  const perCategoria = CATEGORIE_SPESA
    .map(c => ({ cat: c, totale: sommaCent(delMese.filter(s => s.categoria === c.id)) }))
    .filter(v => v.totale > 0)
    .sort((a, b) => b.totale - a.totale);

  const massimo = perCategoria[0].totale;
  const visibili = tutteLeCategorie ? perCategoria : perCategoria.slice(0, CATEGORIE_IN_EVIDENZA);

  visibili.forEach(v => {
    const riga = document.createElement('div');
    riga.className = 'barra-cat' + (v.cat.sociale ? ' sociale' : '');

    const nome = document.createElement('span');
    nome.className = 'barra-cat-nome';
    nome.textContent = v.cat.nome;

    const traccia = document.createElement('div');
    traccia.className = 'barra-cat-traccia';
    const riempimento = document.createElement('div');
    riempimento.className = 'barra-cat-riempimento';
    riempimento.style.width = Math.round((v.totale / massimo) * 100) + '%';
    traccia.append(riempimento);

    const valore = document.createElement('span');
    valore.className = 'barra-cat-valore';
    valore.textContent = euroTesto(v.totale);

    riga.append(nome, traccia, valore);
    box.append(riga);
  });

  const nascoste = perCategoria.length - visibili.length;
  if (nascoste > 0 || tutteLeCategorie) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'altre-cat';
    b.textContent = tutteLeCategorie
      ? 'Mostra solo le principali'
      : (nascoste === 1 ? 'un\'altra categoria' : 'altre ' + nascoste + ' categorie');
    b.addEventListener('click', () => { tutteLeCategorie = !tutteLeCategorie; mostraSpese(); });
    box.append(b);
  }
}

function mostraElencoSpese(delMese) {
  const elenco = document.getElementById('spese-elenco');
  elenco.innerHTML = '';
  document.getElementById('spese-elenco-vuoto').hidden = delMese.length > 0;

  // Prima quelle da controllare, poi le piu recenti
  const ordinate = delMese.slice().sort((a, b) => {
    if (!!b.daRivedere !== !!a.daRivedere) return b.daRivedere ? 1 : -1;
    return new Date(b.quando) - new Date(a.quando);
  });

  ordinate.forEach(s => {
    const cat = CATEGORIA[s.categoria];
    const quando = new Date(s.quando);
    const oggi = new Date();
    const giorno = quando.toDateString() === oggi.toDateString()
      ? 'oggi'
      : quando.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const ora = quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const { riga, sinistra } = creaRiga(cat ? cat.nome : 'Altro', giorno + ' · ' + ora + (s.nota ? ' · ' + s.nota : ''));
    if (s.daRivedere) {
      const segno = document.createElement('span');
      segno.className = 'da-rivedere';
      segno.textContent = 'DA RIVEDERE';
      sinistra.querySelector('.riga-titolo').append(segno);
    }
    const destra = document.createElement('span');
    destra.className = 'riga-valore';
    destra.textContent = euroTesto(s.importoCent) + ' €';
    riga.append(destra);
    riga.addEventListener('click', () => apriModificaSpesa(s));
    elenco.append(riga);
  });
}

document.getElementById('btn-mese-prec').addEventListener('click', () => {
  meseVisto = new Date(meseVisto.getFullYear(), meseVisto.getMonth() - 1, 1);
  mostraSpese();
});
document.getElementById('btn-mese-succ').addEventListener('click', () => {
  if (stessoMese(meseVisto, new Date())) return;
  meseVisto = new Date(meseVisto.getFullYear(), meseVisto.getMonth() + 1, 1);
  mostraSpese();
});


// ---------- Resoconto di tutti i mesi ----------

function mesiConSpese(spese) {
  const mappa = new Map();
  spese.forEach(s => {
    const d = primoDelMese(new Date(s.quando));
    const chiave = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!mappa.has(chiave)) mappa.set(chiave, { mese: d, totale: 0, numero: 0 });
    const voce = mappa.get(chiave);
    voce.totale += s.importoCent;
    voce.numero += 1;
  });
  return [...mappa.values()].sort((a, b) => b.mese - a.mese);
}

function mostraStoricoSpese(spese) {
  const mesi = mesiConSpese(spese);
  const totale = sommaCent(spese);

  scriviEuro(document.getElementById('spese-totale-tutto'), totale);
  scriviEuro(document.getElementById('spese-media-mese'), mesi.length ? Math.round(totale / mesi.length) : 0);
  document.getElementById('spese-mesi-num').textContent = mesi.length;

  const piuAlto = mesi.slice().sort((a, b) => b.totale - a.totale)[0];
  const elAlto = document.getElementById('spese-mese-alto');
  const elAltoNome = document.getElementById('spese-mese-alto-nome');
  if (piuAlto) {
    scriviEuro(elAlto, piuAlto.totale);
    elAltoNome.textContent = piuAlto.mese.toLocaleDateString('it-IT', { month: 'long' });
  } else {
    elAlto.textContent = 'n/d';
    elAltoNome.textContent = '';
  }

  // Grafico: ultimi 12 mesi, anche quelli senza spese, cosi i buchi si vedono
  const contenitore = document.getElementById('grafico-spese-mesi');
  const info = document.getElementById('info-spese-mesi');
  if (mesi.length === 0) {
    contenitore.innerHTML = '';
    info.textContent = '';
    document.getElementById('spese-mesi').innerHTML = '';
    document.getElementById('spese-mesi-vuoto').hidden = false;
    return;
  }
  document.getElementById('spese-mesi-vuoto').hidden = true;

  const oggi = primoDelMese(new Date());
  const punti = [];
  for (let i = MESI_NEL_GRAFICO - 1; i >= 0; i--) {
    const m = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
    const voce = mesi.find(v => stessoMese(v.mese, m));
    punti.push({
      etichetta: m.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
      valore: voce ? voce.totale / 100 : 0,
      dettaglio: nomeMese(m) + ': ' + (voce ? euroTesto(voce.totale) + ' € in ' + voce.numero + ' spese' : 'niente')
    });
  }
  disegnaColonne(contenitore, info, punti, v => Math.round(v), 'Tocca una colonna per i dettagli');

  // Elenco dei mesi: un tocco apre quel mese
  const elenco = document.getElementById('spese-mesi');
  elenco.innerHTML = '';
  mesi.forEach(v => {
    const { riga } = creaRiga(nomeMese(v.mese), v.numero + (v.numero === 1 ? ' spesa' : ' spese'));
    const destra = document.createElement('span');
    destra.className = 'riga-valore';
    destra.textContent = euroTesto(v.totale) + ' €';
    riga.append(destra);
    riga.addEventListener('click', () => {
      meseVisto = v.mese;
      mostraSottoschedaSpese('mese');
      window.scrollTo(0, 0);
    });
    elenco.append(riga);
  });
}


// ---------- Mese / Tutti i mesi ----------

const sottoschedeSpese = document.querySelectorAll('.sottoscheda-spese');
let vistaSpese = 'mese';

function mostraSottoschedaSpese(nome) {
  vistaSpese = nome;
  sottoschedeSpese.forEach(b => b.classList.toggle('attiva', b.dataset.spese === nome));
  document.getElementById('spese-vista-mese').hidden = nome !== 'mese';
  document.getElementById('spese-vista-storico').hidden = nome !== 'storico';
  mostraSpese();
}

sottoschedeSpese.forEach(b => {
  b.addEventListener('click', () => mostraSottoschedaSpese(b.dataset.spese));
});

function mostraSpese() {
  const spese = leggiSpese();
  if (vistaSpese === 'mese') mostraRiepilogoMese(spese);
  else mostraStoricoSpese(spese);
}


// ---------- Modifica di una spesa ----------

const veloSpesa = document.getElementById('velo-spesa');
const modImporto = document.getElementById('mod-spesa-importo');
const modQuando = document.getElementById('mod-spesa-quando');
const modNota = document.getElementById('mod-spesa-nota');
const modEsito = document.getElementById('mod-spesa-esito');
const modCategorie = document.getElementById('mod-spesa-categorie');
let spesaInModifica = null;
let categoriaScelta = null;

creaGrigliaCategorie(modCategorie, id => {
  categoriaScelta = id;
  modCategorie.querySelectorAll('.categoria').forEach(b => {
    b.classList.toggle('scelta', b.dataset.categoria === id);
  });
});

function apriModificaSpesa(spesa) {
  spesaInModifica = spesa;
  categoriaScelta = spesa.categoria;
  modImporto.value = euroTesto(spesa.importoCent);
  modQuando.value = perCampoDataOra(spesa.quando);
  modNota.value = spesa.nota || '';
  modEsito.textContent = '';
  modCategorie.querySelectorAll('.categoria').forEach(b => {
    b.classList.toggle('scelta', b.dataset.categoria === spesa.categoria);
  });
  veloSpesa.hidden = false;
}

function chiudiModificaSpesa() {
  veloSpesa.hidden = true;
  spesaInModifica = null;
}

document.getElementById('btn-spesa-chiudi').addEventListener('click', chiudiModificaSpesa);
veloSpesa.addEventListener('click', e => { if (e.target === veloSpesa) chiudiModificaSpesa(); });

document.getElementById('form-spesa-mod').addEventListener('submit', e => {
  e.preventDefault();
  if (!spesaInModifica) return;

  const centesimi = Math.round(parseFloat(modImporto.value.replace(',', '.')) * 100);
  if (!isFinite(centesimi) || centesimi <= 0) {
    modEsito.textContent = 'Scrivi un importo valido.';
    return;
  }
  const quando = new Date(modQuando.value);
  if (isNaN(quando)) {
    modEsito.textContent = 'Scrivi una data valida.';
    return;
  }

  const spese = leggiSpese().map(s => s.id !== spesaInModifica.id ? s : {
    ...s,
    importoCent: centesimi,
    categoria: categoriaScelta,
    quando: quando.toISOString(),
    nota: modNota.value.trim(),
    daRivedere: false // controllata a mano: non serve piu il segnale
  });
  scriviJSON(CHIAVE_SPESE, spese);
  chiudiModificaSpesa();
  mostraSpese();
});

document.getElementById('btn-spesa-elimina').addEventListener('click', () => {
  if (!spesaInModifica) return;
  if (!confirm('Eliminare questa spesa?')) return;
  scriviJSON(CHIAVE_SPESE, leggiSpese().filter(s => s.id !== spesaInModifica.id));
  chiudiModificaSpesa();
  mostraSpese();
});

mostraSottoschedaSpese('mese');


// ===================================================
// Backup: esporta e importa (scheda Impostazioni)
// ===================================================

const CHIAVE_ULTIMO_BACKUP = 'ultimoBackup';
const ID_APP = 'routine-giosambo';

const elUltimoBackup = document.getElementById('ultimo-backup');
const campoFileBackup = document.getElementById('file-backup');
const esitoBackup = document.getElementById('esito-backup');

function mostraUltimoBackup() {
  const ultimo = localStorage.getItem(CHIAVE_ULTIMO_BACKUP);
  elUltimoBackup.textContent = ultimo
    ? 'Ultimo backup: ' + formattaData(ultimo) + ' alle ' + formattaOra(ultimo)
    : 'Nessun backup ancora esportato.';
}

// Esporta: crea il file e apre il foglio di condivisione di iOS
document.getElementById('btn-esporta').addEventListener('click', async () => {
  const adesso = new Date();
  const backup = {
    app: ID_APP,
    versione: 1,
    esportatoIl: adesso.toISOString(),
    dati: {
      allenamenti: leggiJSON(CHIAVE_ALLENAMENTI, []),
      svegliePreferite: leggiJSON(CHIAVE_PREFERITE, []),
      spese: leggiSpese(),
      agenda: leggiAgenda()
    }
  };
  const nomeFile = 'routine-backup-' + dataPerNomeFile(adesso) + '.json';
  const file = new File([JSON.stringify(backup, null, 2)], nomeFile, { type: 'application/json' });

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Routine' });
    } else {
      // Alternativa per i browser senza condivisione di file (es. PC): scarica il file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = nomeFile;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    localStorage.setItem(CHIAVE_ULTIMO_BACKUP, adesso.toISOString());
    esitoBackup.textContent = 'Backup esportato.';
    mostraUltimoBackup();
  } catch (errore) {
    // AbortError = hai chiuso il foglio di condivisione senza scegliere nulla
    if (errore.name !== 'AbortError') esitoBackup.textContent = 'Esportazione non riuscita.';
  }
});

// Importa: apre la scelta del file
document.getElementById('btn-importa').addEventListener('click', () => {
  campoFileBackup.click();
});

campoFileBackup.addEventListener('change', async () => {
  const file = campoFileBackup.files[0];
  campoFileBackup.value = ''; // permette di scegliere di nuovo lo stesso file
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    if (backup.app !== ID_APP || !backup.dati) throw new Error('formato non valido');

    const daBackupAll = Array.isArray(backup.dati.allenamenti) ? backup.dati.allenamenti : [];
    const daBackupPref = Array.isArray(backup.dati.svegliePreferite) ? backup.dati.svegliePreferite : [];
    const daBackupSpese = Array.isArray(backup.dati.spese) ? backup.dati.spese : [];
    const daBackupAgenda = Array.isArray(backup.dati.agenda) ? backup.dati.agenda : [];

    // Allenamenti: aggiunge solo quelli validi e non già presenti
    const allenamenti = leggiJSON(CHIAVE_ALLENAMENTI, []);
    const idAll = new Set(allenamenti.map(a => a.id));
    const nuoviAll = daBackupAll.filter(a =>
      a && a.id && typeof a.nome === 'string' && a.inizio &&
      typeof a.durataMs === 'number' && !idAll.has(a.id)
    );

    // Sveglie preferite: stesso criterio
    const preferite = leggiJSON(CHIAVE_PREFERITE, []);
    const idPref = new Set(preferite.map(p => p.id));
    const nuovePref = daBackupPref.filter(p =>
      p && p.id && typeof p.ora === 'string' && typeof p.nome === 'string' &&
      COMANDI_SVEGLIA[p.ripeti] && !idPref.has(p.id)
    );

    // Spese: stesso criterio
    const spese = leggiSpese();
    const idSpese = new Set(spese.map(s => s.id));
    const nuoveSpese = daBackupSpese.filter(s =>
      s && s.id && typeof s.importoCent === 'number' && s.quando &&
      CATEGORIA[s.categoria] && !idSpese.has(s.id)
    );

    // Agenda: stesso criterio
    const agenda = leggiAgenda();
    const idAgenda = new Set(agenda.map(v => v.id));
    const nuoveVoci = daBackupAgenda.filter(v =>
      v && v.id && typeof v.titolo === 'string' && !idAgenda.has(v.id)
    );

    if (nuoviAll.length === 0 && nuovePref.length === 0 && nuoveSpese.length === 0 && nuoveVoci.length === 0) {
      esitoBackup.textContent = 'Niente di nuovo nel backup.';
      return;
    }

    const domanda = 'Importare dal backup del ' + formattaData(backup.esportatoIl) + ': ' +
      nuoviAll.length + ' allenamenti, ' + nuovePref.length + ' sveglie preferite, ' +
      nuoveSpese.length + ' spese e ' + nuoveVoci.length + ' voci di agenda?';
    if (!confirm(domanda)) return;

    scriviJSON(CHIAVE_ALLENAMENTI, allenamenti.concat(nuoviAll));
    scriviJSON(CHIAVE_PREFERITE, preferite.concat(nuovePref));
    scriviJSON(CHIAVE_SPESE, spese.concat(nuoveSpese));
    scriviJSON(CHIAVE_AGENDA, agenda.concat(nuoveVoci));
    esitoBackup.textContent = 'Importati ' + nuoviAll.length + ' allenamenti, ' +
      nuovePref.length + ' preferite, ' + nuoveSpese.length + ' spese e ' +
      nuoveVoci.length + ' voci di agenda.';
    aggiornaPalestra();
    mostraPreferite();
    mostraSpese();
    aggiornaAgenda();
  } catch {
    esitoBackup.textContent = 'File non valido: scegli un backup di Routine (.json).';
  }
});

mostraUltimoBackup();


// ===================================================
// Casella di arrivo: le frasi dettate arrivano qui
// ===================================================
// Il Comando Rapido scrive un file JSON nella cartella "in/" di un repository
// privato su GitHub. Routine la legge all'apertura, applica e svuota.

const CHIAVE_GH_REPO = 'githubRepo';
const CHIAVE_GH_TOKEN = 'githubChiave';
const CHIAVE_ARRIVI_FATTI = 'arriviApplicati';
const CARTELLA_ARRIVI = 'in';
const PAUSA_TRA_LETTURE_MS = 30000; // evita di interrogare GitHub a ogni tocco

const campoRepo = document.getElementById('github-repo');
const campoChiaveGh = document.getElementById('github-chiave');
const statoGithub = document.getElementById('stato-github');
const esitoGithub = document.getElementById('esito-github');
const elArrivi = document.getElementById('arrivi');
const elArriviTesto = document.getElementById('arrivi-testo');

let ultimaLettura = 0;
let letturaInCorso = false;

function configurazioneGitHub() {
  const repo = (localStorage.getItem(CHIAVE_GH_REPO) || '').trim();
  const chiave = (localStorage.getItem(CHIAVE_GH_TOKEN) || '').trim();
  return repo && chiave ? { repo, chiave } : null;
}

async function chiamaGitHub(percorso, opzioni = {}) {
  const config = configurazioneGitHub();
  if (!config) throw new Error('Casella di arrivo non configurata.');

  let risposta;
  try {
    risposta = await fetch('https://api.github.com/repos/' + config.repo + percorso, {
    ...opzioni,
    headers: {
      Authorization: 'Bearer ' + config.chiave,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opzioni.body ? { 'Content-Type': 'application/json' } : {})
    }
    });
  } catch {
    throw new Error('Nessuna rete: riprova quando sei collegato.');
  }

  if (risposta.status === 404) return null; // cartella o file non ancora creati
  if (risposta.status === 401) throw new Error('Chiave non valida o scaduta.');
  if (risposta.status === 403) throw new Error('Accesso negato: controlla i permessi della chiave.');
  if (!risposta.ok) throw new Error('GitHub ha risposto ' + risposta.status + '.');
  return risposta.status === 204 ? true : risposta.json();
}

// I file arrivano in base64: vanno letti come UTF-8, altrimenti gli accenti si rompono
function daBase64(testo) {
  const binario = atob(testo.replace(/\s/g, ''));
  const byte = Uint8Array.from(binario, c => c.charCodeAt(0));
  return new TextDecoder().decode(byte);
}


// ---------- Applicazione di cio che arriva ----------

// Una spesa dettata: { tipo: 'spesa', importoEuro, categoria, nota, quando, sicuro }
function applicaSpesaArrivata(dato) {
  const centesimi = Math.round(Number(dato.importoEuro) * 100);
  if (!isFinite(centesimi) || centesimi <= 0) return null;

  const categoriaNota = CATEGORIA[dato.categoria] ? dato.categoria : 'altro';
  const quando = dato.quando && !isNaN(new Date(dato.quando)) ? new Date(dato.quando) : new Date();

  const spesa = {
    id: 'v' + Date.now().toString() + Math.floor(Math.random() * 1000),
    importoCent: centesimi,
    categoria: categoriaNota,
    nota: (dato.nota || '').toString().slice(0, 80),
    quando: quando.toISOString(),
    fonte: 'voce',
    // Se Claude non era sicuro, o ha scelto una categoria che non esiste,
    // la spesa resta segnalata invece di essere indovinata
    daRivedere: dato.sicuro === false || !CATEGORIA[dato.categoria]
  };
  scriviJSON(CHIAVE_SPESE, leggiSpese().concat(spesa));
  return 'spesa';
}

// Un impegno dettato: { tipo: 'impegno', titolo, data, ora, nota, sicuro }
function applicaImpegnoArrivato(dato) {
  const titolo = (dato.titolo || '').toString().trim();
  if (!titolo) return null;

  const data = /^\d{4}-\d{2}-\d{2}$/.test(dato.data || '') ? dato.data : null;
  const ora = /^\d{2}:\d{2}$/.test(dato.ora || '') ? dato.ora : null;

  const voce = {
    id: 'v' + Date.now().toString() + Math.floor(Math.random() * 1000),
    titolo: titolo.slice(0, 80),
    data: ora && !data ? giornoISO(new Date()) : data, // un orario senza giorno vale oggi
    ora,
    nota: (dato.nota || '').toString().slice(0, 120),
    fatto: false,
    fattoIl: null,
    fonte: 'voce',
    daRivedere: dato.sicuro === false
  };
  scriviJSON(CHIAVE_AGENDA, leggiAgenda().concat(voce));
  return 'impegno';
}

function applicaArrivo(dato) {
  if (!dato || typeof dato !== 'object') return null;
  if (dato.tipo === 'spesa') return applicaSpesaArrivata(dato);
  if (dato.tipo === 'impegno' || dato.tipo === 'agenda') return applicaImpegnoArrivato(dato);
  return null;
}


// ---------- Lettura della casella ----------

function mostraArrivi(conteggi) {
  const parti = [];
  if (conteggi.spesa) parti.push(conteggi.spesa + (conteggi.spesa === 1 ? ' spesa' : ' spese'));
  if (conteggi.impegno) parti.push(conteggi.impegno + (conteggi.impegno === 1 ? ' impegno' : ' impegni'));
  if (!parti.length) return;
  elArriviTesto.textContent = 'Arrivati dalla voce: ' + parti.join(' e ') + '.';
  elArrivi.hidden = false;
}

document.getElementById('arrivi-chiudi').addEventListener('click', () => { elArrivi.hidden = true; });

async function leggiCasella(manuale) {
  if (letturaInCorso) return;
  if (!configurazioneGitHub()) {
    if (manuale) mostraEsitoGitHub('Prima scrivi repository e chiave.', true);
    return;
  }
  if (!manuale && Date.now() - ultimaLettura < PAUSA_TRA_LETTURE_MS) return;

  letturaInCorso = true;
  if (manuale) statoGithub.textContent = 'Lettura in corso...';

  try {
    const elenco = await chiamaGitHub('/contents/' + CARTELLA_ARRIVI);
    ultimaLettura = Date.now();

    const file = Array.isArray(elenco) ? elenco.filter(f => f.type === 'file' && f.name.endsWith('.json')) : [];
    if (file.length === 0) {
      if (manuale) {
        statoGithub.textContent = '';
        mostraEsitoGitHub('Casella vuota.', false);
      }
      return;
    }

    // I nomi dei file gia applicati restano in memoria: se la cancellazione
    // non riesce, al giro dopo il dato non viene inserito due volte
    const fatti = leggiJSON(CHIAVE_ARRIVI_FATTI, []);
    const conteggi = { spesa: 0, impegno: 0 };
    let scartati = 0;

    for (const f of file) {
      if (fatti.includes(f.name)) { await eliminaDallaCasella(f); continue; }
      let esito = null;
      try {
        const contenuto = await chiamaGitHub('/contents/' + CARTELLA_ARRIVI + '/' + encodeURIComponent(f.name));
        esito = applicaArrivo(JSON.parse(daBase64(contenuto.content)));
      } catch {
        esito = null;
      }
      if (esito) {
        conteggi[esito] += 1;
        fatti.push(f.name);
      } else {
        scartati += 1;
      }
      await eliminaDallaCasella(f);
    }

    scriviJSON(CHIAVE_ARRIVI_FATTI, fatti.slice(-100));
    aggiornaAgenda();
    mostraSpese();
    mostraArrivi(conteggi);

    if (manuale) {
      statoGithub.textContent = '';
      const totale = conteggi.spesa + conteggi.impegno;
      mostraEsitoGitHub(
        totale === 0 ? 'Niente di valido nella casella.' : 'Applicati ' + totale + ' arrivi.' +
        (scartati ? ' ' + scartati + ' non letti.' : ''), false);
    }
  } catch (errore) {
    if (manuale) {
      statoGithub.textContent = '';
      mostraEsitoGitHub(errore.message, true);
    }
  } finally {
    letturaInCorso = false;
  }
}

async function eliminaDallaCasella(file) {
  try {
    await chiamaGitHub('/contents/' + CARTELLA_ARRIVI + '/' + encodeURIComponent(file.name), {
      method: 'DELETE',
      body: JSON.stringify({ message: 'Routine: arrivo applicato', sha: file.sha })
    });
  } catch {
    // Se non riesce, il file resta: al giro dopo viene riconosciuto e saltato
  }
}

function mostraEsitoGitHub(testo, errore) {
  esitoGithub.textContent = testo;
  esitoGithub.classList.toggle('esito-errore', !!errore);
}


// ---------- Impostazioni ----------

campoRepo.value = localStorage.getItem(CHIAVE_GH_REPO) || '';
campoChiaveGh.value = localStorage.getItem(CHIAVE_GH_TOKEN) || '';

document.getElementById('btn-salva-github').addEventListener('click', async () => {
  const repo = campoRepo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const chiave = campoChiaveGh.value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    mostraEsitoGitHub('Scrivi il repository come utente/nome.', true);
    return;
  }
  if (!chiave) {
    mostraEsitoGitHub('Manca la chiave di accesso.', true);
    return;
  }
  localStorage.setItem(CHIAVE_GH_REPO, repo);
  localStorage.setItem(CHIAVE_GH_TOKEN, chiave);
  campoRepo.value = repo;

  statoGithub.textContent = 'Prova in corso...';
  try {
    const info = await chiamaGitHub('');
    statoGithub.textContent = '';
    if (!info) {
      mostraEsitoGitHub('Repository non trovato: controlla il nome e che la chiave arrivi a questo repository.', true);
      return;
    }
    mostraEsitoGitHub('Collegato a ' + info.full_name + (info.private ? ' (privato).' : '. Attenzione: e pubblico.'), false);
  } catch (errore) {
    statoGithub.textContent = '';
    mostraEsitoGitHub(errore.message, true);
  }
});

document.getElementById('btn-leggi-casella').addEventListener('click', () => leggiCasella(true));

// All'apertura e ogni volta che si torna sull'app
leggiCasella(false);
leggiRiepilogo();
aggiornaMeteo();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  leggiCasella(false);
  leggiRiepilogo();
  aggiornaMeteo();
  mostraGiornata();
  mostraCitazione();
});


// Sincronizzazione automatica con Intervals.icu (dopo che tutte le schede sono pronte)
sincronizzaSeServe();

// Registra il service worker per il funzionamento offline
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});