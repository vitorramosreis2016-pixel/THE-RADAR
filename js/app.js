
const canvas = document.getElementById('radarCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// ============================================================
// THE-RADAR 0.2 — Simulador de produtos de radar meteorológico
// Produtos: Reflectivity, Base Velocity, SRV, CC e KDP
// Radar Doppler posicionado no centro do canvas.
// ============================================================

// Controles da interface
const slDbz = document.getElementById('sl-dbz');
const slVento = document.getElementById('sl-vento');
const slDesloc = document.getElementById('sl-desloc');
const seCouplet = document.getElementById('se-couplet');

const lblDbz = document.getElementById('lbl-dbz');
const lblVento = document.getElementById('lbl-vento');
const lblDesloc = document.getElementById('lbl-desloc');
const alertsList = document.getElementById('alerts-list');
const radarTitle = document.getElementById('radar-title');

// Botões de produto existentes
const btnDbz = document.getElementById('btn-dbz');
const btnVento = document.getElementById('btn-vento');
const btnCc = document.getElementById('btn-cc');

// Criar botões novos caso não estejam no HTML
function criarBotaoProduto(id, texto, referencia) {
    let botao = document.getElementById(id);
    if (botao) return botao;

    if (!referencia || !referencia.parentElement) return null;

    botao = document.createElement('button');
    botao.id = id;
    botao.type = 'button';
    botao.textContent = texto;
    botao.style.cssText = [
        'background:#222',
        'color:#fff',
        'border:1px solid #444',
        'padding:8px 12px',
        'margin:3px',
        'cursor:pointer',
        'font-weight:normal'
    ].join(';');

    referencia.insertAdjacentElement('afterend', botao);
    return botao;
}

const btnSrv = criarBotaoProduto('btn-srv', 'SRV', btnCc);
const btnKdp = criarBotaoProduto('btn-kdp', 'KDP', btnSrv || btnCc);

// Estado do simulador
let produtoAtivo = 'dbz';
let anguloVarredura = 0;

let tempestadeX = 140;
let tempestadeY = 160;

let tonaTerra = false;
let ultimoEstadoCouplet = '0';

// Produtos disponíveis
const produtos = {
    dbz: {
        titulo: 'Refletividade (dBZ)',
        unidade: 'dBZ'
    },
    vento: {
        titulo: 'Velocidade Base (mph)',
        unidade: 'mph'
    },
    srv: {
        titulo: 'Storm-Relative Velocity — SRV (mph)',
        unidade: 'mph'
    },
    cc: {
        titulo: 'Coeficiente de Correlação — CC',
        unidade: ''
    },
    kdp: {
        titulo: 'Specific Differential Phase — KDP (°/km)',
        unidade: '°/km'
    }
};

// ============================================================
// INTERFACE
// ============================================================

function obterBotoesProduto() {
    return [
        [btnDbz, 'dbz'],
        [btnVento, 'vento'],
        [btnSrv, 'srv'],
        [btnCc, 'cc'],
        [btnKdp, 'kdp']
    ];
}

function alternarProduto(produto) {
    if (!produtos[produto]) return;

    produtoAtivo = produto;

    for (const [botao, chave] of obterBotoesProduto()) {
        if (!botao) continue;

        const ativo = chave === produto;

        botao.style.background = ativo ? '#00ff00' : '#222';
        botao.style.color = ativo ? '#000' : '#fff';
        botao.style.fontWeight = ativo ? 'bold' : 'normal';
        botao.style.border = ativo ? 'none' : '1px solid #444';
        botao.setAttribute('aria-pressed', String(ativo));
    }

    if (radarTitle) {
        radarTitle.textContent =
            `Display Principal: ${produtos[produto].titulo}`;
    }
}

for (const [botao, produto] of obterBotoesProduto()) {
    if (botao) {
        botao.addEventListener('click', () => {
            alternarProduto(produto);
        });
    }
}

function atualizarLabels() {
    if (slDbz && lblDbz) {
        lblDbz.textContent = slDbz.value;
    }

    if (slVento && lblVento) {
        lblVento.textContent = slVento.value;
    }

    if (slDesloc && lblDesloc) {
        lblDesloc.textContent = slDesloc.value;
    }
}

// ============================================================
// GRADE DO RADAR
// ============================================================

function desenharGrade(contexto, largura, altura) {
    if (!contexto) return;

    const cx = largura / 2;
    const cy = altura / 2;

    contexto.fillStyle = '#000600';
    contexto.fillRect(0, 0, largura, altura);

    contexto.strokeStyle = '#002200';
    contexto.lineWidth = 1;

    const raioMaximo = Math.hypot(cx, cy);

    for (let raio = 45; raio < raioMaximo; raio += 45) {
        contexto.beginPath();
        contexto.arc(cx, cy, raio, 0, 2 * Math.PI);
        contexto.stroke();
    }

    contexto.beginPath();
    contexto.moveTo(cx, 0);
    contexto.lineTo(cx, altura);
    contexto.moveTo(0, cy);
    contexto.lineTo(largura, cy);
    contexto.stroke();

    // Posição do radar Doppler
    contexto.fillStyle = '#ffffff';
    contexto.beginPath();
    contexto.arc(cx, cy, 3, 0, 2 * Math.PI);
    contexto.fill();
}

// ============================================================
// FUNÇÕES DOS PRODUTOS
// ============================================================

function obterCorDbz(dbz) {
    if (dbz > 65) return '#ff00ff';
    if (dbz > 55) return '#ff0000';
    if (dbz > 45) return '#ff6600';
    if (dbz > 35) return '#ffff00';
    if (dbz > 20) return '#00cc00';
    return '#006600';
}

// Convenção do simulador:
// velocidade positiva = movimento para longe do radar;
// velocidade negativa = movimento em direção ao radar.

function obterCorVelocidade(velocidade) {
    const v = velocidade;

    if (v <= -60) return '#00ffff';
    if (v <= -40) return '#0088ff';
    if (v <= -20) return '#0044cc';
    if (v < -5) return '#002266';

    if (v < 5) return '#101010';

    if (v < 20) return '#660000';
    if (v < 40) return '#cc0000';
    if (v < 60) return '#ff4444';
    return '#ffaaaa';
}

function obterCorCC(cc) {
    if (cc < 0.55) return '#00ffff';
    if (cc < 0.75) return '#0099ff';
    if (cc < 0.90) return '#ffff00';
    if (cc < 0.96) return '#ff9900';
    return '#cc0000';
}

function obterCorKdp(kdp) {
    if (kdp < 0.2) return '#142414';
    if (kdp < 0.5) return '#006600';
    if (kdp < 1.0) return '#00cc00';
    if (kdp < 2.0) return '#ffff00';
    if (kdp < 3.0) return '#ff9900';
    if (kdp < 4.0) return '#ff3300';
    return '#ff00ff';
}

// ============================================================
// GEOMETRIA E CAMPOS SINTÉTICOS
// ============================================================

function calcularCampos(x, y, estado) {
    const {
        tempestadeX: sx,
        tempestadeY: sy,
        mesoX,
        mesoY,
        dbzMax,
        ventoMax,
        desloc,
        couplet,
        tds,
        cx,
        cy
    } = estado;

    const dxCorpo = x - sx;
    const dyCorpo = y - sy;

    const raioCorpo = Math.hypot(dxCorpo, dyCorpo);
    const anguloCorpo = Math.atan2(dyCorpo, dxCorpo);

    // Corpo assimétrico da supercélula
    let distorcaoRim = 1;

    if (anguloCorpo > -1.5 && anguloCorpo < 0.5) {
        distorcaoRim = 0.7;
    }

    if (anguloCorpo > 1.0 && anguloCorpo < 2.5) {
        distorcaoRim = 1.6;
    }

    const naSupercelula = raioCorpo * distorcaoRim < 45;

    let dbz = naSupercelula
        ? dbzMax * (1 - raioCorpo * distorcaoRim / 45)
        : 0;

    const dxMeso = x - mesoX;
    const dyMeso = y - mesoY;
    const raioMeso = Math.hypot(dxMeso, dyMeso);
    const anguloMeso = Math.atan2(dyMeso, dxMeso);

    // Gancho de refletividade
    let noGancho = false;

    if (couplet) {
        if (raioMeso > 8 && raioMeso < 24) {
            const anguloGancho = raioMeso * 0.18 - 2.4;

            // Normalizar diferença angular para evitar problemas
            // na passagem entre +PI e -PI.
            const diferenca = Math.atan2(
                Math.sin(anguloMeso - anguloGancho),
                Math.cos(anguloMeso - anguloGancho)
            );

            if (Math.abs(diferenca) < 0.35) {
                noGancho = true;

                const dbzGancho =
                    dbzMax * 0.85 * (1 - raioMeso / 30);

                dbz = Math.max(dbz, dbzGancho);
            }
        }

        if (raioMeso <= 8) {
            noGancho = true;
            dbz = Math.max(dbz, dbzMax * 0.95);
        }
    }

    const ecoPresente = (naSupercelula || noGancho) && dbz > 12;

    // Direção radial do radar para o pixel
    const dxRadar = x - cx;
    const dyRadar = y - cy;
    const distanciaRadar = Math.hypot(dxRadar, dyRadar);

    const ux = distanciaRadar > 0 ? dxRadar / distanciaRadar : 0;
    const uy = distanciaRadar > 0 ? dyRadar / distanciaRadar : 0;

    // Movimento da tempestade: diagonal para a direita e para baixo.
    // A velocidade do slider é interpretada em mph.
    const movimentoX = desloc * 0.8944;
    const movimentoY = desloc * 0.4472;

    // Campo de vento tangencial sintético ao redor do mesociclone.
    // O perfil diminui com a distância do centro de rotação.
    let rotacaoX = 0;
    let rotacaoY = 0;

    if (couplet && raioMeso > 0) {
        const raioPerfil = Math.max(raioMeso, 4);
        const fatorRotacao = Math.min(
            1,
            Math.max(0, 1 - Math.abs(raioPerfil - 10) / 24)
        );

        const velocidadeTangencial = ventoMax * fatorRotacao;

        rotacaoX = -(dyMeso / raioPerfil) * velocidadeTangencial;
        rotacaoY = (dxMeso / raioPerfil) * velocidadeTangencial;
    }

    // Projeção radial do vento total.
    // Base Velocity inclui o movimento de translação da tempestade.
    const ventoTotalX = rotacaoX + movimentoX;
    const ventoTotalY = rotacaoY + movimentoY;

    const velocidadeBase =
        ventoTotalX * ux + ventoTotalY * uy;

    // SRV remove a componente radial do movimento da tempestade.
    const movimentoRadial =
        movimentoX * ux + movimentoY * uy;

    const velocidadeSRV = velocidadeBase - movimentoRadial;

    // CC sintético: valores altos em precipitação uniforme;
    // valores baixos na assinatura de detritos simulada.
    let cc = ecoPresente ? 0.97 : 1.0;

    if (ecoPresente) {
        const variacaoCC =
            0.015 * Math.sin(x * 0.19) * Math.cos(y * 0.17);

        cc = Math.max(0, Math.min(1, cc + variacaoCC));

        if (couplet && tds && raioMeso < 6 && dbz > 45) {
            cc = 0.35 + 0.08 * Math.sin(x + y);
        }
    }

    // KDP sintético: distribuição espacial em regiões de precipitação.
    // Não representa uma recuperação física real de fase diferencial.
    let kdp = 0;

    if (ecoPresente) {
        const intensidadeChuva = Math.max(0, (dbz - 15) / 50);
        const nucleoChuva = Math.max(0, 1 - raioCorpo / 55);
        const estruturaLocal =
            0.25 + 0.75 * Math.abs(Math.sin(x * 0.075 + y * 0.045));

        kdp = intensidadeChuva * nucleoChuva * estruturaLocal * 4.5;
        kdp = Math.max(0, Math.min(5, kdp));
    }

    return {
        dbz,
        ecoPresente,
        raioMeso,
        velocidadeBase,
        velocidadeSRV,
        cc,
        kdp
    };
}

// ============================================================
// DESENHO DOS PRODUTOS
// ============================================================

function desenharRadar() {
    if (!canvas || !ctx) return;

    const largura = canvas.width;
    const altura = canvas.height;

    desenharGrade(ctx, largura, altura);

    const cx = largura / 2;
    const cy = altura / 2;

    const desloc = slDesloc ? Number(slDesloc.value) || 0 : 0;
    const dbzMax = slDbz ? Number(slDbz.value) || 0 : 0;
    const ventoMax = slVento ? Number(slVento.value) || 0 : 0;

    const estadoCoupletAtual = seCouplet
        ? seCouplet.value
        : '0';

    const couplet = estadoCoupletAtual === '1';

    // Movimento visual da tempestade
    const velDesloc = desloc * 0.015;

    tempestadeX += velDesloc * 0.6;
    tempestadeY += velDesloc * 0.3;

    if (
        tempestadeX > largura + 100 ||
        tempestadeY > altura + 100
    ) {
        tempestadeX = 40;
        tempestadeY = 60;
        tonaTerra = false;
    }

    // Chance de 38% ao ativar o couplet, como na versão anterior.
    if (estadoCoupletAtual === '1' && ultimoEstadoCouplet === '0') {
        tonaTerra = Math.random() <= 0.38;
    }

    if (!couplet) {
        tonaTerra = false;
    }

    ultimoEstadoCouplet = estadoCoupletAtual;

    const estado = {
        tempestadeX,
        tempestadeY,
        mesoX: tempestadeX + 15,
        mesoY: tempestadeY + 25,
        dbzMax,
        ventoMax,
        desloc,
        couplet,
        tds: tonaTerra,
        cx,
        cy
    };

    const inicioX = Math.max(0, Math.floor(tempestadeX - 90));
    const fimX = Math.min(largura, Math.ceil(tempestadeX + 120));
    const inicioY = Math.max(0, Math.floor(tempestadeY - 90));
    const fimY = Math.min(altura, Math.ceil(tempestadeY + 120));

    for (let x = inicioX; x < fimX; x++) {
        for (let y = inicioY; y < fimY; y++) {
            const campo = calcularCampos(x, y, estado);

            if (!campo.ecoPresente) continue;

            switch (produtoAtivo) {
                case 'dbz':
                    ctx.fillStyle = obterCorDbz(campo.dbz);
                    break;

                case 'vento':
                    ctx.fillStyle =
                        obterCorVelocidade(campo.velocidadeBase);
                    break;

                case 'srv':
                    ctx.fillStyle =
                        obterCorVelocidade(campo.velocidadeSRV);
                    break;

                case 'cc':
                    ctx.fillStyle = obterCorCC(campo.cc);
                    break;

                case 'kdp':
                    ctx.fillStyle = obterCorKdp(campo.kdp);
                    break;

                default:
                    ctx.fillStyle = obterCorDbz(campo.dbz);
            }

            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Linha de varredura
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
        cx + Math.max(cx, cy) * Math.cos(anguloVarredura),
        cy + Math.max(cx, cy) * Math.sin(anguloVarredura)
    );
    ctx.stroke();

    anguloVarredura += 0.03;

    if (anguloVarredura >= Math.PI * 2) {
        anguloVarredura -= Math.PI * 2;
    }
}

// ============================================================
// SISTEMA DE ALERTAS
// ============================================================

function processarAlertas() {
    if (!slDbz || !slVento || !slDesloc || !alertsList) return;

    const dbz = Number(slDbz.value) || 0;
    const vento = Number(slVento.value) || 0;
    const desloc = Number(slDesloc.value) || 0;

    const couplet = seCouplet && seCouplet.value === '1';
    const alertasHTML = [];

    if (vento >= 58 || dbz > 55) {
        alertasHTML.push(
            '<div class="alerta severe">⚠️ SEVERE THUNDERSTORM WARNING — SIMULATED</div>'
        );
    }

    // Critério de demonstração, não hidrológico:
    // deslocamento lento sozinho não deve gerar alerta de inundação.
    if (desloc < 20 && dbz >= 45) {
        alertasHTML.push(
            '<div class="alerta flood">🌊 FLASH FLOOD RISK — SIMULATED</div>'
        );
    }

    if (couplet) {
        if (tonaTerra && vento >= 70 && dbz > 60) {
            alertasHTML.push(
                '<div class="alerta tornado" style="background:#4c0519;border:2px solid #ff0000;">🚨 PDS TORNADO WARNING — SIMULATED TDS</div>'
            );
        } else {
            alertasHTML.push(
                '<div class="alerta tornado">🌪️ TORNADO WARNING — RADAR INDICATED (SIMULATED)</div>'
            );
        }
    }

    if (alertasHTML.length === 0) {
        alertsList.innerHTML =
            '<span style="color:#10b981;">Atmosfera monitorada. Sem avisos.</span>';
    } else {
        alertsList.innerHTML = alertasHTML.join('');
    }
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function loopJogo() {
    atualizarLabels();
    processarAlertas();
    desenharRadar();
    requestAnimationFrame(loopJogo);
}

// Estado inicial da interface
alternarProduto('dbz');
loopJogo();
