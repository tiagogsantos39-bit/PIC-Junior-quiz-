# PIC Júnior Quiz

Quiz de 50 perguntas únicas e misturadas sobre PIC Júnior e REDGIM.

## Rodar localmente
1. Instale Node.js (versão LTS).
2. Na pasta do projeto, execute `npm install`.
3. Copie `.env.example` para `.env` e preencha URL e chave anon do Supabase.
4. Execute `npm run dev`.

É necessário configurar o Supabase para iniciar o quiz. O gabarito permanece no banco e não é enviado ao navegador.

## Configurar Supabase
1. Crie um projeto no Supabase.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Em seguida, execute `supabase/seed.sql`.
4. Em Project Settings > API, copie Project URL e anon/public key.
5. Preencha `.env` localmente. No Netlify, cadastre as mesmas variáveis em Site configuration > Environment variables.
6. Faça o deploy com build command `npm run build` e publish directory `dist`.

## Publicar
Envie a pasta para um repositório GitHub e conecte-o ao Netlify. O arquivo `netlify.toml` já contém as configurações de build.

## Regras implementadas
- Uma única sequência com 50 questões, misturadas.
- A ordem é embaralhada a cada tentativa.
- Cada questão aparece uma vez por tentativa.
- A finalização exige 10 respostas diferentes selecionadas entre as 50 questões.
- O Supabase calcula a pontuação no servidor e registra tentativa/respostas.
- O ranking público exibe as 10 maiores pontuações na tela inicial.

## Ranking
- Depois de executar o schema atualizado, o ranking usa a view `public_quiz_ranking`.
- A view expõe apenas posição, nome, pontuação e total; as tabelas internas continuam protegidas.

## Antes de divulgar
- Troque o código inicial `PIC2026` por um código forte e compartilhado somente com participantes.
- Revise o conteúdo e o gabarito das 50 questões com a equipe responsável pelo projeto.
- Configure autenticação e políticas adicionais para qualquer painel administrativo futuro.
- Não publique a service_role key no navegador. Use apenas a chave anon/public.
- A versão atual não inclui painel administrativo; os resultados ficam nas tabelas `quiz_attempts` e `quiz_answers`.
