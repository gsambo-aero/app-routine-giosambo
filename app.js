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


// ===================================================
// Navigazione tra le schede in basso
// ===================================================

const tabs = document.querySelectorAll('.tab');
const viste = document.querySelectorAll('.vista');

function mostraVista(nome) {
  viste.forEach(v => v.classList.toggle('attiva', v.id === 'vista-' + nome));
  tabs.forEach(t => t.classList.toggle('attiva', t.dataset.vista === nome));
  localStorage.setItem('ultimaVista', nome);
}

tabs.forEach(t => {
  t.addEventListener('click', () => mostraVista(t.dataset.vista));
});

mostraVista(localStorage.getItem('ultimaVista') || 'sveglia');


// ===================================================
// Sveglia
// ===================================================

// Un comando rapido per ogni tipo di ripetizione.
// I nomi devono coincidere esattamente con quelli in Comandi Rapidi.
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
const esitoSveglia = document.getElementById('sveglia-esito');
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
  elStatSettTempo.textContent = formattaDurata(tempoSettimana);
  elStatMeseNum.textContent = diMese.length;
  elStatMedia.textContent = formattaDurata(media);
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
  const scala = massimo > 0 ? massimo : 1;

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

  const etichetta = document.createElement('span');
  etichetta.className = 'etichetta';
  etichetta.textContent = 'Ultima corsa · ' + formattaData(c.inizio) + ' alle ' + formattaOra(c.inizio);

  const valore = document.createElement('div');
  valore.className = 'hero-valore';
  valore.textContent = formattaKm(c.distanzaM);
  const unita = document.createElement('span');
  unita.className = 'hero-unita';
  unita.textContent = 'km';
  valore.append(unita);

  const righe = document.createElement('div');
  righe.className = 'hero-righe';
  [
    ['Durata', formattaDurata((c.movimentoSec || c.durataSec) * 1000)],
    ['Passo', formattaPasso(passoSec(c))],
    ['FC media', valoreOnd(c.fcMedia, ' bpm')]
  ].forEach(([nome, testo]) => {
    const voce = document.createElement('span');
    voce.append(nome + ' ');
    const b = document.createElement('b');
    b.textContent = testo;
    voce.append(b);
    righe.append(voce);
  });

  elCorsaUltima.append(etichetta, valore, righe);
  elCorsaUltima.onclick = () => apriDettaglioCorsa(c);
}

// I 6 numeri del riepilogo
function mostraRiepilogoCorsa(corse) {
  const settimana = inizioSettimana();
  const mese = inizioMese();
  const diSettimana = corse.filter(c => new Date(c.inizio) >= settimana);
  const diMese = corse.filter(c => new Date(c.inizio) >= mese);

  const somma = (elenco, campo) => elenco.reduce((t, c) => t + (c[campo] || 0), 0);

  document.getElementById('stat-corsa-sett-km').textContent = formattaKm(somma(diSettimana, 'distanzaM'), 1) + ' km';
  document.getElementById('stat-corsa-sett-num').textContent = diSettimana.length;
  document.getElementById('stat-corsa-mese-km').textContent = formattaKm(somma(diMese, 'distanzaM'), 1) + ' km';
  document.getElementById('stat-corsa-mese-disl').textContent = Math.round(somma(diMese, 'dislivelloM')) + ' m';

  // Passo medio del mese: tempo totale / km totali (solo corse con passo plausibile)
  const valide = diMese.filter(passoValido);
  const km = somma(valide, 'distanzaM') / 1000;
  const tempo = valide.reduce((t, c) => t + (c.movimentoSec || c.durataSec), 0);
  document.getElementById('stat-corsa-mese-passo').textContent = km > 0 ? formattaPasso(tempo / km) : 'n/d';

  // FC media del mese, pesata sulla durata di ogni corsa
  const conFc = diMese.filter(c => c.fcMedia);
  const pesoTot = conFc.reduce((t, c) => t + (c.movimentoSec || c.durataSec), 0);
  const fc = pesoTot > 0
    ? conFc.reduce((t, c) => t + c.fcMedia * (c.movimentoSec || c.durataSec), 0) / pesoTot
    : null;
  document.getElementById('stat-corsa-mese-fc').textContent = valoreOnd(fc, ' bpm');
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
    v.textContent = testo;
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
      svegliePreferite: leggiJSON(CHIAVE_PREFERITE, [])
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

    if (nuoviAll.length === 0 && nuovePref.length === 0) {
      esitoBackup.textContent = 'Niente di nuovo nel backup.';
      return;
    }

    const domanda = 'Importare dal backup del ' + formattaData(backup.esportatoIl) + ': ' +
      nuoviAll.length + ' allenamenti e ' + nuovePref.length + ' sveglie preferite?';
    if (!confirm(domanda)) return;

    scriviJSON(CHIAVE_ALLENAMENTI, allenamenti.concat(nuoviAll));
    scriviJSON(CHIAVE_PREFERITE, preferite.concat(nuovePref));
    esitoBackup.textContent = 'Importati ' + nuoviAll.length + ' allenamenti e ' + nuovePref.length + ' preferite.';
    aggiornaPalestra();
    mostraPreferite();
  } catch {
    esitoBackup.textContent = 'File non valido: scegli un backup di Routine (.json).';
  }
});

mostraUltimoBackup();


// Sincronizzazione automatica con Intervals.icu (dopo che tutte le schede sono pronte)
sincronizzaSeServe();

// Registra il service worker per il funzionamento offline
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});