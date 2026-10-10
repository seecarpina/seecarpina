import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosDashboardPermitidos, resumirAtendimento, diasDesdePedido } from '../secretaria/src/js/core/resumoDashboard.js';

test('dashboard consulta somente módulos explicitamente permitidos', () => {
  assert.deepEqual(modulosDashboardPermitidos(null), []);
  assert.deepEqual(modulosDashboardPermitidos({modulos: {insumos: true, manutencao: false}}), ['INSUMOS']);
  assert.equal(modulosDashboardPermitidos({todas: true}).length, 4);
});

test('resumo separa confirmação e encerrados da fila da secretaria', () => {
  const registros = [
    {id: 'antigo', status: 'RECEBIDA', criadoEm: 100},
    {id: 'urgente', status: 'EM_ATENDIMENTO', prioridade: 'URGENTE', criadoEm: 300},
    {id: 'legado', status: 'APROVADA', criadoEm: 200},
    {status: 'AGUARDANDO_CONFIRMACAO', prioridade: 'URGENTE'},
    {status: 'INDEFERIDA', prioridade: 'URGENTE'},
    {status: 'CANCELADA'}, {status: 'CONCLUIDA'}, {status: 'ATENDIDA_PARCIALMENTE'},
  ];
  const resumo = resumirAtendimento(registros);
  assert.equal(resumo.recebidas, 1);
  assert.equal(resumo.atendimento, 2);
  assert.equal(resumo.confirmacao, 1);
  assert.equal(resumo.urgentes, 1);
  assert.equal(resumo.totalAberto, 3);
  assert.deepEqual(resumo.atencao.map(p => p.id), ['urgente', 'antigo', 'legado']);
});

test('lista limita seis pedidos e idade trata datas futuras e ausentes', () => {
  assert.equal(resumirAtendimento(Array.from({length: 10}, () => ({status: 'RECEBIDA'}))).atencao.length, 6);
  assert.equal(diasDesdePedido(1000, 172801000), 2);
  assert.equal(diasDesdePedido(3000, 1000), 0);
  assert.equal(diasDesdePedido(undefined), null);
  assert.equal(resumirAtendimento([]).totalAberto, 0);
});
