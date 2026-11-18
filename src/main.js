
import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const app = document.querySelector('#app');
const state = { name:'', code:'', list:[], index:0, answers:[], startedAt:null };
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function shell(content) {
  app.innerHTML = `<header class="top"><div class="brand"><span class="brandmark">PJ</span><div><strong>PIC JÚNIOR <i>QUIZ</i></strong><small>Conhecimento • Pesquisa • Ciência</small></div></div><span class="pill">50 QUESTÕES</span></header><main>${content}</main><footer>Projeto educacional • PIC Júnior e REDGIM</footer>`;
}
function home(error='') {
  shell(`<section class="hero"><div class="eyebrow">DESAFIO DE CONHECIMENTO</div><h1>Conhecimento que<br><span>transforma ideias.</span></h1><p>Responda a 50 questões sobre iniciação científica e o projeto REDGIM. Os assuntos aparecem misturados em uma única sequência.</p>
  <div class="stats"><div><b>50</b><small>questões únicas</small></div><div><b>4</b><small>alternativas</small></div><div><b>1</b><small>único desafio</small></div></div>
  <form id="start-form" class="panel"><label>Seu nome</label><input name="name" maxlength="70" required placeholder="Digite seu nome"><label>Código de acesso</label><input name="code" maxlength="40" required placeholder="Informe o código"><button class="primary">Começar quiz <span>→</span></button>${error?`<p class="error">${escapeHtml(error)}</p>`:''}<p class="hint">${supabase?'Seus dados serão usados para registrar sua participação.':'Configure as credenciais do Supabase para habilitar o quiz.'}</p></form>
  <div class="visual"><div class="orb">⌬</div><div class="visualtext"><b>INVESTIGAR</b><span>OBSERVAR • ANALISAR • DESCOBRIR</span></div><div class="bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></section>`);
  document.querySelector('#start-form').addEventListener('submit', async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    state.name = String(fd.get('name')).trim(); state.code = String(fd.get('code')).trim();
    if (!state.name || !state.code) return;
    if (!supabase) return home('O site ainda não está conectado ao Supabase. Configure as variáveis de ambiente conforme o README.');
    const {data:valid,error:codeError} = await supabase.rpc('verify_quiz_code',{p_code:state.code});
    if (codeError || valid !== true) return home('Código inválido ou indisponível. Confira com a organização.');
    const {data,error} = await supabase.from('public_quiz_questions').select('id,question,options,image_url');
    if (error || !data || data.length !== 50) return home('Não foi possível carregar as 50 questões. Confira a configuração do banco.');
    state.list = shuffle(data.map(q => ({...q, options:q.options})));
    state.index=0; state.answers=[]; state.startedAt=new Date().toISOString(); renderQuestion();
  });
}
function renderQuestion() {
  const q=state.list[state.index], pct=Math.round(state.index/state.list.length*100);
  shell(`<div class="quizhead"><div><span class="eyebrow">PARTICIPAÇÃO DE ${escapeHtml(state.name.toUpperCase())}</span><h2>Desafio científico</h2></div><div class="counter">${state.index+1}<small> / 50</small></div></div>
  <div class="progress"><span style="width:${pct}%"></span></div><div class="qmeta"><span>QUESTÃO ${state.index+1}</span><span>ORDEM ALEATÓRIA</span></div>
  <section class="question panel"><div class="qicon">✳</div><h3>${escapeHtml(q.question)}</h3><div class="options">${Object.entries(q.options).map(([k,v])=>`<button class="option" data-answer="${k}"><b>${k}</b><span>${escapeHtml(v)}</span></button>`).join('')}</div><div class="qfoot"><span>Selecione uma alternativa</span><span>${50-state.index-1} restantes</span></div></section>`);
  document.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.answer)));
}
function choose(answer) {
  const q=state.list[state.index];
  state.answers.push({question_id:q.id,selected_option:answer});
  if(state.index<49){state.index++;renderQuestion();} else finish();
}
async function finish() {
  let correct = 0, saved=false, saveError='';
  const {data,error}=await supabase.rpc('submit_quiz_attempt',{p_name:state.name,p_code:state.code,p_answers:state.answers});
  if(error) saveError='Não foi possível salvar no banco: '+error.message;
  else { saved=true; correct = Number(data.score); }
  shell(`<section class="result panel"><div class="resulticon">✓</div><span class="eyebrow">QUIZ CONCLUÍDO</span><h1>Você terminou,<br><span>${escapeHtml(state.name)}!</span></h1><div class="score">${correct}<small> / 50</small></div><p class="scorelabel">respostas corretas • ${Math.round(correct/50*100)}% de aproveitamento</p><div class="resultline"><span>Questões respondidas</span><b>50 de 50</b></div><div class="resultline"><span>Questões sem repetição</span><b>Sim</b></div><p class="hint">${saved?'Resultado registrado com sucesso.':escapeHtml(saveError)}</p><button class="primary" id="again">Fazer nova tentativa</button></section>`);
  document.querySelector('#again').addEventListener('click',()=>{state.index=0;state.answers=[];home();});
}
home();
