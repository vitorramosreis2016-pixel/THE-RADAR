
(() => {
    "use strict";

    const canvas = document.getElementById("radarCanvas");
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
        console.error("THE-RADAR: canvas radarCanvas não encontrado.");
        return;
    }

    // Controles existentes no HTML
    const $ = id => document.getElementById(id);

    const slDbz = $("sl-dbz");
    const slVento = $("sl-vento");
    const slDesloc = $("sl-desloc");
    const seCouplet = $("se-couplet");

    const lblDbz = $("lbl-dbz");
    const lblVento = $("lbl-vento");
    const lblDesloc = $("lbl-desloc");
    const alertsList = $("alerts-list");
    const radarTitle = $("radar-title");

    const btnDbz = $("btn-dbz");
    const btnVento = $("btn-vento");
    const btnCc = $("btn-cc");

    if (![slDbz, slVento, slDesloc, seCouplet].every(Boolean)) {
        console.error("THE-RADAR: faltam controles obrigatórios no HTML.");
        return;
    }

    // Adiciona SRV e KDP sem exigir alterações no HTML.
    const productContainer = btnDbz?.parentElement;
    const buttons = {
        dbz: btnDbz,
        vento: btnVento,
        cc: btnCc
    };

    function criarBotaoProduto(id, texto) {
        if (!productContainer) return null;

        let button = $(id);
        if (button) return button;

        button = document.createElement("button");
        button.id = id;
        button.className = "btn-product";
        button.textContent = texto;
        button.style.cssText =
            "flex:1;padding:6px;background:#222;color:#fff;" +
            "border:1px solid #444;border-radius:4px;cursor:pointer;";

        productContainer.appendChild(button);
        return button;
    }

    buttons.srv = criarBotaoProduto("btn-srv", "SRV");
    buttons.kdp = criarBotaoProduto("btn-kdp", "KDP");

    const nomesProdutos = {
        dbz: "Refletividade (dBZ)",
        vento: "Velocidade Base (mph)",
        srv: "Storm Relative Velocity (mph)",
        cc: "Coeficiente de Correlação (CC)",
        kdp: "Fase Diferencial Específica (°/km)"
    };

    let produtoAtivo = "dbz";
    let anguloVarredura = 0;

    // Estado da tempestade
    let tempestadeX = 145;
    let tempestadeY = 155;
    let idadeTempestade = 0;
    let vitalidade = 100;
    let intensidadeAtual = 0;
    let dissipou = false;
    let ultimoTempo = performance.now();

    // Assinatura de detritos apenas simulada.
    let possivelTds = false;
    let ultimoEstadoCouplet = "0";

    const limitar = (v, min, max) =>
        Math.max(min, Math.min(max, v));

    const interpolar = (a, b, t) => a + (b - a) * t;

    function atualizarLabels() {
        if (lblDbz) lblDbz.textContent = slDbz.value;
        if (lblVento) lblVento.textContent = slVento.value;
        if (lblDesloc) lblDesloc.textContent = slDesloc.value;
    }

    function alternarProduto(produto) {
        produtoAtivo = produto;

        Object.entries(buttons).forEach(([nome, botao]) => {
            if (!botao) return;

            const ativo = nome === produto;
            botao.style.background = ativo ? "#00ff00" : "#222";
            botao.style.color = ativo ? "#000" : "#fff";
            botao.style.fontWeight = ativo ? "bold" : "normal";
            botao.style.border = ativo ? "none" : "1px solid #444";
        });

        if (radarTitle) {
            radarTitle.textContent =
                `Display Principal: ${nomesProdutos[produto]}`;
        }
    }

    Object.entries(buttons).forEach(([produto, botao]) => {
        botao?.addEventListener("click", () => alternarProduto(produto));
    });

    function desenharGrade() {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.fillStyle = "#000600";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "#123019";
        ctx.lineWidth = 1;

        for (let r = 45; r < Math.min(w, h) / 2; r += 45) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
    }

    // Calcula a evolução com base nos parâmetros configurados.
    function atualizarTempestade(dt) {
        const dbzAlvo = Number(slDbz.value);
        const vento = Number(slVento.value);
        const desloc = Number(slDesloc.value);
        const rotacao = seCouplet.value === "1";

        if (dissipou) return;

        idadeTempestade += dt;

        // Pontuação ilustrativa de condições favoráveis.
        const intensidade = dbzAlvo / 75;
        const ventoFavoravel = limitar(vento / 90, 0, 1);
        const deslocFavoravel =
            limitar(1 - Math.abs(desloc - 25) / 45, 0, 1);

        const organizacao =
            intensidade * 0.40 +
            ventoFavoravel * 0.25 +
            (rotacao ? 0.25 : 0) +
            deslocFavoravel * 0.10;

        // O ambiente favorável mantém a tempestade;
        // condições desfavoráveis reduzem sua vitalidade.
        const tendencia = (organizacao - 0.48) * 10;
        vitalidade = limitar(vitalidade + tendencia * dt, 0, 100);

        const alvoVisual = dbzAlvo * (vitalidade / 100);
        intensidadeAtual = interpolar(
            intensidadeAtual,
            alvoVisual,
            1 - Math.exp(-dt * 0.8)
        );

        const velocidadeTela = desloc * 0.45;
        tempestadeX += velocidadeTela * dt;
        tempestadeY += velocidadeTela * 0.22 * dt;

        // Reposiciona a célula quando sai da área de visualização.
        if (tempestadeX > canvas.width + 100 ||
            tempestadeY > canvas.height + 100) {
            tempestadeX = 40;
            tempestadeY = 60;
        }

        if (vitalidade <= 0.5 || intensidadeAtual < 1) {
            dissipou = true;
        }
    }

    // Retorna as características de um ponto do campo.
    function calcularCampo(x, y) {
        const dx = x - tempestadeX;
        const dy = y - tempestadeY;

        const angulo = Math.atan2(dy, dx);
        const raio = Math.sqrt(dx * dx + dy * dy);

        // Corpo principal, assimétrico.
        let deformacao = 1;

        if (angulo > -1.5 && angulo < 0.5) deformacao = 0.78;
        if (angulo > 0.7 && angulo < 2.4) deformacao = 1.35;

        const raioEfetivo = raio * deformacao;
        const dentroCorpo = raioEfetivo < 48;

        let dbz = dentroCorpo
            ? intensidadeAtual * (1 - raioEfetivo / 48)
            : 0;

        const mesoX = tempestadeX + 15;
        const mesoY = tempestadeY + 25;
        const mx = x - mesoX;
        const my = y - mesoY;
        const raioMeso = Math.hypot(mx, my);
        const anguloMeso = Math.atan2(my, mx);

        const rotacao = seCouplet.value === "1";

        // Hook echo curvo no quadrante sudoeste.
        // Em canvas, X cresce para a direita e Y para baixo.
        // Portanto SW tem mx < 0 e my > 0.
        let noGancho = false;

        if (rotacao && mx < 0 && my > 0) {
            const anguloMin = 2.05;
            const anguloMax = 3.08;

            if (
                anguloMeso >= anguloMin &&
                anguloMeso <= anguloMax
            ) {
                const progresso =
                    (anguloMeso - anguloMin) /
                    (anguloMax - anguloMin);

                const raioAlvo = 13 + progresso * 16;
                const distanciaArco = Math.abs(raioMeso - raioAlvo);

                if (distanciaArco < 4.2) {
                    noGancho = true;

                    const dbzGancho =
                        intensidadeAtual *
                        0.88 *
                        limitar(1 - distanciaArco / 5, 0, 1);

                    dbz = Math.max(dbz, dbzGancho);
                }
            }
        }

        // BWER: região de eco fraco cercada por eco mais intenso.
        // Não deve ser preenchida como um núcleo de dBZ máximo.
        const dentroBwer = rotacao && raioMeso < 5.5;

        if (dentroBwer) {
            dbz = Math.min(dbz, intensidadeAtual * 0.12);
        }

        // Dipolo sintético de velocidade radial.
        // Aproximação visual, não uma solução atmosférica.
        const distancia = Math.max(1, raioMeso);
        const velocidadeTangencial =
            rotacao
                ? Math.min(Number(slVento.value), 120) *
                  Math.exp(-distancia / 42)
                : 0;

        const ventoRadial =
            velocidadeTangencial *
            Math.cos(anguloMeso) *
            Math.sign(my || 1);

        const velocidadeBase = limitar(
            ventoRadial + Number(slVento.value) * 0.12,
            -120,
            120
        );

        const deslocRadial =
            Number(slDesloc.value) *
            Math.cos(anguloMeso);

        const srv = limitar(
            velocidadeBase - deslocRadial,
            -120,
            120
        );

        // CC normalmente alto em chuva uniforme.
        // Redução localizada e irregular na possível assinatura TDS.
        const ruidoCC =
            Math.sin(x * 0.19 + y * 0.11) *
            Math.cos(y * 0.16 - x * 0.07) *
            0.025;

        let cc = dentroCorpo ? 0.97 + ruidoCC : 1;

        const possivelDetrito =
            rotacao &&
            possivelTds &&
            raioMeso < 7 &&
            dbz > 35;

        if (possivelDetrito) {
            cc = 0.45 + Math.abs(ruidoCC);
        }

        // KDP sintético: valores mais elevados em partes
        // da precipitação intensa; não deriva de uma fase simulada real.
        let kdp = dentroCorpo
            ? limitar((dbz - 15) / 12, 0, 5)
            : 0;

        if (noGancho) kdp *= 0.8;

        return {
            dbz: limitar(dbz, 0, 75),
            velocidadeBase,
            srv,
            cc: limitar(cc, 0, 1),
            kdp,
            dentroCorpo,
            noGancho,
            dentroBwer,
            possivelDetrito
        };
    }

    function corDbz(v) {
        if (v >= 60) return "#ff00ff";
        if (v >= 50) return "#ff0000";
        if (v >= 40) return "#ff8800";
        if (v >= 30) return "#ffff00";
        if (v >= 20) return "#00ff00";
        if (v >= 10) return "#00bbbb";
        return null;
    }

    function corVelocidade(v) {
        if (v > 65) return "#ff0000";
        if (v > 30) return "#ff7777";
        if (v > 8) return "#ffcccc";
        if (v < -65) return "#00ff00";
        if (v < -30) return "#00bb77";
        if (v < -8) return "#0066ff";
        return "#172b19";
    }

    function corCC(v) {
        if (v < 0.65) return "#00ffff";
        if (v < 0.80) return "#0066ff";
        if (v < 0.90) return "#aa00ff";
        if (v < 0.96) return "#ff00aa";
        return "#00aa44";
    }

    function corKdp(v) {
        if (v >= 4) return "#ff00ff";
        if (v >= 2) return "#ff0000";
        if (v >= 1) return "#ffff00";
        if (v >= 0.3) return "#00ff00";
        return null;
    }

    function desenharTempestade() {
        const inicioX = Math.max(0, Math.floor(tempestadeX - 100));
        const fimX = Math.min(canvas.width, Math.ceil(tempestadeX + 100));
        const inicioY = Math.max(0, Math.floor(tempestadeY - 100));
        const fimY = Math.min(canvas.height, Math.ceil(tempestadeY + 100));

        const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dados = imagem.data;

        for (let x = inicioX; x < fimX; x++) {
            for (let y = inicioY; y < fimY; y++) {
                const campo = calcularCampo(x, y);
                let cor = null;

                switch (produtoAtivo) {
                    case "dbz":
                        cor = corDbz(campo.dbz);
                        break;
                    case "vento":
                        cor = corVelocidade(campo.velocidadeBase);
                        break;
                    case "srv":
                        cor = corVelocidade(campo.srv);
                        break;
                    case "cc":
                        cor = corCC(campo.cc);
                        break;
                    case "kdp":
                        cor = corKdp(campo.kdp);
                        break;
                }

                if (!cor) continue;

                const match = cor.match(/\w\w/g);
                if (!match || match.length < 3) continue;

                const idx = (y * canvas.width + x) * 4;
                dados[idx] = parseInt(match[0], 16);
                dados[idx + 1] = parseInt(match[1], 16);
                dados[idx + 2] = parseInt(match[2], 16);
                dados[idx + 3] = 255;
            }
        }

        ctx.putImageData(imagem, 0, 0);

        // Marca visual discreta do centro de circulação.
        if (seCouplet.value === "1") {
            ctx.strokeStyle = "rgba(255,255,255,0.65)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tempestadeX + 15, tempestadeY + 25, 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function desenharVarredura() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.strokeStyle = "rgba(0,255,0,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx + cx * Math.cos(anguloVarredura),
            cy + cy * Math.sin(anguloVarredura)
        );
        ctx.stroke();

        anguloVarredura = (anguloVarredura + 0.025) % (Math.PI * 2);
    }

    function processarAlertas() {
        if (!alertsList) return;

        const dbz = Number(slDbz.value);
        const vento = Number(slVento.value);
        const rotacao = seCouplet.value === "1";
        const alertas = [];

        if (dissipou) {
            alertas.push("☁️ TEMPESTADE DISSIPADA — SIMULAÇÃO");
        } else {
            if (dbz >= 55 && vento >= 58) {
                alertas.push("⚠️ SEVERE THUNDERSTORM — SIMULADO");
            }

            if (rotacao && vitalidade > 20) {
                alertas.push("🌪️ ROTAÇÃO DETECTADA — SIMULAÇÃO");
            }

            if (rotacao && possivelTds && dbz >= 35) {
                alertas.push("🟦 POSSÍVEL ASSINATURA DE DETRITOS — SIMULADA");
            }

            if (Number(slDesloc.value) < 15 && dbz >= 45) {
                alertas.push("🌊 RISCO DE CHUVA PERSISTENTE — SIMULAÇÃO");
            }
        }

        if (!alertas.length) {
            alertas.push("Atmosfera monitorada. Sem alertas simulados.");
        }

        alertsList.innerHTML = alertas
            .map(texto => `<div>${texto}</div>`)
            .join("");
    }

    function atualizarPainel() {
        let painel = $("storm-status");

        if (!painel && alertsList?.parentElement) {
            painel = document.createElement("div");
            painel.id = "storm-status";
            painel.style.cssText =
                "margin-top:12px;padding:10px;background:#101810;" +
                "border:1px solid #244024;border-radius:6px;color:#baffba;" +
                "font:12px monospace;line-height:1.7;";

            alertsList.parentElement.appendChild(painel);
        }

        if (!painel) return;

        const minutos = Math.floor(idadeTempestade / 60);
        const segundos = Math.floor(idadeTempestade % 60);
        const tempo = `${String(minutos).padStart(2, "0")}:` +
                      `${String(segundos).padStart(2, "0")}`;

        let estagio = "Desenvolvimento";
        if (dissipou) estagio = "Dissipada";
        else if (vitalidade < 30) estagio = "Dissipação";
        else if (vitalidade >= 75 && idadeTempestade > 30) estagio = "Maturidade";
        else if (vitalidade >= 45) estagio = "Organizada";

        painel.innerHTML =
            `<strong>ESTADO DA TEMPESTADE</strong><br>` +
            `Tempo de vida: ${tempo}<br>` +
            `Estágio: ${estagio}<br>` +
            `Intensidade simulada: ${intensidadeAtual.toFixed(1)} dBZ<br>` +
            `Vitalidade: ${vitalidade.toFixed(0)}%`;
    }

    // Reinício manual, disponível sem alterar o HTML.
    function criarBotaoReiniciar() {
        if ($("btn-reset")) return;

        const botao = document.createElement("button");
        botao.id = "btn-reset";
        botao.textContent = "↻ Reiniciar tempestade";
        botao.style.cssText =
            "margin-top:10px;padding:8px 10px;width:100%;" +
            "background:#17351b;color:#fff;border:1px solid #397342;" +
            "border-radius:5px;cursor:pointer;";

        botao.addEventListener("click", () => {
            idadeTempestade = 0;
            vitalidade = 100;
            intensidadeAtual = Number(slDbz.value);
            dissipou = false;
            tempestadeX = 145;
            tempestadeY = 155;
            ultimoTempo = performance.now();
        });

        $("controls")?.appendChild(botao);
    }

    // O sorteio de 38% acontece uma única vez ao ativar a rotação.
    seCouplet.addEventListener("change", () => {
        if (seCouplet.value === "1" && ultimoEstadoCouplet === "0") {
            possivelTds = Math.random() < 0.38;
        }

        if (seCouplet.value === "0") {
            possivelTds = false;
        }

        ultimoEstadoCouplet = seCouplet.value;
    });

    function loop(agora) {
        const dt = Math.min((agora - ultimoTempo) / 1000, 0.1);
        ultimoTempo = agora;

        atualizarLabels();
        atualizarTempestade(dt);

        desenharGrade();
        desenharTempestade();
        desenharVarredura();

        processarAlertas();
        atualizarPainel();

        requestAnimationFrame(loop);
    }

    criarBotaoReiniciar();
    alternarProduto("dbz");
    intensidadeAtual = Number(slDbz.value);
    requestAnimationFrame(loop);
})();
