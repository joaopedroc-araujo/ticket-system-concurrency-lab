# 🎟️ Ticket System - Concurrency Lab

Laboratório prático de **Race Conditions** e **Controle de Concorrência** em TypeScript.

---

## 🎯 O Desafio

Imagine o seguinte cenário de produção:

> **Um show de rock esgotou. Resta exatamente 1 ingresso.**  
> **50 usuários clicam "Comprar" ao mesmo tempo.**

**O que deveria acontecer:**
- ✅ 1 usuário compra com sucesso
- ❌ 49 usuários recebem "Sold Out"

**O que acontece SEM controle de concorrência:**
- ❌ 50 usuários compram
- ❌ Banco de dados mostra 50 tickets vendidos
- ❌ Apenas 1 ingresso existia
- ❌ Sistema quebrado, clientes furiosos, problemas legais

Este laboratório simula exatamente essa situação com **delays de rede aleatórios** para forçar race conditions.

---

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/joaopedroc-araujo/ticket-system-concurrency-lab.git
cd ticket-system-concurrency-lab

# Instale as dependências
npm install

# Execute o teste
npm test
```

---

## 🚀 Como executar

```bash
# Modo desenvolvimento (com ts-node)
npm run dev

# Ou modo teste (igual ao dev)
npm test

# Ou compilar e executar
npm run build
npm start
```

---

## 📝 O que você precisa implementar

O código tem **4 métodos marcados com `TODO`** que você deve implementar:

### 1. `MockDatabase.findById(id: string)`
Buscar uma entidade pelo ID com delay simulado de rede.

**Requisitos:**
- Simular delay de rede (`this.simulateNetworkDelay()`)
- Retornar uma **cópia** do objeto (defensive copying)
- Retornar `undefined` se não encontrar

### 2. `MockDatabase.update(id: string, data: Partial<T>)`
Atualizar uma entidade existente com delay simulado.

**Requisitos:**
- Simular delay de rede
- Verificar se a entidade existe
- Atualizar no Map
- Retornar uma cópia da entidade atualizada

### 3. `MockDatabase.transaction<R>(resourceId: string, callback: TransactionCallback<R>)` ⚠️ **CRÍTICO**
Executar uma operação atômica com lock/mutex.

**Requisitos:**
- Implementar um mecanismo de lock por recurso
- Garantir que apenas uma transação por recurso execute por vez
- Liberar o lock mesmo em caso de erro

**Dica:** Use o Map `this.locks` para controlar acesso.

### 4. `TicketService.purchase(eventId: string, userId: string)`
Realizar a compra de um ingresso de forma thread-safe.

**Requisitos:**
1. Validar inputs (eventId e userId não podem ser vazios)
2. **DENTRO de uma transação** (`eventDb.transaction`):
   - Buscar o evento
   - Verificar se existe
   - Verificar se `availableTickets > 0`
   - Decrementar `availableTickets`
   - Atualizar o evento
   - Criar e inserir o ticket
3. Retornar `PurchaseResult` com sucesso ou erro

---

## 📚 Conceitos para estudar

### 🔒 Race Condition
Quando múltiplas threads/processos acessam dados compartilhados simultaneamente e o resultado depende da ordem de execução.

**No nosso caso:**
1. Thread A lê: `availableTickets = 1`
2. Thread B lê: `availableTickets = 1` (ainda não foi atualizado!)
3. Thread A decrementa: `availableTickets = 0`, salva
4. Thread B decrementa: `availableTickets = 0`, salva
5. **Resultado:** 2 tickets vendidos, mas só existia 1

### 🔐 Mutex (Mutual Exclusion)
Mecanismo que garante que apenas uma thread acesse um recurso crítico por vez.

**Como funciona:**
- Thread A tenta adquirir lock → sucesso, entra na seção crítica
- Thread B tenta adquirir lock → bloqueada, aguarda
- Thread A termina e libera o lock
- Thread B adquire o lock e entra na seção crítica

### ⚠️ TOCTOU (Time-of-Check to Time-of-Use)
Vulnerabilidade onde o estado pode mudar entre a verificação e o uso.

**Exemplo errado:**
```typescript
// ❌ ERRADO - Race condition
const event = await eventDb.findById(eventId); // CHECK
if (event.availableTickets > 0) {
  // Outro processo pode modificar aqui!
  event.availableTickets -= 1;
  await eventDb.update(eventId, event); // USE
}
```

**Exemplo correto:**
```typescript
// ✅ CORRETO - Atômico
await eventDb.transaction(eventId, async () => {
  const event = await eventDb.findById(eventId);
  if (event.availableTickets > 0) {
    event.availableTickets -= 1;
    await eventDb.update(eventId, event);
  }
});
```

### 💾 ACID (Propriedades de Transações)
- **Atomicity:** Tudo ou nada (all-or-nothing)
- **Consistency:** Estado sempre válido
- **Isolation:** Transações não interferem entre si
- **Durability:** Resultados persistem

### 🔄 Locking Strategies

**Pessimistic Locking:**
- Adquire lock ANTES de ler
- Bloqueia outras threads imediatamente
- Mais seguro, mas pode causar contenção

**Optimistic Locking:**
- Assume que conflitos são raros
- Detecta conflitos na hora de salvar (versioning)
- Mais performance, mas requer retry logic

**Compare-and-Swap (CAS):**
- Operação atômica: "se o valor ainda é X, troque por Y"
- Usado em low-level concurrency

---

## ✅ Critério de Sucesso

Quando você rodar `npm test`, deve ver:

```
═══ VEREDITO FINAL ═══

✓ ═══════════════════════════════════════════════════════════
✓   🎉 TESTE PASSOU! 
✓   
✓   ✓ Vendeu exatamente 1 ingresso(s)
✓   ✓ Rejeitou corretamente 49 tentativas
✓   ✓ Banco de dados consistente
✓   
✓   Sua implementação de concorrência está correta!
✓ ═══════════════════════════════════════════════════════════
```

Se ver mensagens de **RACE CONDITION DETECTADA** ou **OVERSELLING**, sua implementação não está thread-safe.

---

## 🐛 Depuração

**Se o teste falhar:**

1. **"Not Implemented" error:**
   - Você ainda não implementou os métodos TODO
   - Comece por `findById` e `update`, depois `transaction` e `purchase`

2. **Overselling (vendeu mais de 1 ingresso):**
   - Sua implementação de `transaction` não está funcionando
   - Verifique se está usando locks corretamente
   - Certifique-se de liberar o lock mesmo em caso de erro

3. **Teste passa às vezes e falha outras:**
   - **Pior tipo de bug!** Race condition intermitente
   - Não está usando `transaction` no método `purchase`
   - Está fazendo `findById` FORA da transação

---

## 🎓 Recursos de Estudo

- [MDN: Atomics and SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [Database Transactions Explained](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [async-mutex package](https://www.npmjs.com/package/async-mutex) (não é necessário instalar, mas pode se inspirar na implementação)
- [Mutex (Wikipedia)](https://en.wikipedia.org/wiki/Mutual_exclusion)
- [Race Condition (Wikipedia)](https://en.wikipedia.org/wiki/Race_condition)

---

## 📄 Licença

MIT

---

## 🤝 Contribuindo

Encontrou um bug? Tem uma sugestão? Abra uma issue!

---

**Boa sorte! 🚀 Que os locks estejam ao seu favor.**
