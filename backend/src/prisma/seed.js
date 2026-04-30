const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tarefas = [
  { nome: 'Folha de pagamento',      paraFuncionarios: true,  paraProLabore: false, paraSemMovimento: false, paraTodas: false },
  { nome: 'INSS',                    paraFuncionarios: true,  paraProLabore: true,  paraSemMovimento: false, paraTodas: false },
  { nome: 'FGTS',                    paraFuncionarios: true,  paraProLabore: false, paraSemMovimento: false, paraTodas: false },
  { nome: 'IR (IRRF)',               paraFuncionarios: true,  paraProLabore: true,  paraSemMovimento: false, paraTodas: false },
  { nome: 'Pró-labore',              paraFuncionarios: false, paraProLabore: true,  paraSemMovimento: false, paraTodas: false },
  { nome: 'Declarado sem movimento', paraFuncionarios: false, paraProLabore: false, paraSemMovimento: true,  paraTodas: false },
  { nome: 'Relatório de Líquidos',   paraFuncionarios: true,  paraProLabore: false, paraSemMovimento: false, paraTodas: false },
];

async function main() {
  console.log('Iniciando seed de tarefas...');
  for (const t of tarefas) {
    const existe = await prisma.tarefaExtra.findFirst({
      where: { nome: t.nome, global: true, ativa: true }
    });
    if (existe) {
      console.log(`Já existe: ${t.nome}`);
      continue;
    }
    await prisma.tarefaExtra.create({
      data: { ...t, global: true, ativa: true, empresaId: null }
    });
    console.log(`Criada: ${t.nome}`);
  }
  console.log('Seed concluído!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
