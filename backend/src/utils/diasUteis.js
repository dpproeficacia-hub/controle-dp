// Feriados nacionais fixos (dia, mês)
// Dias úteis = Segunda a Sábado (domingo não conta, sábado conta)
const FERIADOS_NACIONAIS = [
  { dia: 1,  mes: 1  }, // Ano Novo
  { dia: 21, mes: 4  }, // Tiradentes
  { dia: 1,  mes: 5  }, // Dia do Trabalho
  { dia: 7,  mes: 9  }, // Independência
  { dia: 12, mes: 10 }, // Nossa Sra. Aparecida
  { dia: 2,  mes: 11 }, // Finados
  { dia: 15, mes: 11 }, // Proclamação da República
  { dia: 25, mes: 12 }, // Natal
];

// Feriados móveis — calculados automaticamente por ano
// Carnaval NÃO é feriado nacional (é ponto facultativo)
function feriadosMoveis(ano) {
  // Algoritmo de Meeus/Jones/Butcher para Páscoa
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pascoa = new Date(ano, mes - 1, dia);

  const addDias = (d, n) => new Date(d.getTime() + n * 86400000);

  return [
    addDias(pascoa, -2),  // Sexta-feira Santa
    pascoa,               // Páscoa (domingo — já não é dia útil de qualquer forma)
    addDias(pascoa, 60),  // Corpus Christi
  ];
}

function isFeriadoNacional(data) {
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  if (FERIADOS_NACIONAIS.some(f => f.dia === dia && f.mes === mes)) return true;

  const moveis = feriadosMoveis(ano);
  return moveis.some(f => f.getDate() === dia && f.getMonth() + 1 === mes);
}

function isFeriadoMunicipal(data, feriadosMunicipais, cidade, estado) {
  if (!feriadosMunicipais || feriadosMunicipais.length === 0) return false;
  const dia = data.getDate();
  const mes = data.getMonth() + 1;

  return feriadosMunicipais.some(f => {
    if (f.dia !== dia || f.mes !== mes) return false;
    if (!f.cidade && !f.estado) return true;
    const mesmaUF = f.estado && estado && f.estado.toUpperCase() === estado.toUpperCase();
    const mesmaCidade = f.cidade && cidade &&
      f.cidade.toLowerCase().trim() === cidade.toLowerCase().trim();
    if (f.cidade && f.estado) return mesmaCidade && mesmaUF;
    if (f.cidade) return mesmaCidade;
    if (f.estado) return mesmaUF;
    return false;
  });
}

function isDiaUtil(data, feriadosMunicipais = [], cidade = null, estado = null) {
  const diaSemana = data.getDay(); // 0=domingo, 6=sábado
  if (diaSemana === 0) return false; // domingo não é útil
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

module.exports = { calcularNesimoDiaUtil, isDiaUtil, isFeriadoNacional };
