const URL_BASE_API = window.location.protocol.startsWith("http")
  ? window.location.origin
  : "http://127.0.0.1:5000";

const STATUS = {
  pendente: "Pendente",
  andamento: "Em andamento",
  concluida: "Concluída",
};

const estado = {
  atividades: [],
  temporizadorAviso: null,
  temporizadorFiltro: null,
};

const elementos = {};
const entidadesHtml = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

document.addEventListener("DOMContentLoaded", iniciar);

function iniciar() {
  const ids = {
    formulario: "activityForm",
    tituloFormulario: "formTitle",
    idAtividade: "activityId",
    titulo: "titulo",
    disciplina: "disciplina",
    dataEntrega: "dataEntrega",
    prioridade: "prioridade",
    status: "status",
    descricao: "descricao",
    botaoEnviar: "submitButton",
    botaoCancelarEdicao: "cancelEditButton",
    formularioBusca: "searchForm",
    buscaId: "searchId",
    botaoLimparBusca: "clearSearchButton",
    formularioFiltro: "filterForm",
    filtroDisciplina: "filterDisciplina",
    filtroPrioridade: "filterPrioridade",
    filtroStatus: "filterStatus",
    filtroUrgentes: "filterUrgent",
    listaCartoes: "cardsContainer",
    estadoVazio: "emptyState",
    resultado: "resultInfo",
    aviso: "toast",
    total: "totalCount",
    pendentes: "pendingCount",
    andamento: "progressCount",
    concluidas: "doneCount",
  };

  Object.entries(ids).forEach(([nome, id]) => {
    elementos[nome] = document.getElementById(id);
  });

  elementos.formulario.addEventListener("submit", salvarAtividade);
  elementos.botaoCancelarEdicao.addEventListener("click", limparFormulario);
  elementos.formularioBusca.addEventListener("submit", buscarAtividadePorId);
  elementos.botaoLimparBusca.addEventListener("click", limparBusca);
  elementos.formularioFiltro.addEventListener("submit", filtrarAtividades);
  elementos.filtroPrioridade.addEventListener("change", carregarAtividades);
  elementos.filtroStatus.addEventListener("change", carregarAtividades);
  elementos.filtroUrgentes.addEventListener("change", carregarAtividades);
  elementos.filtroDisciplina.addEventListener("input", agendarFiltroPorDisciplina);
  elementos.listaCartoes.addEventListener("click", executarAcaoDoCartao);

  carregarAtividades();
}

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_BASE_API}${caminho}`, opcoes);
  const conteudo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(conteudo.message || "A API retornou um erro.");
  }

  return conteudo;
}

async function carregarAtividades() {
  elementos.resultado.textContent = "Carregando...";

  try {
    const parametros = montarFiltros();
    const consulta = parametros.toString() ? `?${parametros}` : "";
    const dados = await requisitar(`/atividades${consulta}`);
    exibirAtividades(dados.atividades || []);
  } catch (erro) {
    exibirAtividades([]);
    elementos.resultado.textContent = "API indisponível";
    mostrarAviso(
      "Não foi possível conectar à API. Verifique se o back-end está em execução.",
      "erro",
    );
    console.error(erro);
  }
}

function montarFiltros() {
  const parametros = new URLSearchParams();
  const filtros = [
    ["disciplina", elementos.filtroDisciplina.value.trim()],
    ["prioridade", elementos.filtroPrioridade.value],
    ["status", elementos.filtroStatus.value],
  ];

  filtros.forEach(([campo, valor]) => {
    if (valor) parametros.append(campo, valor);
  });

  if (elementos.filtroUrgentes.checked) {
    parametros.append("urgente", "true");
  }

  return parametros;
}

async function salvarAtividade(evento) {
  evento.preventDefault();

  const id = elementos.idAtividade.value;
  const caminho = id ? `/atividades/${id}` : "/atividades";
  const metodo = id ? "PUT" : "POST";

  try {
    await requisitar(caminho, {
      method: metodo,
      body: new FormData(elementos.formulario),
    });

    mostrarAviso(id ? "Atividade atualizada." : "Atividade cadastrada.");
    limparFormulario();
    await carregarAtividades();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  }
}

async function buscarAtividadePorId(evento) {
  evento.preventDefault();
  const id = elementos.buscaId.value.trim();

  if (!id) {
    await carregarAtividades();
    return;
  }

  try {
    const atividade = await requisitar(`/atividades/${id}`);
    exibirAtividades([atividade], `Resultado para ID ${id}`);
  } catch (erro) {
    exibirAtividades([], "Nenhum resultado");
    mostrarAviso(erro.message, "erro");
  }
}

async function filtrarAtividades(evento) {
  evento.preventDefault();
  elementos.buscaId.value = "";
  await carregarAtividades();
}

function agendarFiltroPorDisciplina() {
  window.clearTimeout(estado.temporizadorFiltro);
  estado.temporizadorFiltro = window.setTimeout(() => {
    elementos.buscaId.value = "";
    carregarAtividades();
  }, 420);
}

async function limparBusca() {
  elementos.buscaId.value = "";
  await carregarAtividades();
}

async function executarAcaoDoCartao(evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const id = botao.dataset.id;
  const acoes = {
    editar: () => carregarAtividadeParaEdicao(id),
    excluir: () => excluirAtividade(id),
    status: () => atualizarStatus(id, botao.dataset.status),
  };

  await acoes[botao.dataset.acao]?.();
}

async function carregarAtividadeParaEdicao(id) {
  try {
    const atividade = await requisitar(`/atividades/${id}`);
    preencherFormulario(atividade);
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  }
}

function preencherFormulario(atividade) {
  elementos.idAtividade.value = atividade.id;
  elementos.titulo.value = atividade.titulo;
  elementos.disciplina.value = atividade.disciplina;
  elementos.dataEntrega.value = atividade.data_entrega;
  elementos.prioridade.value = atividade.prioridade;
  elementos.status.value = atividade.status;
  elementos.descricao.value = atividade.descricao || "";
  elementos.tituloFormulario.textContent = `Editar atividade #${atividade.id}`;
  elementos.botaoEnviar.textContent = "Atualizar atividade";
  elementos.botaoCancelarEdicao.classList.remove("hidden");
  elementos.formulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function excluirAtividade(id) {
  const atividade = estado.atividades.find((item) => String(item.id) === String(id));
  const nome = atividade ? `"${atividade.titulo}"` : "esta atividade";

  if (!window.confirm(`Excluir ${nome}?`)) return;

  try {
    await requisitar(`/atividades/${id}`, { method: "DELETE" });
    mostrarAviso("Atividade excluída.");
    limparFormulario();
    await carregarAtividades();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  }
}

async function atualizarStatus(id, status) {
  const dados = new FormData();
  dados.append("status", status);

  try {
    await requisitar(`/atividades/${id}`, { method: "PUT", body: dados });
    mostrarAviso(`Status atualizado para ${status}.`);
    await carregarAtividades();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  }
}

function limparFormulario() {
  elementos.formulario.reset();
  elementos.idAtividade.value = "";
  elementos.prioridade.value = "Média";
  elementos.status.value = STATUS.pendente;
  elementos.tituloFormulario.textContent = "Nova atividade";
  elementos.botaoEnviar.textContent = "Cadastrar atividade";
  elementos.botaoCancelarEdicao.classList.add("hidden");
}

function exibirAtividades(atividades, textoResultado) {
  estado.atividades = atividades;
  renderizarAtividades(atividades);
  atualizarResumo(atividades);
  elementos.resultado.textContent =
    textoResultado ||
    `${atividades.length} ${
      atividades.length === 1 ? "atividade encontrada" : "atividades encontradas"
    }`;
}

function renderizarAtividades(atividades) {
  elementos.listaCartoes.innerHTML = "";
  elementos.estadoVazio.classList.toggle("hidden", atividades.length > 0);

  Object.entries(agruparPorDisciplina(atividades))
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .forEach(([disciplina, itens]) => {
      const grupo = document.createElement("section");
      grupo.className = "discipline-group";
      grupo.innerHTML = `
        <div class="discipline-heading">
          <h3>${escaparHtml(disciplina)}</h3>
          <span>${itens.length} ${itens.length === 1 ? "atividade" : "atividades"}</span>
        </div>
        <div class="cards-grid">${itens.map(criarCartao).join("")}</div>
      `;
      elementos.listaCartoes.appendChild(grupo);
    });
}

function criarCartao(atividade) {
  const classePrazo = atividade.vencida
    ? "overdue"
    : atividade.proxima_do_prazo
      ? "urgent"
      : "";
  const classeTextoPrazo = atividade.vencida
    ? "overdue-text"
    : atividade.proxima_do_prazo
      ? "urgent-text"
      : "";

  return `
    <article class="activity-card priority-${normalizarClasse(atividade.prioridade)} ${classePrazo}">
      <div class="card-top">
        <div class="card-title-group">
          <span class="card-id">ID ${atividade.id}</span>
          <h3>${escaparHtml(atividade.titulo)}</h3>
        </div>
        <div class="badges">
          <span class="badge priority-badge">${escaparHtml(atividade.prioridade)}</span>
          <span class="badge ${classeStatus(atividade.status)}">
            ${escaparHtml(atividade.status)}
          </span>
        </div>
      </div>

      <p class="description">${escaparHtml(atividade.descricao || "Sem descrição.")}</p>

      <div class="due-row">
        <span class="due-date">${formatarData(atividade.data_entrega)}</span>
        <span class="due-status ${classeTextoPrazo}">
          ${textoPrazo(atividade.dias_restantes)}
        </span>
      </div>

      <div class="card-actions">
        ${botoesDeStatus(atividade)}
        <button type="button" class="quiet-button" data-acao="editar" data-id="${atividade.id}">
          Editar
        </button>
        <button type="button" class="danger-button" data-acao="excluir" data-id="${atividade.id}">
          Excluir
        </button>
      </div>
    </article>
  `;
}

function botoesDeStatus(atividade) {
  const proximosStatus = {
    [STATUS.concluida]: [[STATUS.pendente, "Reabrir"]],
    [STATUS.andamento]: [[STATUS.concluida, "Concluir"]],
    [STATUS.pendente]: [
      [STATUS.andamento, "Iniciar"],
      [STATUS.concluida, "Concluir"],
    ],
  };

  return (proximosStatus[atividade.status] || proximosStatus[STATUS.pendente])
    .map(
      ([status, texto]) => `
        <button type="button" class="quiet-button" data-acao="status" data-status="${status}" data-id="${atividade.id}">
          ${texto}
        </button>
      `,
    )
    .join("");
}

function agruparPorDisciplina(atividades) {
  return atividades.reduce((grupos, atividade) => {
    const disciplina = atividade.disciplina || "Sem disciplina";
    grupos[disciplina] = grupos[disciplina] || [];
    grupos[disciplina].push(atividade);
    return grupos;
  }, {});
}

function atualizarResumo(atividades) {
  const totais = {
    [STATUS.pendente]: 0,
    [STATUS.andamento]: 0,
    [STATUS.concluida]: 0,
  };

  atividades.forEach(({ status }) => {
    if (status in totais) totais[status] += 1;
  });

  elementos.total.textContent = atividades.length;
  elementos.pendentes.textContent = totais[STATUS.pendente];
  elementos.andamento.textContent = totais[STATUS.andamento];
  elementos.concluidas.textContent = totais[STATUS.concluida];
}

function formatarData(dataIso) {
  const partes = dataIso?.split("-");
  return partes?.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : dataIso || "Sem data";
}

function textoPrazo(diasRestantes) {
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return dias === 1 ? "Vencida há 1 dia" : `Vencida há ${dias} dias`;
  }

  if (diasRestantes === 0) return "Vence hoje";
  if (diasRestantes === 1) return "Falta 1 dia";
  return `Faltam ${diasRestantes} dias`;
}

function classeStatus(status) {
  const classes = {
    [STATUS.andamento]: "status-andamento",
    [STATUS.concluida]: "status-concluida",
    [STATUS.pendente]: "status-pendente",
  };

  return classes[status] || classes[STATUS.pendente];
}

function normalizarClasse(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function escaparHtml(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) => entidadesHtml[caractere],
  );
}

function mostrarAviso(mensagem, tipo = "sucesso") {
  window.clearTimeout(estado.temporizadorAviso);
  elementos.aviso.textContent = mensagem;
  elementos.aviso.className = `toast show ${tipo === "erro" ? "error" : ""}`;

  estado.temporizadorAviso = window.setTimeout(() => {
    elementos.aviso.className = "toast";
  }, 3200);
}
