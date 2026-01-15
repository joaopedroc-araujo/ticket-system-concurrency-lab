/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     TICKET SYSTEM - CONCURRENCY LAB                         ║
 * ║                                                                              ║
 * ║  Objetivo: Implementar um sistema de venda de ingressos thread-safe.         ║
 * ║  Desafio: 50 usuários tentando comprar o ÚLTIMO ingresso ao mesmo tempo.    ║
 * ║                                                                              ║
 * ║  Se você rodar isso sem implementar locks... vai vender 50 ingressos        ║
 * ║  onde só existe 1. Race Condition clássica.                                  ║
 * ║                                                                              ║
 * ║  Autor: Tech Lead Exigente                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TicketEvent {
  id: string;
  name: string;
  availableTickets: number;
  price: number;
}

interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  purchasedAt: Date;
}

interface PurchaseResult {
  success: boolean;
  ticket?: Ticket;
  error?: string;
}

type TransactionCallback<T> = () => Promise<T>;

// ============================================================================
// MOCK DATABASE CLASS - A INFRAESTRUTURA
// ============================================================================

/**
 * MockDatabase - Simula um banco de dados em memória com latência de rede. 
 * 
 * ⚠️  ATENÇÃO: O delay aleatório é INTENCIONAL para causar Race Conditions. 
 *     Sem implementação adequada de locks, operações concorrentes vão
 *     ler dados stale e causar inconsistências.
 * 
 * TODO [IMPLEMENTAR]: 
 * - findById:  Buscar entidade por ID com delay simulado
 * - update: Atualizar entidade com delay simulado
 * - transaction: Simular uma transação atômica
 * 
 * 💡 DICAS DE ESTUDO:
 * - Pesquise sobre "Optimistic Locking" vs "Pessimistic Locking"
 * - Estude o conceito de "ACID" em bancos de dados
 * - Leia sobre "Compare-and-Swap (CAS)" operations
 */
class MockDatabase<T extends { id: string }> {
  private store: Map<string, T> = new Map();
  private locks: Map<string, Promise<void>> = new Map();

  constructor(initialData: T[] = []) {
    initialData.forEach(item => this.store.set(item.id, { ...item }));
  }

  /**
   * Simula latência de rede (10ms a 50ms)
   * NÃO MODIFIQUE ESTE MÉTODO - Ele é crucial para o exercício
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 40) + 10;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Gera um ID único para novas entidades
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Busca uma entidade pelo ID. 
   * 
   * TODO [IMPLEMENTAR]: 
   * 1. Simular delay de rede (usar this.simulateNetworkDelay())
   * 2. Buscar no Map e retornar uma CÓPIA do objeto (não a referência!)
   * 3. Retornar undefined se não encontrar
   * 
   * 💡 DICA: Por que retornar uma cópia?  Pesquise sobre "defensive copying"
   *    e como referências compartilhadas causam bugs em sistemas concorrentes. 
   * 
   * @param id - ID da entidade
   * @returns Promise<T | undefined>
   */
  async findById(id: string): Promise<T | undefined> {
    // ╔════════════════════════════════════════════════════════════╗
    // ║  🚧 IMPLEMENTE AQUI - Busca com delay simulado            ║
    // ╚════════════════════════════════════════════════════════════╝
    throw new Error("Not Implemented: findById");
  }

  /**
   * Atualiza uma entidade existente. 
   * 
   * TODO [IMPLEMENTAR]:
   * 1. Simular delay de rede
   * 2. Verificar se a entidade existe
   * 3. Atualizar o Map com os novos dados
   * 4. Retornar a entidade atualizada (cópia)
   * 
   * 💡 DICA: Mesmo implementando isso corretamente, sem um LOCK,
   *    duas chamadas simultâneas podem ler o mesmo valor e ambas
   *    "atualizarem" baseado em dados stale. Isso é a Race Condition. 
   * 
   * @param id - ID da entidade
   * @param data - Dados parciais para atualizar
   * @returns Promise<T>
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    // ╔════════════════════════════════════════════════════════════╗
    // ║  🚧 IMPLEMENTE AQUI - Update com delay simulado           ║
    // ╚════════════════════════════════════════════════════════════╝
    throw new Error("Not Implemented: update");
  }

  /**
   * Executa uma operação dentro de uma "transação" simulada.
   * 
   * TODO [IMPLEMENTAR]: 
   * Este é o método CRÍTICO para resolver o problema de concorrência.
   * 
   * Opções de implementação (escolha UMA e pesquise a fundo):
   * 
   * OPÇÃO A - Mutex/Lock por recurso:
   *   - Use o Map `this.locks` para controlar acesso exclusivo
   *   - Antes de executar o callback, adquira o lock para o resourceId
   *   - Após executar (ou em caso de erro), libere o lock
   *   - Pesquise: "Mutex pattern in JavaScript", "async-mutex npm"
   * 
   * OPÇÃO B - Optimistic Locking com versioning:
   *   - Adicione um campo `version` nas entidades
   *   - Na hora do update, verifique se a versão ainda é a mesma
   *   - Se mudou, lance um erro e force retry
   *   - Pesquise: "Optimistic Concurrency Control"
   * 
   * OPÇÃO C - Compare-and-Swap (CAS):
   *   - Leia o valor atual, compute o novo, tente atualizar atomicamente
   *   - Se o valor original mudou, retry
   *   - Pesquise: "CAS operation", "atomic operations"
   * 
   * 💡 CONCEITOS DE OS PARA ESTUDAR: 
   *   - Mutex (Mutual Exclusion)
   *   - Semaphores
   *   - Critical Section
   *   - Deadlock e como evitar
   *   - Starvation
   * 
   * @param resourceId - ID do recurso a ser "lockado"
   * @param callback - Função a ser executada atomicamente
   * @returns Promise<T> - Resultado do callback
   */
  async transaction<R>(resourceId: string, callback: TransactionCallback<R>): Promise<R> {
    // ╔════════════════════════════════════════════════════════════╗
    // ║  🚧 IMPLEMENTE AQUI - Lock/Mutex pattern                  ║
    // ║                                                            ║
    // ║  Sem isso, o teste VAI falhar. Múltiplas promises vão     ║
    // ║  executar o callback simultaneamente e corromper dados.   ║
    // ╚════════════════════════════════════════════════════════════╝
    throw new Error("Not Implemented: transaction");
  }

  /**
   * Insere uma nova entidade (JÁ IMPLEMENTADO - use como referência)
   */
  async insert(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    await this.simulateNetworkDelay();
    const entity = {
      ...data,
      id: data.id || this.generateId(),
    } as T;
    this.store.set(entity.id, entity);
    return { ...entity };
  }

  /**
   * Retorna todos os itens (para debug)
   */
  async findAll(): Promise<T[]> {
    await this.simulateNetworkDelay();
    return Array.from(this.store.values()).map(item => ({ ...item }));
  }
}

// ============================================================================
// TICKET SERVICE CLASS - A LÓGICA DE NEGÓCIO
// ============================================================================

/**
 * TicketService - Serviço responsável pela lógica de compra de ingressos.
 * 
 * ⚠️  ESTE É O CORAÇÃO DO PROBLEMA. 
 *     A implementação ingênua vai permitir overselling. 
 *     Você DEVE usar o método `transaction` do database para garantir atomicidade.
 * 
 * 💡 PATTERN SUGERIDO: Unit of Work
 *    Pesquise como agrupar operações relacionadas em uma única transação. 
 */
class TicketService {
  constructor(
    private eventDb: MockDatabase<TicketEvent>,
    private ticketDb: MockDatabase<Ticket>
  ) {}

  /**
   * Realiza a compra de um ingresso.
   * 
   * TODO [IMPLEMENTAR] - Siga esta ordem EXATA:
   * 
   * 1. VALIDAÇÃO DE INPUT: 
   *    - eventId não pode ser vazio/null
   *    - userId não pode ser vazio/null
   *    - Retorne PurchaseResult com success: false se inválido
   * 
   * 2. DENTRO DE UMA TRANSAÇÃO (use eventDb.transaction):
   *    
   *    2.1. Buscar o evento pelo ID
   *         - Se não existir, retornar erro
   *    
   *    2.2. Verificar disponibilidade
   *         - Se availableTickets <= 0, retornar erro "Sold Out"
   *    
   *    2.3. Decrementar o estoque
   *         - availableTickets -= 1
   *         - Atualizar o evento no banco
   *    
   *    2.4. Criar o ticket
   *         - Inserir novo Ticket no ticketDb
   *    
   *    2.5. Retornar sucesso com o ticket criado
   * 
   * ⚠️  ARMADILHA COMUM:
   *     Se você fizer findById FORA da transação, outro processo pode
   *     modificar o evento entre sua leitura e sua escrita.
   *     Isso é a "Lost Update" race condition.
   * 
   * 💡 CONCEITOS PARA ESTUDAR:
   *    - TOCTOU (Time-of-Check to Time-of-Use) vulnerability
   *    - Read-Modify-Write pattern
   *    - Atomic operations
   * 
   * @param eventId - ID do evento
   * @param userId - ID do usuário comprando
   * @returns Promise<PurchaseResult>
   */
  async purchase(eventId: string, userId: string): Promise<PurchaseResult> {
    // ╔════════════════════════════════════════════════════════════╗
    // ║  🚧 IMPLEMENTE AQUI                                       ║
    // ║                                                            ║
    // ║  Lembre-se: A implementação ERRADA (sem transação) vai    ║
    // ║  fazer o teste passar às vezes e falhar outras vezes.     ║
    // ║  Isso é o pior tipo de bug - intermitente.                 ║
    // ║                                                            ║
    // ║  A implementação CORRETA deve passar 100% das vezes.      ║
    // ╚════════════════════════════════════════════════════════════╝
    throw new Error("Not Implemented: purchase");
  }

  /**
   * Retorna estatísticas de vendas (helper para os testes)
   */
  async getEventStats(eventId: string): Promise<{ 
    event: TicketEvent | undefined; 
    ticketsSold: number 
  }> {
    const event = await this.eventDb.findById(eventId);
    const allTickets = await this.ticketDb.findAll();
    const ticketsSold = allTickets.filter(t => t.eventId === eventId).length;
    return { event, ticketsSold };
  }
}

// ============================================================================
// TEST RUNNER - O AUDITOR IMPLACÁVEL
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bold}${colors.magenta}═══ ${msg} ═══${colors.reset}\n`),
};

async function runTests(): Promise<void> {
  log.header("TICKET SYSTEM - CONCURRENCY TEST");

  const CONCURRENT_USERS = 50;
  const INITIAL_TICKETS = 1;
  const EVENT_ID = "evt-001";

  const eventDb = new MockDatabase<TicketEvent>([
    {
      id: EVENT_ID,
      name: "Concert Épico - Último Ingresso",
      availableTickets: INITIAL_TICKETS,
      price: 250.0,
    },
  ]);

  const ticketDb = new MockDatabase<Ticket>();
  const ticketService = new TicketService(eventDb, ticketDb);

  log.info(`Evento criado: "${EVENT_ID}" com ${INITIAL_TICKETS} ingresso(s)`);
  log.info(`Simulando ${CONCURRENT_USERS} usuários tentando comprar simultaneamente...`);
  log.warn("Se sua implementação não tiver locks, múltiplos usuários vão conseguir comprar.\n");

  console.log(`${colors.yellow}Iniciando corrida... ${colors.reset}`);
  const startTime = Date.now();

  const purchasePromises: Promise<PurchaseResult>[] = [];
  
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const userId = `user-${String(i).padStart(3, "0")}`;
    purchasePromises.push(
      ticketService.purchase(EVENT_ID, userId).catch((error: Error) => ({
        success: false,
        error: error.message,
      }))
    );
  }

  const results = await Promise.all(purchasePromises);
  const endTime = Date.now();

  const successfulPurchases = results.filter(r => r.success);
  const failedPurchases = results.filter(r => !r.success);
  const notImplementedErrors = results.filter(
    r => !r.success && r.error?.includes("Not Implemented")
  );

  console.log("");
  log.header("RESULTADOS");

  log.info(`Tempo total: ${endTime - startTime}ms`);
  log.info(`Compras bem-sucedidas: ${successfulPurchases.length}`);
  log.info(`Compras falharam: ${failedPurchases.length}`);

  if (notImplementedErrors.length > 0) {
    console.log("");
    log.error(`═══════════════════════════════════════════════════════════`);
    log.error(`  MÉTODOS NÃO IMPLEMENTADOS DETECTADOS! `);
    log.error(`  ${notImplementedErrors.length} chamadas retornaram "Not Implemented"`);
    log.error(`═══════════════════════════════════════════════════════════`);
    console.log("");
    log.warn("Você precisa implementar os métodos marcados com TODO.");
    log.warn("Comece pelo MockDatabase.findById, depois update, e por fim transaction.");
    log.warn("Depois implemente TicketService.purchase.\n");
    return;
  }

  const stats = await ticketService.getEventStats(EVENT_ID);
  
  console.log("");
  log.info(`Ingressos restantes no evento: ${stats.event?.availableTickets ?? "N/A"}`);
  log.info(`Tickets criados no banco: ${stats.ticketsSold}`);

  console.log("");
  log.header("VEREDITO FINAL");

  const expectedSuccess = INITIAL_TICKETS;
  const expectedFailures = CONCURRENT_USERS - INITIAL_TICKETS;

  if (successfulPurchases.length === expectedSuccess && 
      failedPurchases.length === expectedFailures &&
      stats.ticketsSold === expectedSuccess) {
    
    log.success(`═══════════════════════════════════════════════════════════`);
    log.success(`  🎉 TESTE PASSOU! `);
    log.success(`  `);
    log.success(`  ✓ Vendeu exatamente ${expectedSuccess} ingresso(s)`);
    log.success(`  ✓ Rejeitou corretamente ${expectedFailures} tentativas`);
    log.success(`  ✓ Banco de dados consistente`);
    log.success(`  `);
    log.success(`  Sua implementação de concorrência está correta!`);
    log.success(`═══════════════════════════════════════════════════════════`);
    
  } else {
    log.error(`═══════════════════════════════════════════════════════════`);
    log.error(`  ❌ TESTE FALHOU - RACE CONDITION DETECTADA!`);
    log.error(`  `);
    log.error(`  Esperado: ${expectedSuccess} venda(s), ${expectedFailures} rejeições`);
    log.error(`  Obtido:   ${successfulPurchases.length} venda(s), ${failedPurchases.length} rejeições`);
    log.error(`  Tickets no DB: ${stats.ticketsSold} (esperado: ${expectedSuccess})`);
    log.error(`  `);
    log.error(`  ⚠️  ISSO É OVERSELLING! Em produção, você teria:`);
    log.error(`     - Clientes furiosos`);
    log.error(`     - Problemas legais`);
    log.error(`     - Reputação destruída`);
    log.error(`  `);
    log.error(`  💡 Dica: Implemente o método 'transaction' no MockDatabase`);
    log.error(`     usando um padrão de Mutex/Lock.`);
    log.error(`═══════════════════════════════════════════════════════════`);

    if (successfulPurchases.length > 0 && successfulPurchases.length <= 10) {
      console.log("");
      log.warn("Usuários que conseguiram comprar:");
      successfulPurchases.forEach((p, i) => {
        log.warn(`  ${i + 1}. User: ${p.ticket?.userId} | Ticket: ${p.ticket?.id}`);
      });
    }
  }

  console.log("");
}

runTests().catch(console.error);
