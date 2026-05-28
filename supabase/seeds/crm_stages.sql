insert into crm_stages (id, label, position, description) values
  ('new', 'Novo', 10, 'Lead recebido pelo n8n ou cadastrado manualmente.'),
  ('no_response', 'Nao respondeu', 20, 'Lead sem resposta apos a primeira tentativa.'),
  ('follow_up_1', 'Follow-up 1', 30, 'Primeiro lembrete manual de retomada.'),
  ('follow_up_2', 'Follow-up 2', 40, 'Segundo lembrete manual de retomada.'),
  ('customer', 'Cliente', 50, 'Lead convertido em cliente com cadastro vinculado.'),
  ('return_7_days', 'Retorno 7 dias', 60, 'Tarefa de relacionamento apos procedimento realizado.'),
  ('inactive_30_days', 'Cliente 30 dias sem vir', 70, 'Cliente sem novo agendamento apos 30 dias.'),
  ('birthday_month', 'Aniversariantes do mes', 80, 'Relacionamento com clientes aniversariantes.')
on conflict (id) do update set
  label = excluded.label,
  position = excluded.position,
  description = excluded.description;
