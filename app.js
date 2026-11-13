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

// "2026-11-13" (data locale, per i nomi dei file)
function dataPerNomeFile(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const gg = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + gg;
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

// Nome del comando rapido: deve coincidere esattamente con quello in Comandi Rapidi
const COMANDO_SVEGLIA = 'Routine Sveglia';

const formSveglia = document.getElementById('form-sveglia');
const campoOra = document.getElementById('sveglia-ora');
const campoNomeSveglia = document.getElementById('sveglia-nome');
const esitoSveglia = document.getElementById('sveglia-esito');

formSveglia.addEventListener('submit', evento => {
  evento.preventDefault(); // evita che la pagina si ricarichi

  const ora = campoOra.value; // formato "HH:MM"
  if (!ora) {
    esitoSveglia.textContent = 'Scegli un orario.';
    return;
  }

  // Il carattere | separa ora e nome, quindi non può comparire nel nome
  const nome = (campoNomeSveglia.value.trim() || 'Sveglia').replaceAll('|', ' ');

  esitoSveglia.textContent = 'Inviata: ' + ora + ' ' + nome;
  apriComando(COMANDO_SVEGLIA, ora + '|' + nome);
});


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
    const riga = document.createElement('li');
    riga.className = 'riga';

    const sinistra = document.createElement('div');
    const titolo = document.createElement('div');
    titolo.className = 'riga-titolo';
    titolo.textContent = a.nome;
    const sotto = document.createElement('div');
    sotto.className = 'riga-sotto';
    sotto.textContent = formattaData(a.inizio) + ' · ' + formattaOra(a.inizio);
    sinistra.append(titolo, sotto);

    if (a.nota) {
      const nota = document.createElement('div');
      nota.className = 'riga-nota';
      nota.textContent = a.nota;
      sinistra.append(nota);
    }

    const destra = document.createElement('div');
    destra.className = 'riga-valore';
    destra.textContent = formattaDurata(a.durataMs);

    riga.append(sinistra, destra);

    // Tocco sulla riga: chiede conferma ed elimina
    riga.addEventListener('click', () => eliminaAllenamento(a));

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

function eliminaAllenamento(allenamento) {
  const descrizione = '"' + allenamento.nome + '" del ' + formattaData(allenamento.inizio);
  if (!confirm('Eliminare ' + descrizione + '?')) return;

  const rimanenti = leggiJSON(CHIAVE_ALLENAMENTI, []).filter(a => a.id !== allenamento.id);
  scriviJSON(CHIAVE_ALLENAMENTI, rimanenti);
  aggiornaPalestra();
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

aggiornaPalestra();


// ===================================================
// Backup: esporta e importa
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
      allenamenti: leggiJSON(CHIAVE_ALLENAMENTI, [])
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
    if (backup.app !== ID_APP || !backup.dati || !Array.isArray(backup.dati.allenamenti)) {
      throw new Error('formato non valido');
    }

    // Aggiunge solo gli allenamenti validi che non sono già presenti
    const attuali = leggiJSON(CHIAVE_ALLENAMENTI, []);
    const idPresenti = new Set(attuali.map(a => a.id));
    const nuovi = backup.dati.allenamenti.filter(a =>
      a && a.id && typeof a.nome === 'string' && a.inizio &&
      typeof a.durataMs === 'number' && !idPresenti.has(a.id)
    );

    if (nuovi.length === 0) {
      esitoBackup.textContent = 'Nessun allenamento nuovo nel backup.';
      return;
    }
    if (!confirm('Importare ' + nuovi.length + ' allenamenti dal backup del ' + formattaData(backup.esportatoIl) + '?')) {
      return;
    }

    scriviJSON(CHIAVE_ALLENAMENTI, attuali.concat(nuovi));
    esitoBackup.textContent = 'Importati ' + nuovi.length + ' allenamenti.';
    aggiornaPalestra();
  } catch {
    esitoBackup.textContent = 'File non valido: scegli un backup di Routine (.json).';
  }
});

mostraUltimoBackup();


// Registra il service worker per il funzionamento offline
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});