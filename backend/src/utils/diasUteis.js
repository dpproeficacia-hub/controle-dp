const FERIADOS_NACIONAIS = [
  { dia: 1,  mes: 1  },
  { dia: 21, mes: 4  },
  { dia: 1,  mes: 5  },
  { dia: 7,  mes: 9  },
  { dia: 12, mes: 10 },
  { dia: 2,  mes: 11 },
  { dia: 15, mes: 11 },
  { dia: 25, mes: 12 },
];

function feriadosMoveis(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pascoa = new Date(ano, mes - 1, dia);
  const add = (d, n) => new Date(d.getTime() + n * 86400000);
  return [
    add(pascoa, -2),  // Sexta-feira Santa
    pascoa,
    add(pascoa, 60),  // Corpus Christi
  ];
}

function isFeriadoNacional(data) {
  const dia = data.getDate(), mes = data.getMonth() + 1, ano = data.getFullYear();
  if (FERIADOS_NACIONAIS.some(f => f.dia === dia && f.mes === mes)) return true;
  return feriadosMoveis(ano).some(f => f.getDate() === dia && f.getMonth() + 1 === mes);
}

function isFeriadoMunicipal(data, feriadosMunicipais, cidade, estado) {
  if (!feriadosMunicipais?.length) return false;
  const dia = data.getDate(), mes = data.getMonth() + 1;
  return feriadosMunicipais.some(f => {
    if (f.dia !== dia || f.mes !== mes) return false;
    if (!f.cidade && !f.estado) return true;
    const mesmaUF = f.estado && estado && f.estado.toUpperCase() === estado.toUpperCase();
    const mesmaCidade = f.cidade && cidade && f.cidade.toLowerCase().trim() === cidade.toLowerCase().trim();
    if (f.cidade && f.estado) return mesmaCidade && mesmaUF;
    if (f.cidade) return mesmaCidade;
    if (f.estado) return mesmaUF;
    return false;
  });
}

function isDiaUtil(data, feriadosMunicipais = [], cidade = null, estado = null) {
  if (data.getDay() === 0) return false; // domingo
  if (isFeriadoNacional(data)) return false;
  if (isFeriadoMunicipal(data, feriadosMunicipais, cidade, estado)) return false;
  return true;
}

function calcularNesimoDiaUtil(ano, mes, nDiaUtil, feriadosMunicipais = [], cidade = null, estado = null) {
  let count = 0;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(ano, mes - 1, dia);
    if (isDiaUtil(data, feriadosMunicipais, cidade, estado)) {
      count++;
      if (count === nDiaUtil) return dia;
    }
  }
  return diasNoMes;
}

/**
 * Calcula a data real de vencimento de um grupo de tarefa
 * @param {object} grupo - { diaVencimento, isDiaUtil, mesSubsequente }
 * @param {string} competencia - "2026-06"
 * @param {Array} feriadosMunicipais
 * @param {string|null} cidade
 * @param {string|null} estado
 * @returns {Date}
 */
function calcularDataVencimento(grupo, competencia, feriadosMunicipais = [], cidade = null, estado = null) {
  const [anoComp, mesComp] = competencia.split('-').map(Number);

  let anoVenc = anoComp;
  let mesVenc = mesComp;

  if (grupo.mesSubsequente) {
    mesVenc = mesComp + 1;
    if (mesVenc > 12) { mesVenc = 1; anoVenc++; }
  }

  let diaVenc = grupo.diaVencimento;

  if (grupo.isDiaUtil) {
    diaVenc = calcularNesimoDiaUtil(anoVenc, mesVenc, grupo.diaVencimento, feriadosMunicipais, cidade, estado);
  }

  return new Date(anoVenc, mesVenc - 1, diaVenc);
}

module.exports = { calcularNesimoDiaUtil, isDiaUtil, isFeriadoNacional, calcularDataVencimento };
