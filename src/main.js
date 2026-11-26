
import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const app = document.querySelector('#app');

const state = {
  name: '',
  list: [],
  index: 0,
  answers: [],
  startedAt: null
};

// Embaralhamento aleatório
function shuffle(array) {
  const a = [...array];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

function shell(content) {
  app.innerHTML = `
    <header class="top">
      <div class="institutional-logos" aria-label="Logotipos institucionais">
        <img class="school-logo" src="/logos/ermentina-leal.png" alt="Escola Ermentina Leal">
        <img class="future-logo" src="/logos/escola-do-futuro.png" alt="Certificação Escola do Futuro">
        <img class="fapes-logo" src="/logos/fapes.png" alt="FAPES — Fundação de Amparo à Pesquisa e Inovação do Espírito Santo">
      </div>
      <div class="brand">
        <span class="brandmark">PJ</span>
        <div>
          <strong>PIC JÚNIOR <i>QUIZ</i></strong>
          <small>Conhecimento • Pesquisa • Ciência</small>
        </div>
      </div>
      <span class="pill">50 QUESTÕES NO BANCO</span>
    </header>

    <main>${content}</main>

    <footer>Projeto educacional • PIC Júnior e REDGIM</footer>
  `;
}

function home(error = '') {
  shell(`
    <section class="hero">
      <div class="eyebrow">DESAFIO DE CONHECIMENTO</div>

      <h1>Conhecimento que<br>
        <span>transforma ideias.</span>
      </h1>

      <p>
        Responda a 10 questões selecionadas aleatoriamente
        entre as 50 questões sobre PIC Júnior e REDGIM.
      </p>

      <div class="stats">
        <div><b>50</b><small>questões no banco</small></div>
        <div><b>5</b><small>alternativas</small></div>
        <div><b>10</b><small>por participante</small></div>
      </div>

      <div class="home-grid">
        <form id="start-form" class="panel">
        <label>Seu nome</label>
        <input name="name" maxlength="70" required
          placeholder="Digite seu nome">

        <button class="primary">
          Começar quiz <span>→</span>
        </button>

        ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}

        <p class="hint">
          ${supabase
            ? 'Sua participação será registrada no ranking público.'
            : 'Configure as credenciais do Supabase para habilitar o quiz.'}
        </p>
        </form>

        <aside class="ranking panel" aria-labelledby="ranking-title">
          <div class="ranking-head">
            <div>
              <span class="eyebrow">DESEMPENHO</span>
              <h2 id="ranking-title">Ranking</h2>
            </div>
            <span class="ranking-badge">TOP 10</span>
          </div>
          <div id="ranking-list" class="ranking-list" aria-live="polite">
            <p class="ranking-empty">Carregando pontuações...</p>
          </div>
        </aside>
      </div>

      <div class="visual">
        <div class="orb">⌬</div>
        <div class="visualtext">
          <b>INVESTIGAR</b>
          <span>OBSERVAR • ANALISAR • DESCOBRIR</span>
        </div>
        <div class="bars">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
    </section>
  `);

  document.querySelector('#start-form').addEventListener('submit', async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    state.name = String(fd.get('name')).trim();
    if (!state.name) return;

    if (!supabase) {
      return home('O site ainda não está conectado ao Supabase. Confira as variáveis de ambiente.');
    }

    const { data, error } = await supabase
      .from('public_quiz_questions')
      .select('id,question,options,image_url');

    if (error || !data || data.length !== 50) {
      return home('Não foi possível carregar as 50 questões. Confira a configuração do banco.');
    }

    // Sorteia 10 questões diferentes entre as 50
    const selectedQuestions = shuffle(data).slice(0, 10);

    // Embaralha as alternativas mantendo cada texto ligado
    // à sua chave original do banco de dados
    state.list = selectedQuestions.map(q => {
      const shuffledOptions = shuffle(Object.entries(q.options));

      return {
        ...q,
        options: shuffledOptions.map(([originalKey, text], i) => ({
          label: String.fromCharCode(65 + i),
          originalKey,
          text
        }))
      };
    });

    state.index = 0;
    state.answers = [];
    state.startedAt = new Date().toISOString();

    renderQuestion();
  });

  loadRanking();
}

async function loadRanking() {
  const container = document.querySelector('#ranking-list');
  if (!container) return;

  if (!supabase) {
    container.innerHTML = '<p class="ranking-empty">Configure o Supabase para visualizar o ranking.</p>';
    return;
  }

  const { data, error } = await supabase
    .from('public_quiz_ranking')
    .select('position,participant_name,score,total')
    .order('position', { ascending: true })
    .limit(10);

  if (error) {
    container.innerHTML = '<p class="ranking-empty">Não foi possível carregar o ranking agora.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="ranking-empty">As pontuações aparecerão após a primeira participação.</p>';
    return;
  }

  container.innerHTML = data.map(entry => {
    const score = Number(entry.score);
    const total = Number(entry.total) || 10;
    return `
      <div class="ranking-row">
        <span class="ranking-position">${escapeHtml(entry.position)}</span>
        <span class="ranking-name">${escapeHtml(entry.participant_name)}</span>
        <strong class="ranking-score">${score}/${total}</strong>
      </div>
    `;
  }).join('');
}

function renderQuestion() {
  const q = state.list[state.index];
  const pct = Math.round((state.index / 10) * 100);

  shell(`
    <div class="quizhead">
      <div>
        <span class="eyebrow">
          PARTICIPAÇÃO DE ${escapeHtml(state.name.toUpperCase())}
        </span>
        <h2>Desafio científico</h2>
      </div>

      <div class="counter">
        ${state.index + 1}<small> / 10</small>
      </div>
    </div>

    <div class="progress">
      <span style="width:${pct}%"></span>
    </div>

    <div class="qmeta">
      <span>QUESTÃO ${state.index + 1}</span>
      <span>ORDEM ALEATÓRIA</span>
    </div>

    <section class="question panel">
      <div class="qicon">✳</div>

      <h3>${escapeHtml(q.question)}</h3>

      <div class="options">
        ${q.options.map(opt => `
          <button class="option" data-answer="${opt.originalKey}">
            <b>${opt.label}</b>
            <span>${escapeHtml(opt.text)}</span>
          </button>
        `).join('')}
      </div>

      <div class="qfoot">
        <span>Selecione uma alternativa</span>
        <span>${10 - state.index - 1} restantes</span>
      </div>
    </section>
  `);

  document.querySelectorAll('[data-answer]').forEach(btn => {
    btn.addEventListener('click', () => {
      choose(btn.dataset.answer);
    });
  });
}

function choose(answer) {
  const q = state.list[state.index];

  // Envia ao banco a chave original da alternativa,
  // não a letra visual que foi embaralhada.
  state.answers.push({
    question_id: q.id,
    selected_option: answer
  });

  if (state.index < 9) {
    state.index++;
    renderQuestion();
  } else {
    finish();
  }
}

async function finish() {
  let correct = 0;
  let saved = false;
  let saveError = '';

  const { data, error } = await supabase.rpc(
    'submit_quiz_attempt',
    {
      p_name: state.name,
      p_answers: state.answers
    }
  );

  if (error) {
    saveError = 'Não foi possível salvar no banco: ' + error.message;
  } else {
    saved = true;
    correct = Number(data.score);
  }

  shell(`
    <section class="result panel">
      <div class="resulticon">✓</div>

      <span class="eyebrow">QUIZ CONCLUÍDO</span>

      <h1>Você terminou,<br>
        <span>${escapeHtml(state.name)}!</span>
      </h1>

      <div class="score">
        ${correct}<small> / 10</small>
      </div>

      <p class="scorelabel">
        respostas corretas • ${Math.round(correct / 10 * 100)}% de aproveitamento
      </p>

      <div class="resultline">
        <span>Questões respondidas</span>
        <b>10 de 10</b>
      </div>

      <div class="resultline">
        <span>Questões sem repetição</span>
        <b>Sim</b>
      </div>

      <p class="hint">
        ${saved
          ? 'Resultado registrado com sucesso.'
          : escapeHtml(saveError)}
      </p>

    </section>
  `);

}

home();
