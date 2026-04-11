# Política de Segurança

## Versões Suportadas

| Versão | Suporte |
|--------|---------|
| `main` | Sim — recebe correções de segurança |

## Reportando uma Vulnerabilidade

**Por favor, NÃO abra uma issue pública para vulnerabilidades de segurança.**

Se você encontrou uma vulnerabilidade de segurança no CifrasHub, reporte de forma responsável:

1. Abra uma **Security Advisory** privada no repositório GitHub:  
   `Security` → `Advisories` → `New draft security advisory`

2. Inclua na sua descrição:
   - Tipo de vulnerabilidade (ex: XSS, SQL Injection, IDOR)
   - Passos para reproduzir
   - Impacto potencial
   - Sugestão de correção (opcional, mas bem-vinda)

3. Você receberá uma resposta em até **72 horas**.

## Escopo

São consideradas vulnerabilidades no escopo deste projeto:

- Execução remota de código
- SQL Injection ou acesso não autorizado ao banco de dados
- Bypasses de autenticação e autorização (ex: acessar dados de outro usuário)
- Cross-Site Scripting (XSS) que afete dados de usuários
- Exposição de variáveis de ambiente ou segredos

Estão **fora** do escopo:

- Ataques que requerem acesso físico ao dispositivo
- Bugs em dependências de terceiros (reporte diretamente para os mantenedores)
- Problemas em instâncias auto-hospedadas com configurações inseguras feitas pelo operador

## Reconhecimento

Contribuições de segurança responsáveis serão reconhecidas no CHANGELOG e, se desejado, no README.
