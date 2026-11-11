/**
 * @file Cliente WebSocket do canal de tempo real (/tempo-real).
 *
 * Reconecta sozinho com espera crescente (1 s, 2 s, 4 s... até 15 s) e marca
 * os indicadores "ao vivo" da tela conforme o estado da conexão.
 */

/**
 * @param {string|null} token JWT (sem token, a conexão é pública)
 * @param {(mensagem: {evento: string, dados: any, em: string}) => void} aoEvento
 * @returns {{fechar: () => void}}
 */
export function conectarTempoReal(token, aoEvento) {
  let socket;
  let tentativas = 0;
  let encerrado = false;

  const marcar = (online) => {
    document.body.dataset.tempoReal = online ? 'on' : 'off';
    document.querySelectorAll('.live').forEach((el) => el.classList.toggle('off', !online));
  };

  function abrir() {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    const consulta = token ? `?token=${encodeURIComponent(token)}` : '';
    socket = new WebSocket(`${protocolo}://${location.host}/tempo-real${consulta}`);
    socket.addEventListener('open', () => {
      tentativas = 0;
      marcar(true);
    });
    socket.addEventListener('message', (e) => {
      try {
        aoEvento(JSON.parse(e.data));
      } catch {
        /* mensagem inválida: ignorada */
      }
    });
    socket.addEventListener('close', () => {
      marcar(false);
      if (!encerrado) setTimeout(abrir, Math.min(15000, 1000 * 2 ** tentativas++));
    });
  }

  abrir();
  return {
    fechar() {
      encerrado = true;
      socket?.close();
    },
  };
}
