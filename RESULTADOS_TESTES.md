# Testes de governança no Base44 (app "Teste Governança")

Data dos testes: 11/11/2026
Objetivo: descobrir, na prática, o que o Base44 no plano Pro consegue garantir sobre (a) quem vê quais dados e (b) quem consegue mudar o app em produção, com e sem GitHub.

## Ambiente

| Item | Valor |
|---|---|
| Plano | Base44 Pro (workspace da fazenda) |
| App | Teste Governança, criado só para os testes, sem dados reais |
| Usuário A | owner do app, conectou o GitHub |
| Usuário B | segundo email, convidado como colaborador "guest" do workspace; o Base44 o tornou admin do app automaticamente |
| Entidade de teste | `TesteRLS` (titulo, observacao, leitor_email) com RLS de leitura: `leitor_email = usuário` OU `created_by = usuário` OU `role = admin` |
| Funções | `ping` (só devolve o usuário) e `listarTodos` (lê a entidade como usuário e como service role e devolve o valor de um secret) |
| Secret | `SEGREDO_TESTE` com valor fictício |
| Proteção da main no Base44 | ligada |
| GitHub | repo `PauloCK/test-base44-governance`, modo "shared"; público durante os testes porque no GitHub Free regras de branch só valem em repo público |
| Ruleset no GitHub | `main`: exige pull request (0 aprovações), bloqueia force push e deleção, sem bypass para ninguém |

Legenda: **Bloqueado** = a plataforma recusou. **Passou** = a ação teve efeito. **Não verificado** = não testado.

## Parte 1. Sem GitHub conectado

### 1.1 Usuário final comum (Usuário B com papel `user`)

| # | Teste | Resultado |
|---|---|---|
| 1 | Listar registros da entidade | Vê só os próprios. A RLS funciona. |
| 2 | Buscar registro sigiloso pelo id via API | 404 |
| 3 | Atualizar registro de outro usuário | 403 |
| 4 | Filtrar por campos do registro sigiloso | Lista vazia |
| 5 | Chamar a função publicada `listarTodos` | **Passou.** Devolveu os títulos dos registros sigilosos, porque a função lê como service role e não confere quem chamou. |

Conclusão: a RLS segura o acesso direto, mas qualquer função que use `asServiceRole` sem checar o usuário vaza dados para qualquer pessoa logada. Isso precisa ser auditado no app real.

### 1.2 Colaborador do app (Usuário B como editor/admin, sem ser owner)

| # | Teste | Resultado |
|---|---|---|
| 6 | Ver todos os registros na aba Data do editor | **Passou.** Vê tudo, a RLS não se aplica ao editor. |
| 7 | Pedir ao chat de IA do editor para listar os registros | **Passou.** Listou tudo. |
| 8 | Criar branch, salvar função nova e rodar pelo "Test Function" sem merge | **Passou.** Leu os registros sigilosos e o valor do secret. |
| 9 | Editar schema/RLS pelo editor numa branch | Bloqueado |
| 10 | Editar direto na main protegida | Bloqueado |
| 11 | Fazer merge da própria branch na main protegida | **Passou** |
| 12 | Publicar o app | **Passou** |
| 13 | Trocar o próprio papel entre `user` e `admin` | **Passou** |

### 1.3 Agente externo (conector MCP) agindo como colaborador

| # | Teste | Resultado |
|---|---|---|
| 14 | Criar branch, editar `TesteRLS.jsonc` no sandbox e fazer merge na main protegida | **Passou.** A regra de RLS mudou em produção na hora, sem Publish. |
| 15 | O owner, pelo caminho do editor, tentar editar o schema numa branch | Bloqueado. O desvio vem do caminho do sandbox/agente, não de ser owner. |

### 1.4 Dados de teste

| # | Teste | Resultado |
|---|---|---|
| 16 | Ligar "dados de teste" | Funciona: um banco separado e vazio. Usuários são os mesmos. A escolha é por pessoa e não dá para forçar por branch. |
| 17 | Uma automação gravando no banco de teste | Não verificado |

**Conclusão da parte 1:** dentro de um mesmo app, qualquer colaborador vê todos os dados e consegue rodar código com service role e secrets. Sem GitHub, o colaborador também consegue colocar mudanças em produção pelo merge, inclusive de RLS. A proteção da main sozinha não impede isso.

## Parte 2. Com GitHub conectado e ruleset na `main`

### 2.1 Histórico e autoria

| # | Teste | Resultado |
|---|---|---|
| 18 | Ao conectar, o Base44 sobe o histórico | Sim, todo o histórico anterior foi para o repo. |
| 19 | Autor dos commits | Sempre `base44-builder[bot]`. A pessoa aparece só em `Co-authored-by`, com nome e email. As mensagens são genéricas ("External agent changes", "Manual code change"). Com o repo público, esses emails ficam expostos. |
| 20 | Branch criada no Base44 aparece no GitHub | Sim, como `b44/<id>`, e o push dela funciona normalmente (o ruleset vale só para a `main`). |

### 2.2 Tentativas de mudar produção com a proteção da main ligada (Usuário A, via conector)

| # | Teste | Resultado |
|---|---|---|
| 21 | Merge de branch com mudança na função `ping` | **Bloqueado.** "Couldn't merge this branch" (3 tentativas). Produção, último checkpoint e `main` do GitHub ficaram iguais. |
| 22 | Merge de branch com mudança de RLS | **Bloqueado.** A RLS em produção não mudou. |
| 23 | Editar a RLS numa branch, sem merge | Produção não muda. Só o merge aplica. |
| 24 | Mudar a RLS direto pela API de schemas | Bloqueado pela proteção da main do Base44 |
| 25 | Republicar função direto | Bloqueado pela proteção da main do Base44 |
| 26 | Salvar arquivo direto na main | Bloqueado pela proteção da main do Base44 |

O Base44 não mostra a causa do erro de merge. Pelo teste 27, a causa é o push recusado pelo GitHub (GH013), mas falta o teste de controle (desligar o ruleset e repetir o merge) para fechar 100%.

### 2.3 Com a proteção da main desligada (Usuário A)

| # | Teste | Resultado |
|---|---|---|
| 27 | Republicar a função `ping` direto | O GitHub recusou o push ("GH013: Changes must be made through a pull request"), **mas a função foi publicada em produção mesmo assim**. |
| 28 | Mudar a RLS pela API de schemas | **Passou.** A regra mudou em produção na hora, sem passar pelo git. |

Depois dos testes 27 e 28 tudo foi revertido e a proteção religada.

**Conclusão:** o Base44 é a fonte da verdade e o GitHub é só uma cópia. O GitHub só barra o caminho do merge, e só enquanto a proteção da main do Base44 estiver ligada. Sozinho, ele não protege a produção.

### 2.4 O que o colaborador (Usuário B) consegue fazer com GitHub + proteção

| # | Teste | Resultado |
|---|---|---|
| 29 | Desligar a proteção da main | **Bloqueado.** "Only the app owner or a workspace admin can change main branch protection." |
| 30 | Desconectar o GitHub | **Bloqueado.** "Only the app owner or the user who connected GitHub can disconnect." |
| 31 | Fazer merge de branch na main | Bloqueado (mesmo erro do teste 21) |
| 32 | Restaurar um checkpoint antigo na main | Bloqueado pela proteção da main |
| 33 | Forçar push manual para o GitHub | A chamada é aceita, mas o GitHub recusa (GH013). Sem efeito. |
| 34 | Desligar o sync automático do GitHub | **Passou.** Isso só impede que mudanças aprovadas no GitHub entrem no app. Não serve para colocar mudança em produção, mas pode travar o fluxo. Religado logo depois. |
| 35 | Sobrescrever o valor de um secret | **Passou.** Vale na hora para as funções em produção e não passa pelo git. Revertido. |
| 36 | Publicar uma versão antiga (checkpoint) | **Passou.** Trocou o front publicado. Funções e RLS não mudaram. Revertido pelo owner. |
| 37 | Apagar uma branch criada pelo owner | **Passou** (ver nota abaixo) |

Nota sobre o teste 37: foi um erro meu. A chamada de apagar a branch foi junto, sem querer, no mesmo script do teste 30. A branch apagada (`teste-github-1`) já tinha sido incorporada à `main` do GitHub pelo PR #1, então nada se perdeu. Mesmo assim, o resultado vale: um colaborador consegue apagar branch de outra pessoa.

### 2.5 O fluxo "correto" (PR no GitHub e pull no Base44)

| # | Teste | Resultado |
|---|---|---|
| 38 | Merge do PR #1 no GitHub (com as mudanças de `ping` e da RLS) | Feito no GitHub |
| 39 | O Base44 puxa sozinho | Não puxou. Pela documentação, o sync automático só roda com alguém com o app aberto no editor. |
| 40 | Pull manual pela API | **Falhou ("sandbox_sync_failed").** O git local do Base44 tinha commits que não subiram: o merge que "falhou" no teste 21 e as republicações do teste 27. Para incorporar o PR, o Base44 cria um merge commit e tenta empurrar para a `main`, e o ruleset recusa. Resultado: o sync travou e a produção não recebeu o PR. |

Um merge recusado pelo GitHub não some: ele fica no git local do Base44. Os testes 41 a 53 investigam isso.

### 2.6 Destravando o sync

| # | Teste | Resultado |
|---|---|---|
| 41 | Desligar o ruleset pela API do GitHub para destravar | Não deu: a sessão do Claude não tem permissão de alterar rulesets. |
| 42 | Recuperar sem mexer no ruleset | Deu certo, mas deu trabalho. O owner desligou a proteção da main do Base44 por alguns segundos, porque só assim os comandos de leitura do git rodam na sandbox da main. O `push` e o `bundle` pela sandbox são bloqueados. Os objetos git presos foram lidos um a um, recriados com os mesmos hashes fora do Base44 e enviados para uma branch no GitHub. Depois veio um PR (#2) para a `main` e a proteção foi religada. Com isso o pull do Base44 passou a ser só avançar, sem push. |
| 43 | PR #2 mergeado sem aprovação | **Passou.** Com "0 aprovações", quem tem escrita no repo faz merge do próprio PR. O Claude fez isso. |
| 44 | Sync depois do PR #2 | Destravou sozinho pelo webhook. A RLS do PR #1, que estava parada, entrou em produção **sem Publish**. |

### 2.7 Fluxo de PR a partir de um estado limpo

| # | Teste | Resultado |
|---|---|---|
| 45 | PR #3 feito só no GitHub, mudando a RLS da `TesteRLS` e o código da função `ping` | Mergeado no GitHub |
| 46 | O Base44 puxa sozinho | **Sim.** Em menos de 1 minuto, pelo webhook, sem chamada manual. Na hora a única aba aberta do Base44 era a página inicial do segundo usuário, não o editor do app. Não sei se isso conta como "app aberto no editor". |
| 47 | A RLS do PR vale em produção sem Publish | **Sim** |
| 48 | A função do PR é republicada sem Publish | **Sim**, com um novo deployment |
| 49 | Front | Fica pendente de Publish. Os checkpoints criados pelo sync do GitHub aparecem como "não publicados" até alguém publicar (ver teste 67). |

### 2.8 Reincidência: um merge barrado volta a travar?

| # | Teste | Resultado |
|---|---|---|
| 50 | Owner faz merge de branch no Base44 (ping = "reincidencia") | Bloqueado, mesmo erro do teste 21 |
| 51 | Depois disso, um PR inofensivo no GitHub (só um comentário no README, PR #4) | O sync **travou de novo** ("sandbox_sync_failed"). Basta um clique em "Merge" barrado para parar o fluxo. |
| 52 | O que ficou preso no git do Base44 | O merge barrado inteiro, com o código "reincidencia". Na recuperação no estilo do teste 42, esse código **entraria em produção sem ninguém ter aprovado**. Para evitar isso, a recuperação (PR #5) incluiu um commit desfazendo o conteúdo. |
| 53 | Produção durante o travamento | Ficou intacta (a `ping` continuou "pr-limpo"). O risco é o fluxo parar e o conteúdo barrado entrar na recuperação, não a produção mudar sozinha. |

**Conclusão das partes 2.5 a 2.8:** o fluxo por PR funciona quando o Base44 e o repo estão em sincronia: RLS e funções entram sozinhos em produção, sem Publish. Mas basta qualquer colaborador (ou agente) clicar "Merge" no Base44 para o fluxo travar. A recuperação exige o owner, alguém com escrita no GitHub e manipulação de git em baixo nível, e precisa de cuidado para não deixar entrar o código que tinha sido barrado.

### 2.9 Branch privada

| # | Teste | Resultado |
|---|---|---|
| 54 | Owner cria branch privada; o colaborador lista as branches | A branch privada não aparece para ele |
| 55 | Colaborador busca a branch privada pelo id | 404 |
| 56 | Colaborador tenta apagar a branch privada pelo id | 404, não apagou |
| 57 | A branch privada no GitHub | Aparece normalmente como `b44/<id>` para quem tem acesso ao repo (e para qualquer pessoa, enquanto o repo for público). "Privada" vale só dentro do Base44. |
| 58 | Ruleset protegendo `b44/*` contra deleção | Depende do dono do repo: a sessão do Claude não tem permissão de criar rulesets. |

### 2.10 Dados, workflows e conectores (colaborador, com GitHub + proteção da main)

| # | Teste | Resultado |
|---|---|---|
| 59 | Ver todos os registros na aba Data, inclusive os sigilosos | **Passou** (igual ao teste 6) |
| 60 | Editar pela aba Data um registro criado pelo owner (a RLS de update só deixa o criador) | **Passou.** A aba Data ignora a RLS também na escrita. Revertido. |
| 61 | Apagar pela aba Data um registro criado pelo owner | **Passou.** Foi para a lixeira e foi restaurado pelo owner. |
| 62 | Criar workflow | Bloqueado pela proteção da main |
| 63 | Pausar/ativar, editar ou arquivar workflow existente | Bloqueado pela proteção da main |
| 64 | Rodar um workflow existente na hora ("run now") | **Passou.** Não muda o workflow, mas dispara a lógica dele fora do horário (na Mandaguari, por exemplo, gravar no Gestão). |
| 65 | Conectar, desconectar ou remover conector | Bloqueado pela proteção da main. A recusa vem antes de qualquer outra checagem, inclusive para conector que nem existe. |
| 66 | Workflow criado por PR (arquivo em `base44/workflows/`, mesmo formato dos da Mandaguari) | **Não é criado**, nem depois do pull nem com Publish. Workflow criado pela API também não gera arquivo no repo. Workflows ficam fora do git: só o owner muda, desligando a proteção da main por um momento. |

### 2.11 Publicação e autoria do que vem do GitHub

| # | Teste | Resultado |
|---|---|---|
| 67 | O front de um PR vai ao ar sozinho? | **Não.** Os checkpoints criados pelo sync (PRs #2, #3, #5 e #6) ficaram com "last_deployed_at" vazio. Só o do PR #7 foi publicado, quando o owner chamou o Publish. |
| 68 | Autoria do checkpoint criado pelo sync | Sempre a conta que conectou o GitHub (o owner), seja quem for que fez o merge do PR. O histórico do Base44 não mostra quem aprovou; isso fica só no GitHub. |

**Conclusão:** com GitHub + proteção da main, o colaborador não mexe em workflows nem em conectores. Mas lê, edita e apaga qualquer dado pela aba Data, passando por cima da RLS, e consegue disparar workflows existentes.

## Resumo

| Pergunta | Resposta pelos testes |
|---|---|
| A RLS protege o usuário final? | Sim, no acesso direto. Não protege contra funções com service role sem checagem (teste 5). |
| Dá para esconder dados de RH de um colaborador no mesmo app? | Não. O colaborador vê tudo pela aba Data, pelo chat de IA e por funções em branch (testes 6 a 8). |
| A proteção da main do Base44 sozinha impede mudança em produção? | Não. Merge feito por agente passa por cima (teste 14). |
| O GitHub sozinho impede? | Não. Se a proteção do Base44 estiver desligada, a produção muda mesmo com o push recusado (testes 27 e 28). |
| GitHub + proteção da main impedem um colaborador de mudar código e RLS? | Nos caminhos testados, sim (21 a 26, 29 a 33). O colaborador não consegue desligar nenhuma das duas proteções. |
| O que continua fora do controle do GitHub? | Secrets (35), publicação de versão antiga do front (36), apagar branches não privadas (37), desligar o sync (34), ler, editar e apagar qualquer dado pela aba Data (59 a 61), disparar workflow existente (64). Workflows e conectores ficam travados pela proteção da main (62, 63, 65). |
| O fluxo por PR funciona? | Sim, quando Base44 e repo estão em sincronia: RLS e funções entram sozinhos, sem Publish (45 a 48). |
| A RLS protege os dados contra colaboradores? | Não, nem uma RLS que proíbe todo mundo (69 e 70). Um workflow de evento registra o que mudou, mas não quem mudou (71). |
| Workflows podem ser gerenciados pelo git? | Sim, com um Action que chama a API (74 a 77), desde que o arquivo esteja no formato exato do Base44 (78). |
| O fluxo por PR é utilizável no dia a dia? | É frágil. Um único "Merge" barrado no Base44 trava o sync (50 e 51), e qualquer mudança que o owner fizer direto no Base44 com a main desprotegida também (72 e 73). A recuperação é trabalhosa, exige o owner e, se feita sem cuidado, coloca em produção o código barrado (52). Na prática, quem tem acesso de editor precisa ser treinado para nunca clicar "Merge" no Base44. Não há como desligar esse botão. |
| Branch privada resolve o "apagar branch alheia"? | Dentro do Base44, sim (54 a 56). No GitHub, ela continua visível (57). |

## Pendências

Precisam do dono do repo (a sessão do Claude não pode alterar rulesets):

1. Teste de controle: com o ruleset desligado, o merge pelo Base44 passa? Isso confirma que o erro do teste 21 vem do GitHub.
2. Ruleset em `b44/*` contra deleção, e se o Base44 continua funcionando com ele.
3. Voltar este repo para privado ao final, por causa dos emails nos commits.

Fora do alcance deste ambiente: o comportamento de "Workspace admin" (só nos planos Business) e de um repo de organização no GitHub Team com exigência de 1 aprovação.

## Estado do app ao final

RLS da `TesteRLS` igual à original. Registros iguais aos originais. Função `ping` com `versao: 'pr-limpo'` (vinda do PR #3). Secret com o valor fictício original. Todos os workflows de teste arquivados, nenhum arquivo de workflow no repo. Ficaram a entidade `AuditoriaLog` e a função `auditarMudanca` (teste 71). Proteção da main ligada, sync automático ligado, Base44 e repo em sincronia. Ficaram abertas no Base44 as branches `destravar-sync`, `reincidencia` (não mergeada) e `privada-owner`.
