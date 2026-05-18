import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt } from '../types';
import { formatCurrency } from './utils';
// @ts-ignore
import extenso from 'extenso';

import QRCode from 'qrcode';

export const generateReceiptPDF = async (receipt: Receipt) => {
  try {
    console.log('Iniciando geração de PDF para:', receipt.clientName);
    
    const doc = new jsPDF();
    
    // Fallback para data
    let dateStr = 'Data não disponível';
    try {
      const dateValue = receipt.serviceDate ? new Date(receipt.serviceDate + 'T12:00:00') : (receipt.createdAt ? new Date(receipt.createdAt) : new Date());
      if (!isNaN(dateValue.getTime())) {
        dateStr = format(dateValue, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
    } catch (e) {
      console.warn('Erro ao formatar data', e);
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    const title = receipt.type === 'estimate' ? 'ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS' : 'RECIBO DE PRESTAÇÃO DE SERVIÇOS';
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`O.S. Nº: ${receipt.osNumber || 'N/A'}`, 190, 25, { align: 'right' });
    doc.setFontSize(7);
    doc.text('TODO OS SERVIÇO PRESTADO TEM A GARANTIA DE 90 DIAS DO SERVIÇO PRESTADO', 190, 29, { align: 'right' });
    doc.setTextColor(40);

    // Company Info (Logo or Text)
    let companyInfoY = 40;
    let mainInfoX = 20;

    if (receipt.companyLogo) {
      try {
        // Reduced size for better header fit
        doc.addImage(receipt.companyLogo, 'JPEG', 20, 30, 25, 25, undefined, 'FAST');
        mainInfoX = 50;
      } catch (e) {
        console.warn('Erro ao carregar logo no PDF:', e);
      }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.companyName || 'Empresa não informada', mainInfoX, 35);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const companyLines = doc.splitTextToSize(receipt.companyDetails || '', 140);
    doc.text(companyLines, mainInfoX, 40);

    // Client Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(receipt.clientName || 'Cliente não informado', 45, 65);
    doc.text(`Data: ${dateStr}`, 150, 65);

    // Services Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const serviceSectionTitle = receipt.type === 'estimate' ? 'DESCRIÇÃO DOS SERVIÇOS PREVISTOS' : 'DESCRIÇÃO DOS SERVIÇOS E FOTOS';
    doc.text(serviceSectionTitle, 20, 72);
    
    let currentY = 80;
    const descWidth = 120;
    const photoSize = 35;
    const photoX = 150;

    if (receipt.services && receipt.services.length > 0) {
      receipt.services.forEach((service) => {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(`• ${service.description}`, descWidth);
        const textHeight = lines.length * 5;
        
        doc.text(lines, 20, currentY);
        
        let contentHeight = textHeight;

        const renderPhoto = (path: string, xOffset: number, label: string) => {
          try {
            doc.setFontSize(7);
            doc.text(label, xOffset, currentY + photoSize - 2);
            doc.addImage(path, 'JPEG', xOffset, currentY - 4, photoSize, photoSize - 5, undefined, 'FAST');
            return true;
          } catch (e) {
            console.warn(`Erro ao carregar foto ${label} no PDF:`, e);
            return false;
          }
        };

        let hasPhotos = false;
        if (service.photoBefore) {
          renderPhoto(service.photoBefore, 130, 'ANTES');
          hasPhotos = true;
        }
        if (service.photoAfter) {
          renderPhoto(service.photoAfter, 168, 'APÓS');
          hasPhotos = true;
        }

        // Backward compatibility
        if (!service.photoBefore && !service.photoAfter && (service as any).photo) {
          renderPhoto((service as any).photo, photoX, 'FOTO');
          hasPhotos = true;
        }

        if (hasPhotos) {
          contentHeight = Math.max(textHeight, photoSize - 4);
        }
        
        currentY += contentHeight + 8;
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('• Manutenção em geral', 20, currentY);
      currentY += 10;
    }

    // Table of Items (Services, Parts and Expenses)
    const tableData = [];
    
    // 1. Individual Services
    if (receipt.services && Array.isArray(receipt.services)) {
      receipt.services.forEach(service => {
        if (service.description) {
          tableData.push([service.description, 'Serviço', formatCurrency(service.value || 0)]);
        }
      });
    }

    // 2. General Labor (if any)
    const labor = receipt.laborCost || 0;
    if (labor > 0) {
      tableData.push(['Mão de Obra Geral', 'Serviço', formatCurrency(labor)]);
    }

    // 3. Parts (com proteção)
    if (receipt.parts && Array.isArray(receipt.parts)) {
      receipt.parts.forEach(part => {
        if (part && part.name) {
          tableData.push([part.name, 'Peça', formatCurrency(part.price || 0)]);
        }
      });
    }

    // 4. Expenses (com proteção total contra campos nulos ou inexistentes)
    const exp = receipt.expenses || { gasoline: 0, toll: 0, other: 0 };
    if (exp.gasoline > 0) tableData.push(['Despesa: Combustível', 'Despesa', formatCurrency(exp.gasoline)]);
    if (exp.toll > 0) tableData.push(['Despesa: Pedágio', 'Despesa', formatCurrency(exp.toll)]);
    if (exp.other > 0) tableData.push(['Despesa: Logística/Outros', 'Despesa', formatCurrency(exp.other)]);

    autoTable(doc, {
      startY: currentY,
      head: [['Descrição', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40, halign: 'right' },
      },
    });

    // Total
    const finalY = (doc as any).lastAutoTable?.finalY || (currentY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const total = receipt.total || 0;
    doc.text(`TOTAL: ${formatCurrency(total)}`, 190, finalY + 10, { align: 'right' });

    // Valor por extenso
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    try {
      const valorExtenso = extenso(total, { mode: 'currency', currency: { type: 'BRL' } });
      const extensoLines = doc.splitTextToSize(`( ${valorExtenso} )`, 170);
      doc.text(extensoLines, 190, finalY + 18, { align: 'right' });
    } catch (e) {
      console.warn('Erro ao gerar extenso:', e);
    }

    // QR Code PIX
    if (receipt.pixKey) {
      try {
        // Função auxiliar para CRC16 necessária para o PIX (Padrão CCITT-FALSE)
        const getCRCValue = (data: string): string => {
          let crc = 0xFFFF;
          const polynomial = 0x1021;
          for (let i = 0; i < data.length; i++) {
            crc ^= (data.charCodeAt(i) << 8);
            for (let j = 0; j < 8; j++) {
              if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ polynomial) & 0xFFFF;
              } else {
                crc = (crc << 1) & 0xFFFF;
              }
            }
          }
          return crc.toString(16).toUpperCase().padStart(4, '0');
        };

        const formatTag = (tag: string, value: string) => {
          const len = value.length.toString().padStart(2, '0');
          return `${tag}${len}${value}`;
        };
        
        let pixKeyUsed = receipt.pixKey.trim();
        const digitsOnly = pixKeyUsed.replace(/\D/g, '');
        
        // Lógica de limpeza e formatação da chave
        if (!pixKeyUsed.includes('@') && !pixKeyUsed.includes('-')) {
          if (digitsOnly.length === 11) {
            // Pode ser CPF ou Celular
            const dddsValidos = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '72', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
            const ddd = digitsOnly.substring(0, 2);
            const isPhoneFormat = pixKeyUsed.includes('(') || pixKeyUsed.includes(')') || pixKeyUsed.startsWith('+');
            const looksLikePhone = dddsValidos.includes(ddd) && digitsOnly[2] === '9';
            
            if (isPhoneFormat || (looksLikePhone && !pixKeyUsed.includes('.'))) {
              pixKeyUsed = '+55' + digitsOnly;
            } else {
              pixKeyUsed = digitsOnly; // Provável CPF
            }
          } else if (digitsOnly.length === 14) {
            pixKeyUsed = digitsOnly; // CNPJ
          }
        } else if (pixKeyUsed.length === 36 && pixKeyUsed.includes('-')) {
          pixKeyUsed = pixKeyUsed.replace(/\s/g, '');
        }

        const name = (receipt.companyName || 'PRESTADOR').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 25);
        const city = 'SAO PAULO';
        const amountStr = total.toFixed(2);
        
        const accountInfo = formatTag('00', 'br.gov.bcb.pix') + formatTag('01', pixKeyUsed);
        
        let payload = 
          formatTag('00', '01') +
          formatTag('26', accountInfo) +
          formatTag('52', '0000') +
          formatTag('53', '986') +
          formatTag('54', amountStr) +
          formatTag('58', 'BR') +
          formatTag('59', name) +
          formatTag('60', city) +
          formatTag('62', formatTag('05', '***')) +
          '6304';
        
        payload += getCRCValue(payload);

        const qrCodeUrl = await QRCode.toDataURL(payload, { 
          margin: 1, 
          width: 400,
          errorCorrectionLevel: 'M'
        });
        
        doc.addImage(qrCodeUrl, 'PNG', 160, finalY + 22, 35, 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('PAGAR COM PIX', 177.5, finalY + 60, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(receipt.pixKey, 177.5, finalY + 63, { align: 'center' });
      } catch (e) {
        console.warn('Erro ao gerar QR Code PIX:', e);
      }
    }

    // Logistics Section (Mileage and Dashboard Photo)
    let logisticsY = finalY + 65;
    if (receipt.mileageInitial || receipt.mileageFinal || receipt.dashboardPhoto) {
      // Check for page break
      if (logisticsY > 250) {
        doc.addPage();
        logisticsY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('REGISTRO DE QUILOMETRAGEM E VEÍCULO', 20, logisticsY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let mileageText = '';
      if (receipt.mileageInitial) mileageText += `KM Inicial: ${receipt.mileageInitial} `;
      if (receipt.mileageFinal) mileageText += `| KM Final: ${receipt.mileageFinal} `;
      if (receipt.mileageInitial && receipt.mileageFinal) {
        mileageText += `| Total Percorrido: ${receipt.mileageFinal - receipt.mileageInitial} KM`;
      }
      
      doc.text(mileageText, 20, logisticsY + 6);

      if (receipt.dashboardPhoto) {
        try {
          doc.addImage(receipt.dashboardPhoto, 'JPEG', 20, logisticsY + 10, 40, 30, undefined, 'FAST');
          logisticsY += 45;
        } catch (e) {
          console.warn('Erro ao adicionar foto do painel no PDF:', e);
          logisticsY += 15;
        }
      } else {
        logisticsY += 15;
      }
    } else {
      logisticsY = finalY + 70;
    }

    // Signature field
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.line(60, logisticsY + 10, 150, logisticsY + 10);
    doc.text('Assinatura do Prestador', 105, logisticsY + 15, { align: 'center' });

    const clientFileName = (receipt.clientName || 'recibo').replace(/\s+/g, '-');
    const fileName = `recibo-${clientFileName}-${format(new Date(), 'yyyyMMdd')}.pdf`;
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    console.log('PDF concluído e disparado para o navegador.');
  } catch (error) {
    console.error('Erro crítico na geração do PDF:', error);
    alert('Erro ao criar o arquivo PDF. Verifique se preencheu todos os nomes corretamente.');
  }
};
