/* =========================================================
   JAVASCRIPT — Meu Dinheiro (V1)
   ========================================================= */

// ---------- Estado da aplicação ----------
const estado = {
  transacoes: [] // { id, descricao, valor, tipo: 'ganho'|'gasto', categoria, data }
};

let proximoId = 1;

function gerarId() {
  return proximoId++;
}

// ---------- Persistência (localStorage) ----------
const CHAVE_ARMAZENAMENTO = 'meuDinheiro.transacoes';

function salvarDados() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado.transacoes));
    return true;
  } catch (erro) {
    console.error('Não foi possível salvar os dados no localStorage:', erro);
    mostrarAvisoArmazenamento();
    return false;
  }
}

// Testa, sem afetar os dados reais, se o localStorage está de fato disponível
// (pode estar bloqueado em modo de navegação privada em alguns navegadores,
// com a quota esgotada, ou desabilitado pelo usuário)
function localStorageDisponivel() {
  try {
    const chaveTeste = '__meuDinheiro_teste__';
    localStorage.setItem(chaveTeste, '1');
    localStorage.removeItem(chaveTeste);
    return true;
  } catch (erro) {
    return false;
  }
}

function mostrarAvisoArmazenamento() {
  if (dom.avisoArmazenamento) {
    dom.avisoArmazenamento.classList.add('visivel');
  }
}

function carregarDados() {
  try {
    const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!dadosSalvos) return;

    const transacoes = JSON.parse(dadosSalvos);
    if (!Array.isArray(transacoes)) return;

    let maiorId = 0;

    estado.transacoes = transacoes
      .map(item => {
        if (!item || typeof item !== 'object') return null;

        // Aceita valor numérico ou string numérica (ex.: "150"); descarta o resto
        const valorConvertido = typeof item.valor === 'number' ? item.valor : Number(item.valor);

        return {
          id: typeof item.id === 'number' ? item.id : null,
          descricao: typeof item.descricao === 'string' ? item.descricao.trim() : '',
          valor: valorConvertido,
          tipo: item.tipo,
          categoria: typeof item.categoria === 'string' && item.categoria.trim() !== '' ? item.categoria : 'Outros',
          data: typeof item.data === 'string' ? item.data : ''
        };
      })
      // Só entram transações realmente válidas: mesma regra usada ao adicionar
      // (descrição preenchida, valor finito e maior que zero, tipo reconhecido)
      .filter(item =>
        item !== null &&
        item.descricao.length > 0 &&
        Number.isFinite(item.valor) &&
        item.valor > 0 &&
        (item.tipo === 'ganho' || item.tipo === 'gasto')
      )
      .map(item => {
        if (item.id === null) item.id = gerarId();
        if (item.id > maiorId) maiorId = item.id;
        return item;
      });

    proximoId = maiorId + 1;
  } catch (erro) {
    console.error('Não foi possível carregar os dados do localStorage:', erro);
  }
}

// ---------- Referências do DOM ----------
const dom = {
  form: document.getElementById('formTransacao'),
  descricao: document.getElementById('descricao'),
  valor: document.getElementById('valor'),
  data: document.getElementById('data'),
  categoria: document.getElementById('categoria'),
  tipoGanho: document.getElementById('tipoGanho'),
  tipoGasto: document.getElementById('tipoGasto'),
  erro: document.getElementById('erroFormulario'),

  historico: document.getElementById('historico'),

  avisoArmazenamento: document.getElementById('avisoArmazenamento'),

  valorSaldo: document.getElementById('valorSaldo'),
  valorGanhos: document.getElementById('valorGanhos'),
  valorGastos: document.getElementById('valorGastos')
};

// ---------- Utilitários de data ----------
function obterDataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarData(dataISO) {
  if (!dataISO || typeof dataISO !== 'string') return 'Sem data';
  const partes = dataISO.split('-');
  if (partes.length !== 3) return 'Sem data';
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

// ---------- Formatação em BRL ----------
function formatarBRL(numero) {
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// ---------- Validação ----------
function transacaoValida(descricao, valorTexto) {
  const descricaoValida = descricao.trim().length > 0;
  const valorNumero = parseFloat(valorTexto);
  const valorValido = valorTexto.trim() !== '' && !isNaN(valorNumero) && valorNumero > 0;
  return descricaoValida && valorValido;
}

// ---------- Adicionar transação ----------
function adicionarTransacao(evento) {
  evento.preventDefault();

  const descricao = dom.descricao.value;
  const valorTexto = dom.valor.value;
  const data = dom.data.value || obterDataAtualISO();
  const categoria = dom.categoria.value;
  const tipo = dom.tipoGasto.checked ? 'gasto' : 'ganho';

  if (!transacaoValida(descricao, valorTexto)) {
    dom.erro.classList.add('visivel');
    return;
  }
  dom.erro.classList.remove('visivel');

  estado.transacoes.push({
    id: gerarId(),
    descricao: descricao.trim(),
    valor: parseFloat(valorTexto),
    tipo: tipo,
    categoria: categoria,
    data: data
  });

  dom.descricao.value = '';
  dom.valor.value = '';
  dom.data.value = obterDataAtualISO();
  dom.categoria.selectedIndex = 0;
  dom.tipoGanho.checked = true;
  dom.descricao.focus();

  salvarDados();
  atualizarInterface();
}

// ---------- Excluir transação ----------
function excluirTransacao(id) {
  const confirmar = window.confirm('Deseja excluir esta transação?');
  if (!confirmar) return;

  estado.transacoes = estado.transacoes.filter(item => item.id !== id);

  salvarDados();
  atualizarInterface();
}

// ---------- Cálculos ----------
function calcularTotalGanhos() {
  return estado.transacoes
    .filter(item => item.tipo === 'ganho')
    .reduce((soma, item) => soma + item.valor, 0);
}

function calcularTotalGastos() {
  return estado.transacoes
    .filter(item => item.tipo === 'gasto')
    .reduce((soma, item) => soma + item.valor, 0);
}

function calcularSaldo() {
  return calcularTotalGanhos() - calcularTotalGastos();
}

// ---------- Ordenação (mais recentes primeiro) ----------
function ordenarTransacoes(lista) {
  return [...lista].sort((a, b) => {
    if (a.data !== b.data) {
      return a.data > b.data ? -1 : 1;
    }
    return b.id - a.id;
  });
}

// ---------- Renderização do histórico ----------
function renderizarHistorico() {
  dom.historico.innerHTML = '';

  const ordenadas = ordenarTransacoes(estado.transacoes);

  ordenadas.forEach(item => {
    const li = document.createElement('li');
    li.className = 'transacao ' + item.tipo;

    const icone = document.createElement('span');
    icone.className = 'transacao-icone';
    icone.textContent = item.tipo === 'ganho' ? '+' : '−';

    const corpo = document.createElement('div');
    corpo.className = 'transacao-corpo';

    const descricaoSpan = document.createElement('span');
    descricaoSpan.className = 'transacao-descricao';
    descricaoSpan.textContent = item.descricao;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'transacao-meta';
    metaSpan.textContent = item.categoria + ' • ' + formatarData(item.data);

    corpo.appendChild(descricaoSpan);
    corpo.appendChild(metaSpan);

    const valorSpan = document.createElement('span');
    valorSpan.className = 'transacao-valor';
    valorSpan.textContent = formatarBRL(item.valor);

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'botao-excluir';
    btnExcluir.textContent = '✕';
    btnExcluir.setAttribute('aria-label', 'Excluir transação');
    btnExcluir.addEventListener('click', () => excluirTransacao(item.id));

    li.appendChild(icone);
    li.appendChild(corpo);
    li.appendChild(valorSpan);
    li.appendChild(btnExcluir);

    dom.historico.appendChild(li);
  });
}

// ---------- Atualizar interface (totais + histórico) ----------
function atualizarInterface() {
  const totalGanhos = calcularTotalGanhos();
  const totalGastos = calcularTotalGastos();
  const saldo = calcularSaldo();

  dom.valorGanhos.textContent = formatarBRL(totalGanhos);
  dom.valorGastos.textContent = formatarBRL(totalGastos);
  dom.valorSaldo.textContent = formatarBRL(saldo);

  dom.valorSaldo.classList.toggle('negativo', saldo < 0);

  renderizarHistorico();
}

// ---------- Eventos ----------
dom.form.addEventListener('submit', adicionarTransacao);

// ---------- Inicialização ----------
dom.data.value = obterDataAtualISO();

if (!localStorageDisponivel()) {
  mostrarAvisoArmazenamento();
}

carregarDados();
atualizarInterface();
