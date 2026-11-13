// Navigazione tra le schede in basso

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