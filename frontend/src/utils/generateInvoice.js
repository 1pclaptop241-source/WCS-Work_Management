import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (payment, user) => {
    const doc = new jsPDF();

    // Color constants
    const PRIMARY_COLOR = [46, 134, 171]; // #2E86AB
    const TEXT_COLOR = [60, 60, 60];

    // --- Header ---
    // Logo placeholder text (or actual image if we had one)
    doc.setFontSize(24);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text("WiseCut Studios", 20, 20);

    // Invoice Label
    doc.setFontSize(30);
    doc.setTextColor(200, 200, 200);
    doc.text("INVOICE", 140, 20);

    // Divider
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(1);
    doc.line(20, 30, 190, 30);

    // --- Company Info ---
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.text("WiseCut Studios", 20, 40);
    doc.text("123 Creative Avenue", 20, 45); // Placeholder address
    doc.text("Mumbai, India 400001", 20, 50);
    doc.text("contact@wisecutstudios.com", 20, 55);

    // --- Bill To ---
    doc.setFont('helvetica', 'bold');
    doc.text("Bill To:", 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(user.name, 20, 75);
    doc.text(user.email, 20, 80);

    // --- Invoice Details ---
    doc.setFont('helvetica', 'bold');
    doc.text("Invoice #:", 140, 40);
    doc.text("Date:", 140, 45);
    doc.text("Status:", 140, 50);

    doc.setFont('helvetica', 'normal');
    const invoiceNum = `INV-${payment._id.substring(payment._id.length - 6).toUpperCase()}`;
    doc.text(invoiceNum, 170, 40);
    doc.text(new Date(payment.paidAt || Date.now()).toLocaleDateString(), 170, 45);
    doc.setTextColor(0, 128, 0); // Green
    doc.text("PAID", 170, 50);

    // Reset text color
    doc.setTextColor(...TEXT_COLOR);

    // --- Project Details ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Project: ${payment.project?.title}`, 20, 100);

    // --- Table ---
    const currency = payment.project?.currency || 'INR';
    const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : '€');
    const amount = payment.finalAmount || payment.originalAmount || 0;

    autoTable(doc, {
        startY: 110,
        head: [['Description', 'Amount']],
        body: [
            ['Video Editing Services', `${symbol}${amount.toLocaleString()}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 40, halign: 'right' },
        },
    });

    // --- Totals ---
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text("Subtotal:", 140, finalY);
    doc.text(`${symbol}${amount.toLocaleString()}`, 190, finalY, { align: 'right' });

    doc.text("Tax (0%):", 140, finalY + 5);
    doc.text(`${symbol}0.00`, 190, finalY + 5, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Total:", 140, finalY + 15);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`${symbol}${amount.toLocaleString()}`, 190, finalY + 15, { align: 'right' });

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, 280, { align: 'center' });

    // Save
    doc.save(`Invoice_${invoiceNum}.pdf`);
};
