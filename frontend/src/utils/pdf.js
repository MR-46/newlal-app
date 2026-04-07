import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generateOrderPDF(order) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header background
  doc.setFillColor(192, 57, 43);
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo placeholder text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NEW LAL', margin, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AUTO PARTS — Two-Wheeler Spares & Accessories', margin, 20);
  doc.setFontSize(8);
  doc.text('For orders & enquiries: contact us on WhatsApp', margin, 27);

  // Order meta
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order ID: ${order.orderId}`, margin, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`, margin, 48);
  doc.text(`Customer: ${order.customerName || '—'}`, margin, 54);
  if (order.customerMobile) doc.text(`Mobile: ${order.customerMobile}`, margin, 60);
  doc.text(`Salesperson: ${order.createdByName || '—'}`, pageW/2, 42);
  doc.text(`Status: ${order.status?.toUpperCase()}`, pageW/2, 48);
  if (order.isUrgent) {
    doc.setTextColor(192, 57, 43);
    doc.setFont('helvetica', 'bold');
    doc.text('⚡ URGENT ORDER', pageW/2, 54);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
  }
  if (order.remarks) doc.text(`Note: ${order.remarks}`, margin, 68);

  // Divider
  const tableStartY = order.remarks ? 74 : 68;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, tableStartY - 2, pageW - margin, tableStartY - 2);

  // Items table
  doc.autoTable({
    startY: tableStartY,
    head: [['#', 'Item Name', 'Vehicle', 'Brand', 'Part No.', 'Qty', 'Unit']],
    body: order.items.map((item, i) => [
      i + 1,
      item.itemName,
      item.vehicle || '—',
      item.brand || '—',
      item.partNumber || '—',
      item.orderedQty,
      item.unit || 'NOS',
    ]),
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 30, 30] },
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 28 },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 14 },
    },
    margin: { left: margin, right: margin },
  });

  // Summary
  const finalY = doc.lastAutoTable.finalY + 6;
  const totalQty = order.items.reduce((s, i) => s + i.orderedQty, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total Items: ${order.items.length}   |   Total Qty: ${totalQty}`, margin, finalY);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(192, 57, 43);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('New Lal Auto Parts | Thank you for your order!', margin, footerY);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageW - margin, footerY, { align: 'right' });

  return doc;
}

export function downloadOrderPDF(order) {
  const doc = generateOrderPDF(order);
  doc.save(`Order_${order.orderId}.pdf`);
}

export function shareOnWhatsApp(order, docInstance) {
  const doc = docInstance || generateOrderPDF(order);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  const totalQty = order.items?.reduce((s, i) => s + i.orderedQty, 0) || 0;
  const text = encodeURIComponent(
    `*NEW LAL AUTO PARTS*\n` +
    `Order: ${order.orderId}\n` +
    `Customer: ${order.customerName}\n` +
    `Items: ${order.items?.length} | Qty: ${totalQty}\n` +
    `Status: ${order.status?.toUpperCase()}\n` +
    (order.remarks ? `Note: ${order.remarks}\n` : '') +
    `\nPlease find order PDF attached.`
  );

  const mobile = order.customerMobile?.replace(/\D/g, '');
  const whatsappUrl = mobile
    ? `https://wa.me/91${mobile}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(whatsappUrl, '_blank');
  // Also trigger PDF download so user can attach
  doc.save(`Order_${order.orderId}.pdf`);
}
