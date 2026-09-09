import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "node:crypto";
import * as https from "node:https";
import { XMLParser } from "fast-xml-parser";

/**
 * Consulta de placa via SINESP Cidadão.
 *
 * Port em TypeScript do cliente não-oficial https://github.com/victor-torres/sinesp-client
 * (Python, "não está mais sendo mantido"). Ele reproduz a chamada feita pelo app
 * móvel do SINESP Cidadão (engenharia reversa do APK/IPA), sem depender de captcha.
 *
 * ATENÇÃO — leia antes de confiar nisso em produção:
 * 1) O endpoint é não-oficial, não documentado, e o projeto original já avisa que
 *    não é mais mantido. O governo pode alterar/derrubar isso a qualquer momento
 *    sem aviso, e é bem possível que já esteja fora do ar quando você ler isto.
 * 2) O SINESP costuma bloquear requisições vindas de fora do Brasil. Como a API
 *    roda no Render (região Oregon/EUA), há uma chance real de bloqueio geográfico
 *    mesmo que o endpoint esteja no ar.
 * 3) Por isso o método search() nunca lança erro para o chamador: qualquer falha
 *    (timeout, bloqueio, endpoint fora do ar, resposta inesperada) retorna `null`,
 *    e a tela de veículo deve permitir preenchimento manual como já faz hoje.
 */

const SINESP_SECRET = "#8.1.0#g8LzUadkEHs7mbRqbX5l";
const CAPTCHA_HOST = "sinespcidadao.sinesp.gov.br";
const CAPTCHA_PATH = "/sinesp-cidadao/captchaMobile.png";
const SEARCH_HOST = "cidadao.sinesp.gov.br";
const SEARCH_PATH = "/sinesp-cidadao/mobile/consultar-placa/v4";
// O cliente original manda o request para cidadao.sinesp.gov.br mas com o
// header Host apontando para o subdomínio sinespcidadao.sinesp.gov.br — isso é
// proposital (roteamento do lado do servidor) e replicado aqui de propósito.
const REQUEST_TIMEOUT_MS = 8000;

const BODY_TEMPLATE = `<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<v:Envelope xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
<v:Header>
<b>Samsung GT-I9192</b>
<c>ANDROID</c>
<d>8.1.0</d>
<i>__LATITUDE__</i>
<e>4.1.5</e>
<f>10.0.0.1</f>
<g>__TOKEN__</g>
<k></k>
<h>__LONGITUDE__</h>
<l>__DATE__</l>
<m>8797e74f0d6eb7b1ff3dc114d4aa12d3</m>
</v:Header>
<v:Body>
<n0:getStatus xmlns:n0="http://soap.ws.placa.service.sinesp.serpro.gov.br/">
<a>__PLATE__</a>
</n0:getStatus>
</v:Body>
</v:Envelope>`;

export interface PlateLookupResult {
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  modelYear?: number;
  chassis?: string;
  city?: string;
  state?: string;
  returnCode?: string;
  returnMessage?: string;
  statusCode?: string;
  statusMessage?: string;
}

@Injectable()
export class SinespService {
  private readonly logger = new Logger(SinespService.name);
  private readonly xmlParser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true });

  async search(rawPlate: string): Promise<PlateLookupResult | null> {
    const plate = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (plate.length < 7) return null;

    try {
      const cookie = await this.getCaptchaCookie();
      const body = this.buildBody(plate);
      const xml = await this.postSearch(body, cookie);
      return this.parseResponse(xml, plate);
    } catch (err) {
      this.logger.warn(
        `Consulta SINESP indisponível para a placa ${plate}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private getCaptchaCookie(): Promise<string | null> {
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: CAPTCHA_HOST,
          path: CAPTCHA_PATH,
          method: "GET",
          timeout: REQUEST_TIMEOUT_MS,
          rejectUnauthorized: false,
        },
        (res) => {
          res.resume(); // não precisamos do corpo, só do cookie
          const setCookie = res.headers["set-cookie"] ?? [];
          const jsession = setCookie.find((c) => c.startsWith("JSESSIONID"));
          resolve(jsession ? jsession.split(";")[0] : null);
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout ao obter cookie de sessão")));
      req.on("error", () => resolve(null));
      req.end();
    });
  }

  private postSearch(body: string, cookie: string | null): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: SEARCH_HOST,
          path: SEARCH_PATH,
          method: "POST",
          timeout: REQUEST_TIMEOUT_MS,
          rejectUnauthorized: false,
          headers: {
            Accept: "text/plain, */*; q=0.01",
            "Cache-Control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Content-Length": Buffer.byteLength(body),
            Host: CAPTCHA_HOST,
            "User-Agent": "SinespCidadao / 3.0.2.1 CFNetwork / 758.2.8 Darwin / 15.0.0",
            Connection: "close",
            ...(cookie ? { Cookie: cookie } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            resolve(Buffer.concat(chunks).toString("utf-8"));
          });
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout na consulta de placa")));
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  private token(plate: string): string {
    const key = `${plate}${SINESP_SECRET}`;
    return createHmac("sha1", key).update(plate).digest("hex");
  }

  private randCoordinateOffset(radius = 2000): number {
    const seed = (radius / 111000.0) * Math.sqrt(Math.random());
    return seed * Math.sin(2 * Math.PI * Math.random());
  }

  private randLatitude(): string {
    return (this.randCoordinateOffset() - 38.5290245).toFixed(7);
  }

  private randLongitude(): string {
    return (this.randCoordinateOffset() - 3.7506985).toFixed(7);
  }

  private formattedDate(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  private buildBody(plate: string): string {
    return BODY_TEMPLATE.replace("__LATITUDE__", this.randLatitude())
      .replace("__TOKEN__", this.token(plate))
      .replace("__LONGITUDE__", this.randLongitude())
      .replace("__DATE__", this.formattedDate())
      .replace("__PLATE__", plate);
  }

  private parseResponse(xml: string, plate: string): PlateLookupResult | null {
    const parsed = this.xmlParser.parse(xml);
    const envelope = parsed?.Envelope;
    const ret = envelope?.Body?.getStatusResponse?.return;
    if (!ret) return null;

    const toNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) && value !== undefined && value !== "" ? n : undefined;
    };

    return {
      plate: String(ret.placa ?? plate),
      brand: ret.marca || undefined,
      model: ret.modelo || undefined,
      color: ret.cor || undefined,
      year: toNumber(ret.ano),
      modelYear: toNumber(ret.anoModelo),
      chassis: ret.chassi || undefined,
      city: ret.municipio || undefined,
      state: ret.uf || undefined,
      returnCode: ret.codigoRetorno !== undefined ? String(ret.codigoRetorno) : undefined,
      returnMessage: ret.mensagemRetorno || undefined,
      statusCode: ret.codigoSituacao !== undefined ? String(ret.codigoSituacao) : undefined,
      statusMessage: ret.situacao || undefined,
    };
  }
}
