import * as net from "net";
import * as tls from "tls";

export interface MensagemEmail {
  para: string;
  assunto: string;
  texto: string;
}

function enviarComandoSmtp(socket: net.Socket | tls.TLSSocket, comando: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (dados: Buffer) => {
      socket.off("error", onError);
      resolve(dados.toString("utf8"));
    };
    const onError = (erro: Error) => {
      socket.off("data", onData);
      reject(erro);
    };
    socket.once("data", onData);
    socket.once("error", onError);
    socket.write(`${comando}\r\n`);
  });
}

export async function enviarEmail(mensagem: MensagemEmail): Promise<{ enviado: boolean; canal: "smtp" | "log" }> {
  const host = process.env.SMTP_HOST?.trim();
  const porta = Number(process.env.SMTP_PORT ?? "465");
  const usuario = process.env.SMTP_USER?.trim();
  const senha = process.env.SMTP_PASS?.trim();
  const remetente = process.env.SMTP_FROM?.trim() || "no-reply@origem.local";

  if (!host) {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[EMAIL:FALLBACK] Para: ${mensagem.para} | Assunto: ${mensagem.assunto}`);
    }
    return { enviado: true, canal: "log" };
  }

  await new Promise<void>((resolve, reject) => {
    const socket = porta === 465
      ? tls.connect({ host, port: porta, servername: host })
      : net.connect({ host, port: porta });

    socket.setTimeout(10000);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Tempo limite excedido ao conectar ao servidor SMTP."));
    });
    socket.once("error", reject);

    socket.once("data", async () => {
      try {
        await enviarComandoSmtp(socket, `EHLO origem.local`);
        if (usuario && senha) {
          await enviarComandoSmtp(socket, "AUTH LOGIN");
          await enviarComandoSmtp(socket, Buffer.from(usuario).toString("base64"));
          await enviarComandoSmtp(socket, Buffer.from(senha).toString("base64"));
        }
        await enviarComandoSmtp(socket, `MAIL FROM:<${remetente}>`);
        await enviarComandoSmtp(socket, `RCPT TO:<${mensagem.para}>`);
        await enviarComandoSmtp(socket, "DATA");
        const corpo = [
          `From: Origem Marketplace <${remetente}>`,
          `To: ${mensagem.para}`,
          `Subject: ${mensagem.assunto}`,
          "Content-Type: text/plain; charset=UTF-8",
          "",
          mensagem.texto,
          ".",
        ].join("\r\n");
        await enviarComandoSmtp(socket, corpo);
        await enviarComandoSmtp(socket, "QUIT");
        socket.end();
        resolve();
      } catch (erro) {
        socket.destroy();
        reject(erro);
      }
    });
  });

  return { enviado: true, canal: "smtp" };
}