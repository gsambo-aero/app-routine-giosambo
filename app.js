// ===== Navigazione tra le schede in basso =====

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

// All'apertura mostra l'ultima scheda usata (la prima volta: Sveglia)
mostraVista(localStorage.getItem('ultimaVista') || 'sveglia');


// ===== Sveglia: invio a Comandi Rapidi =====

// Nome del comando rapido: deve coincidere esattamente con quello in Comandi Rapidi
const COMANDO_SVEGLIA = 'Routine Sveglia';

const formSveglia = document.getElementById('form-sveglia');
const campoOra = document.getElementById('sveglia-ora');
const campoNome = document.getElementById('sveglia-nome');
const esitoSveglia = document.getElementById('sveglia-esito');

formSveglia.addEventListener('submit', evento => {
  evento.preventDefault(); // evita che la pagina si ricarichi

  const ora = campoOra.value; // formato "HH:MM", es. "07:30"
  if (!ora) {
    esitoSveglia.textContent = 'Scegli un orario.';
    return;
  }

  // Il carattere | separa ora e nome, quindi non può comparire nel nome
  const nome = (campoNome.value.trim() || 'Sveglia').replaceAll('|', ' ');
  const testo = ora + '|' + nome;

  const indirizzo =
    'shortcuts://run-shortcut' +
    '?name=' + encodeURIComponent(COMANDO_SVEGLIA) +
    '&input=text' +
    '&text=' + encodeURIComponent(testo);

  esitoSveglia.textContent = 'Inviata: ' + ora + ' ' + nome;
  window.location.href = indirizzo;
});