const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  const senhaHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@dpsmart.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@dpsmart.com',
      senha: senhaHash,
      nivel: 'ADMIN',
    },
  });

  const gestor = await prisma.usuario.upsert({
    where: { email: 'gestor@dpsmart.com' },
    update: {},
    create: {
      nome: 'Ana Martins',
      email: 'gestor@dpsmart.com',
      senha: await bcrypt.hash('Gestor@123', 10),
      nivel: 'GESTOR',
    },
  });

  const operador = await prisma.usuario.upsert({
    where: { email: 'operador@dpsmart.com' },
    update: {},
    create: {
      nome: 'Carlos Souza',
      email: 'operador@dpsmart.com',
      senha: await bcrypt.hash('Operador@123', 10),
      nivel: 'OPERADOR',
    },
  });

  const empresa1 = await prisma.empresa.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      razaoSocial: 'Comércio Alves Ltda',
      cnpj: '12345678000190',
      enquadramento: 'SIMPLES_NACIONAL',
      tipo: 'COMERCIO',
      nivel: 'N1',
      prazoEntrega: 25,
      temFuncionarios: true,
      fatorR: true,
      enviaReinf: true,
      observacoes: 'Cliente envia ponto atrasado. Possui comissão variável mensal.',
      responsavelId: gestor.id,
    },
  });

  await prisma.controleSindical.upsert({
    where: { empresaId: empresa1.id },
    update: {},
    create: {
      empresaId: empresa1.id,
      sindicato: 'Sindicato dos Comerciários MG',
      dataBase: '01/03',
      ultimaCct: 2025,
      reajusteAplicado: false,
    },
  });

  await prisma.empresa.upsert({
    where: { cnpj: '98765432000111' },
    update: {},
    create: {
      razaoSocial: 'TechServ Prestações ME',
      cnpj: '98765432000111',
      enquadramento: 'LUCRO_PRESUMIDO',
      tipo: 'SERVICOS',
      nivel: 'N2',
      prazoEntrega: 20,
      temProLabore: true,
      responsavelId: operador.id,
    },
  });

  await prisma.empresa.upsert({
    where: { cnpj: '11222333000144' },
    update: {},
    create: {
      razaoSocial: 'Escritório Silva Advocacia',
      cnpj: '11222333000144',
      enquadramento: 'SIMPLES_NACIONAL',
      tipo: 'ADVOCACIA',
      nivel: 'N5',
      semMovimento: true,
      responsavelId: gestor.id,
    },
  });

  console.log('Seed concluído!');
  console.log('Admin:    admin@dpsmart.com    / Admin@123');
  console.log('Gestor:   gestor@dpsmart.com   / Gestor@123');
  console.log('Operador: operador@dpsmart.com / Operador@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
