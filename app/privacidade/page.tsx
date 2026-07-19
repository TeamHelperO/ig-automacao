export default function PrivacidadePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 prose prose-neutral">
      <h1>Política de Privacidade</h1>
      <p>
        Este aplicativo automatiza o envio de mensagens diretas (DM) no
        Instagram em resposta a comentários, respostas a stories e mensagens
        diretas que contenham palavras-chave definidas pelo administrador da
        conta conectada.
      </p>
      <h2>Quais dados são coletados</h2>
      <ul>
        <li>
          Identificador do Instagram (ID de escopo do app) e nome de usuário
          de pessoas que comentam, respondem a stories ou enviam DM para a
          conta conectada.
        </li>
        <li>Conteúdo do comentário ou mensagem recebida, para checagem de palavra-chave.</li>
        <li>Registro de horário do primeiro contato e da última resposta.</li>
      </ul>
      <h2>Para que os dados são usados</h2>
      <p>
        Exclusivamente para decidir se uma automação deve responder e para
        enviar essa resposta. Não usamos os dados para publicidade, não
        vendemos e não compartilhamos com terceiros.
      </p>
      <h2>Retenção</h2>
      <p>
        Os dados ficam armazenados enquanto a automação estiver ativa. Podem
        ser apagados a qualquer momento — veja a página de{" "}
        <a href="/exclusao-de-dados">Exclusão de Dados</a>.
      </p>
      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política podem ser enviadas para o administrador
        da conta conectada.
      </p>
    </main>
  );
}
