import React, { useState, useEffect } from 'react';
// import { Phone } from 'lucide-react'; <-- REMOVIDO: Ícone de telefone para o botão do WhatsApp não é mais necessário

const Lead = ({ lead, onUpdateStatus, disabledConfirm }) => {
  const [status, setStatus] = useState(lead.status || '');
  // `isStatusConfirmed` para controlar o bloqueio da seleção e exibição do botão "Alterar"
  const [isStatusConfirmed, setIsStatusConfirmed] = useState(
    lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status === 'Fechado' || lead.status === 'Perdido' || lead.status.startsWith('Agendado')
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Define a cor do card conforme o status
  const cardColor = (() => {
    switch (true) {
      case status.startsWith('Fechado'):
        return '#d4edda'; // verde claro
      case status.startsWith('Perdido'):
        return '#f8d7da'; // vermelho claro
      case status.startsWith('Em Contato'):
        return '#fff3cd'; // laranja claro
      case status.startsWith('Sem Contato'):
        return '#e2e3e5'; // cinza claro
      case status.startsWith('Agendado'):
        return '#cce5ff'; // azul claro
      case status === 'Selecione o status' || status === '':
      default:
        return '#ffffff'; // branco
    }
  })();

  // Sincroniza o estado `isStatusConfirmed` quando o `lead.status` muda (ex: após um refresh de leads)
  useEffect(() => {
    setIsStatusConfirmed(
      lead.status === 'Em Contato' || lead.status === 'Sem Contato' || lead.status === 'Fechado' || lead.status === 'Perdido' || lead.status.startsWith('Agendado')
    );
    setStatus(lead.status || ''); // Garante que o status exibido esteja sempre atualizado com o lead
  }, [lead.status]);

  const handleConfirm = () => {
    if (!status || status === 'Selecione o status') {
      alert('Selecione um status antes de confirmar!');
      return;
    }

    enviarLeadAtualizado(lead.id, status, lead.phone);

    // Após a confirmação, bloqueia a caixa de seleção e define o status como confirmado
    setIsStatusConfirmed(true);

    if (onUpdateStatus) {
      onUpdateStatus(lead.id, status, lead.phone); // chama o callback pra informar a atualização
    }
  };

  const handleScheduleConfirm = () => {
    if (!scheduledDate) {
      alert('Selecione uma data para o agendamento!');
      return;
    }

    // Cria um objeto de data a partir da string e ajusta para o fuso horário local
    const selectedDate = new Date(scheduledDate + 'T00:00:00'); // Adiciona T00:00:00 para garantir que a data seja interpretada como local
    
    // Formata a data para a string de status
    const formattedDate = selectedDate.toLocaleDateString('pt-BR');
    const newStatus = `Agendado - ${formattedDate}`;

    enviarLeadAtualizado(lead.id, newStatus, lead.phone);
    setStatus(newStatus);
    setIsStatusConfirmed(true);
    setShowCalendar(false);

    if (onUpdateStatus) {
      onUpdateStatus(lead.id, newStatus, lead.phone);
    }
  };

  const handleAlterar = () => {
    // Permite a edição do status novamente e esconde o calendário
    setIsStatusConfirmed(false);
    setShowCalendar(false);
  };

  const enviarLeadAtualizado = async (leadId, status, phone) => {
    try {
      await fetch('https://script.google.com/macros/s/AKfycbyGelso1gXJEKWBCDScAyVBGPp9ncWsuUjN8XS-Cd7R8xIH7p6PWEZo2eH-WZcs99yNaA/exec?v=alterar_status', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          lead: leadId,
          status: status,
          phone: phone
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao enviar lead:', error);
    }
  };
  
  // Função auxiliar para formatar datas (YYYY-MM-DD para DD/MM/YYYY)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Assume YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
        return `${day}/${month}/${year}`;
    }
    return dateStr;
  };
  
  // Função auxiliar para formatar moeda
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return 'R$ 0,00';
    if (typeof value === 'string') {
        value = parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.'));
    }
    if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // 🌟 NOVO: Função auxiliar para formatar porcentagem
  const formatPercentage = (valor) => {
      if (valor === undefined || valor === null || valor === '') return 'N/A';
      
      let numericValue;
      if (typeof valor === 'string') {
          // Remove '%' se existir e substitui vírgula por ponto para parse
          numericValue = parseFloat(valor.replace('%', '').replace(',', '.').trim());
      } else {
          numericValue = parseFloat(valor);
      }

      // Se o valor for um número entre 0 e 1 (formato decimal, ex: 0.25), multiplique por 100
      if (numericValue > 0 && numericValue < 1) {
          numericValue *= 100;
      } 
      
      if (isNaN(numericValue)) return 'N/A';
      
      // Formata o número resultante para a localização pt-BR
      return numericValue.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      }) + '%';
  };


  return (
    <div
      style={{
        border: '1px solid #ddd',
        padding: '15px',
        marginBottom: '15px',
        borderRadius: '5px',
        backgroundColor: cardColor,
        position: 'relative'
      }}
    >
      {/* CAMPOS ATUALIZADOS AQUI */}
      <p><strong>Nome:</strong> {lead.name}</p>
      <p><strong>Modelo do veículo:</strong> {lead.vehicleModel}</p>
      <p><strong>Ano/Modelo:</strong> {lead.vehicleYearModel}</p>
      <p><strong>Telefone:</strong> {lead.phone}</p>
      <p><strong>Seguradora:</strong> {lead.Seguradora || 'N/A'}</p>
      <p><strong>Prêmio Líquido:</strong> {formatCurrency(lead.PremioLiquido)}</p>
      {/* 🌟 Aplicação da nova função formatPercentage */}
      <p><strong>Comissão:</strong> {formatPercentage(lead.Comissao)}</p> 
      <p><strong>Parcelamento:</strong> {lead.Parcelamento || 'N/A'}</p>
      <p><strong>Vigência Final:</strong> {formatDateDisplay(lead.VigenciaFinal) || 'N/A'}</p>
      {/* FIM DOS CAMPOS ATUALIZADOS */}
      
      <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <select
          value={status}
          onChange={(e) => {
            const newStatus = e.target.value;
            setStatus(newStatus);
            if (newStatus === 'Agendar') {
              setShowCalendar(true);
            } else {
              setShowCalendar(false);
            }
          }}
          // O select é desabilitado se o status já foi confirmado
          disabled={isStatusConfirmed}
          style={{
            marginRight: '10px',
            padding: '8px',
            border: '2px solid #ccc',
            borderRadius: '4px',
            minWidth: '160px',
            // Estilo para indicar que está desabilitado
            backgroundColor: isStatusConfirmed ? '#e9ecef' : '#fff',
            cursor: isStatusConfirmed ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">Selecione o status</option>
          <option value="Agendar">Agendar</option>
          <option value="Em Contato">Em Contato</option>
          <option value="Fechado">Fechado</option>
          <option value="Perdido">Perdido</option>
          <option value="Sem Contato">Sem Contato</option>
        </select>

        {/* Lógica condicional para exibir Confirmar ou Alterar */}
        {!isStatusConfirmed ? (
          <>
            {showCalendar ? (
              <>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '2px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <button
                  onClick={handleScheduleConfirm}
                  disabled={!scheduledDate}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: !scheduledDate ? '#aaa' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !scheduledDate ? 'not-allowed' : 'pointer'
                  }}
                >
                  Confirmar Agendamento
                </button>
              </>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={disabledConfirm || !status || status === '' || status === 'Selecione o status'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (disabledConfirm || !status || status === '' || status === 'Selecione o status') ? '#aaa' : '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (disabledConfirm || !status || status === '' || status === 'Selecione o status') ? 'not-allowed' : 'pointer'
                }}
              >
                Confirmar
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleAlterar}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107', // Cor amarela
              color: '#212529', // Texto escuro para contraste
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Alterar
          </button>
        )}
      </div>
    </div>
  );
};

export default Lead;
